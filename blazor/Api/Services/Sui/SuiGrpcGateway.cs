using Common.Events;
using Common.Player;
using Google.Protobuf;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Grpc.Net.Client;
using Sui.Rpc.V2;
using System.Collections.Concurrent;
using System.Text.Json;
using static Api.Services.Sui.ApiDtos;

namespace Api.Services.Sui
{
    public class SuiGrpcGateway(RecentDepositStore recentDepositStore)
    {
        private readonly ConcurrentDictionary<string, GrpcChannel> _channels = new();
        private readonly RecentDepositStore _recentDepositStore = recentDepositStore;

        private static string GetGraphQLUrl(string network) => network switch
        {
            //"localnet" => "http://127.0.0.1:9125/graphql",
            //"testnet" => "https://sui-testnet.mystenlabs.com/graphql",
            //"devnet" => "https://sui-devnet.mystenlabs.com/graphql",
            //"mainnet" => "https://sui-mainnet.mystenlabs.com/graphql",
            //_ => "https://sui-testnet.mystenlabs.com/graphql",

            "localnet" => "http://127.0.0.1:9125/graphql",
            "testnet" => "https://graphql.testnet.sui.io/graphql",
            "devnet" => "https://graphql.devnet.sui.io/graphql",
            "mainnet" => "https://graphql.mainnet.sui.io/graphql",
            _ => "https://graphql.testnet.sui.io/graphql",
        };

        private static string GetFullNodeUrl(string network) => network switch
        {
            "localnet" => "http://127.0.0.1:9000",
            "testnet" => "https://fullnode.testnet.sui.io:443",
            "devnet" => "https://fullnode.devnet.sui.io:443",
            "mainnet" => "https://fullnode.mainnet.sui.io:443",
            _ => "https://fullnode.testnet.sui.io:443",
        };

        private GrpcChannel Channel(string network) =>
            _channels.GetOrAdd(network, n => GrpcChannel.ForAddress(GetGraphQLUrl(n)));

        private static readonly HttpClient _http = new();

        static ByteString HexToByteString(string hex)
        {
            if (hex.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
                hex = hex[2..];

            return ByteString.CopyFrom(Convert.FromHexString(hex));
        }

        private static readonly JsonSerializerOptions s_prettyOptions = new()
        {
            WriteIndented = true
        };

        static string ToPrettyValue(JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.String)
                return el.GetString() ?? "";

            if (el.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False or JsonValueKind.Null)
                return el.GetRawText();

            // Special Move wrapper handling
            if (el.ValueKind == JsonValueKind.Object &&
                el.TryGetProperty("type", out var t) &&
                el.TryGetProperty("fields", out var f))
            {
                var typeStr = t.ValueKind == JsonValueKind.String ? t.GetString() : t.GetRawText();
                var fieldsPretty = ToPrettyValue(f);
                return $"type: {typeStr}\nfields:\n{Indent(fieldsPretty, 2)}";
            }

            // Default: pretty print (reuses cached options)
            using var doc = JsonDocument.Parse(el.GetRawText());
            return JsonSerializer.Serialize(doc.RootElement, s_prettyOptions);
        }

        static string Indent(string s, int spaces)
        {
            var pad = new string(' ', spaces);
            return pad + s.Replace("\n", "\n" + pad);
        }

        public async Task<ExecuteTransactionResponse> ExecuteSignedTransactionAsync(
            string network,
            byte[] txBytes,
            IReadOnlyList<byte[]> signatures)
        {
            using var channel = GrpcChannel.ForAddress(GetFullNodeUrl(network));
            var client = new TransactionExecutionService.TransactionExecutionServiceClient(channel);

            var req = new ExecuteTransactionRequest
            {
                Transaction = new Transaction
                {
                    Bcs = new Bcs { Value = ByteString.CopyFrom(txBytes) }
                }
            };

            foreach (var sig in signatures)
            {
                req.Signatures.Add(new UserSignature
                {
                    Bcs = new Bcs { Value = ByteString.CopyFrom(sig) }
                });
            }

            try
            {
                return await client.ExecuteTransactionAsync(req);
            }
            catch (RpcException ex)
            {
                throw new Exception(
                    $"ExecuteTransactionAsync failed: StatusCode={ex.StatusCode}, Detail={ex.Status.Detail}",
                    ex
                );
            }
            catch (Exception ex)
            {
                var message = $"Error executing transaction: {ex}";
                Console.WriteLine(message);
                throw new InvalidOperationException(message, ex);
            }
        }

        static bool TryFindMoveFields(JsonElement el, out JsonElement fieldsObj)
        {
            // We want an object called "fields" whose value is a JSON object (map),
            // and (optionally) lives near a "type" property (common Move wrapper).
            if (el.ValueKind == JsonValueKind.Object)
            {
                // Direct check: { type: "...", fields: { ... } }
                if (el.TryGetProperty("fields", out var f) && f.ValueKind == JsonValueKind.Object)
                {
                    // Heuristic: it's more likely Move fields if it has sibling "type"
                    // or if the map contains an "id" member shaped like { id: "0x.." }
                    if (el.TryGetProperty("type", out _) || LooksLikeMoveFieldsMap(f))
                    {
                        fieldsObj = f;
                        return true;
                    }
                }

                // Otherwise DFS through children
                foreach (var p in el.EnumerateObject())
                {
                    if (TryFindMoveFields(p.Value, out fieldsObj))
                        return true;
                }
            }
            else if (el.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in el.EnumerateArray())
                {
                    if (TryFindMoveFields(item, out fieldsObj))
                        return true;
                }
            }

            fieldsObj = default;
            return false;
        }

        static bool LooksLikeMoveFieldsMap(JsonElement fields)
        {
            // Very light heuristic:
            // - has "id" key whose value is { "id": "0x..." }
            // - or has a handful of keys (typical struct)
            if (fields.TryGetProperty("id", out var idEl) &&
                idEl.ValueKind == JsonValueKind.Object &&
                idEl.TryGetProperty("id", out var inner) &&
                inner.ValueKind == JsonValueKind.String &&
                inner.GetString()?.StartsWith("0x") == true)
                return true;

            int count = 0;
            foreach (var _ in fields.EnumerateObject())
            {
                if (++count >= 2) return true;
            }
            return false;
        }

        private static string NormalizeObjectId(string s)
        {
            s = (s ?? "").Trim();

            if (s.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
                s = s[2..];

            // Must be 64 hex chars (32 bytes)
            if (s.Length != 64)
                throw new ArgumentException($"ObjectId must be 32 bytes (64 hex chars). Got length {s.Length}.");

            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                bool isHex =
                    (c >= '0' && c <= '9') ||
                    (c >= 'a' && c <= 'f') ||
                    (c >= 'A' && c <= 'F');

                if (!isHex)
                    throw new ArgumentException($"ObjectId contains non-hex char '{c}' at index {i}.");
            }

            return "0x" + s.ToLowerInvariant();
        }

        public Task<GetObjectResponse> GetObjectAsync(string network, string objectId)
        {
            var client = new LedgerService.LedgerServiceClient(Channel(network));

            var normalized = NormalizeObjectId(objectId);

            var req = new GetObjectRequest
            {
                ObjectId = normalized,
                ReadMask = new Google.Protobuf.WellKnownTypes.FieldMask
                {
                    Paths =
                {
                    "object_id",
                    "version",
                    "digest",
                    "owner",
                    "object_type",
                    "previous_transaction",
                    "storage_rebate",
                    "json"
                }
                }
            };

            return client.GetObjectAsync(req).ResponseAsync;
        }

        public Task<GetBalanceResponse> GetBalanceAsync(string owner, string network)
        {
            var client = new StateService.StateServiceClient(Channel(network));
            return client.GetBalanceAsync(new GetBalanceRequest
            {
                Owner = owner,
                CoinType = "0x2::sui::SUI"
            }).ResponseAsync;
        }

        public Task<ListOwnedObjectsResponse> ListOwnedObjectsAsync(string owner, string network, int pageSize, string? pageToken)
        {
            var client = new StateService.StateServiceClient(Channel(network));
            var req = new ListOwnedObjectsRequest
            {
                Owner = owner,
                PageSize = (uint)pageSize,
            };
            if (!string.IsNullOrWhiteSpace(pageToken))
                req.PageToken = HexToByteString(pageToken);

            return client.ListOwnedObjectsAsync(req).ResponseAsync;
        }

        public async Task<CharacterDto> GetCharacterAsync(string objectId, string network, CancellationToken ct = default)
        {
            // Normalize/validate object id early so failures are clear
            var oidNorm = NormalizeObjectId(objectId);

            var client = new LedgerService.LedgerServiceClient(Channel(network));

            var req = new GetObjectRequest
            {
                ObjectId = oidNorm,
                ReadMask = new FieldMask
                {
                    Paths =
            {
                "object_id",
                "version",
                "digest",
                "owner",
                "object_type",
                "previous_transaction",
                "storage_rebate",
                "json"
            }
                }
            };

            var resp = await client.GetObjectAsync(req, cancellationToken: ct);
            var obj = resp.Object ?? throw new InvalidOperationException($"Object not found: {oidNorm}");

            // Basic envelope fields
            var type = obj.ObjectType ?? "";
            var oid = obj.ObjectId ?? oidNorm;

            bool isShared = false;
            string initialSharedVersion = string.Empty;

            // Owner is a protobuf message; easiest is to read it via protobuf-json
            if (obj.Owner is not null)
            {
                var ownerJson = JsonFormatter.Default.Format(obj.Owner);
                using var ownerDoc = JsonDocument.Parse(ownerJson);
                var ownerRoot = ownerDoc.RootElement;

                // Your sample is: { "kind": "SHARED", "version": "2581" }
                if (ownerRoot.TryGetProperty("kind", out var kindEl) &&
                    string.Equals(kindEl.GetString(), "SHARED", StringComparison.OrdinalIgnoreCase))
                {
                    isShared = true;
                    if (ownerRoot.TryGetProperty("version", out var verEl))
                        initialSharedVersion = verEl.GetString() ?? verEl.ToString();
                }
            }

            if (obj.Json is null)
                throw new InvalidOperationException("Object.json is null. Ensure read_mask includes 'json' and the node supports JSON rendering.");

            // google.protobuf.Value -> JSON text -> JsonElement
            var jsonText = JsonFormatter.Default.Format(obj.Json);
            using var doc = JsonDocument.Parse(jsonText);
            var fields = doc.RootElement;

            // Character fields
            string characterAddress = GetString(fields, "character_address");
            long tribeId = GetUInt64(fields, "tribe_id");
            string ownerCapId = GetString(fields, "owner_cap_id");

            // key: { item_id, tenant }
            string tenant = string.Empty;
            string itemId = string.Empty;
            if (fields.TryGetProperty("key", out var keyEl) && keyEl.ValueKind == JsonValueKind.Object)
            {
                tenant = GetString(keyEl, "tenant");
                itemId = GetStringOrRaw(keyEl, "item_id");
            }

            // metadata: { assembly_id, name, description, url }
            string name = string.Empty;
            string description = string.Empty;
            string url = string.Empty;
            if (fields.TryGetProperty("metadata", out var mdEl) && mdEl.ValueKind == JsonValueKind.Object)
            {
                name = GetString(mdEl, "name");
                description = GetString(mdEl, "description");
                url = GetString(mdEl, "url");
            }

            return new CharacterDto(
                ObjectId: oid,
                Type: type,
                IsShared: isShared,
                InitialSharedVersion: initialSharedVersion,
                CharacterAddress: characterAddress,
                TribeId: tribeId,
                Tenant: tenant,
                ItemId: itemId,
                Name: name,
                Description: description,
                Url: url,
                OwnerCapId: ownerCapId
            );
        }

        public Task<PlayerProfilePointsDto> GetPlayerProfilePointsAsync(
            string walletAddress,
            string characterId,
            string characterName,
            long totalPoints)
        {
            var recent = _recentDepositStore.GetRecent(walletAddress);

            var dto = new PlayerProfilePointsDto
            {
                WalletAddress = walletAddress,
                CharacterId = characterId,
                CharacterName = characterName,
                TotalPoints = totalPoints,
                RecentDeposits = recent,
                Stamps = BuildStamps(totalPoints, recent.Count)
            };

            return Task.FromResult(dto);
        }

        private static List<AchievementStampDto> BuildStamps(long ministryPoints, int recentDepositCount)
        {
            return
            [
                new AchievementStampDto
                {
                    Code = "FIRST_DEPOSIT",
                    Title = "First Deposit",
                    Description = "Submitted your first ministry deposit.",
                    Unlocked = recentDepositCount > 0 || ministryPoints > 0
                },
                new AchievementStampDto
                {
                    Code = "POINTS_100",
                    Title = "100 Ministry Points",
                    Description = "Reached 100 ministry points.",
                    Unlocked = ministryPoints >= 100
                },
                new AchievementStampDto
                {
                    Code = "POINTS_500",
                    Title = "500 Ministry Points",
                    Description = "Reached 500 ministry points.",
                    Unlocked = ministryPoints >= 500
                },
                new AchievementStampDto
                {
                    Code = "POINTS_1000",
                    Title = "1,000 Ministry Points",
                    Description = "Reached 1,000 ministry points.",
                    Unlocked = ministryPoints >= 1000
                }
            ];
        }

        // ---- local helpers ----
        static string GetString(JsonElement obj, string name)
            => obj.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String ? (el.GetString() ?? "") : "";

        static string GetStringOrRaw(JsonElement obj, string name)
            => obj.TryGetProperty(name, out var el)
                ? (el.ValueKind == JsonValueKind.String ? (el.GetString() ?? "") : el.GetRawText())
                : "";

        static long GetUInt64(JsonElement obj, string name)
        {
            if (!obj.TryGetProperty(name, out var el)) return 0;
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt64(out var n)) return n;
            if (el.ValueKind == JsonValueKind.String && long.TryParse(el.GetString(), out var s)) return s;
            return 0;
        }
    }
}
