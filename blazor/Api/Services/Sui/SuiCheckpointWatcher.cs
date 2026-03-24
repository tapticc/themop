using Common.Events;
using Google.Protobuf;
using Google.Protobuf.WellKnownTypes;
using Grpc.Net.Client;
using Microsoft.Extensions.Caching.Memory;
using Sui.Rpc.V2;
using System.Text.Json;

namespace Api.Services.Sui
{
    public class SuiCheckpointWatcher(
        ILogger<SuiCheckpointWatcher> logger,
        RecentDepositStore store,
        IMemoryCache cache) : BackgroundService
    {
        private readonly ILogger<SuiCheckpointWatcher> _logger = logger;
        private readonly RecentDepositStore _store = store;
        private readonly IMemoryCache _cache = cache;

        private const string Network = "testnet";

        // On startup, scan this many recent checkpoints.
        private const ulong StartupBackfillCheckpointCount = 50; //small backfill

        // Poll cadence for new checkpoints.
        private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);

        // Highest checkpoint fully processed by this watcher.
        private ulong _lastProcessedCheckpoint;

        private static string GetFullNodeUrl(string network) => network switch
        {
            "localnet" => "http://127.0.0.1:9000",
            "testnet" => "https://fullnode.testnet.sui.io:443",
            "devnet" => "https://fullnode.devnet.sui.io:443",
            "mainnet" => "https://fullnode.mainnet.sui.io:443",
            _ => "https://fullnode.testnet.sui.io:443",
        };

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            //if you need to debug a specific transaction, call this method once
            //await DebugHardcodedTransactionAsync(stoppingToken);
            //return;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var channel = GrpcChannel.ForAddress(GetFullNodeUrl(Network));
                    var ledger = new LedgerService.LedgerServiceClient(channel);

                    await InitialiseBackfillAsync(ledger, stoppingToken);
                    await PollForNewCheckpointsAsync(ledger, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Checkpoint watcher failed; retrying.");
                    await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                }
            }
        }

        private async Task InitialiseBackfillAsync(
            LedgerService.LedgerServiceClient ledger,
            CancellationToken ct)
        {
            var latest = await GetLatestCheckpointSequenceAsync(ledger, ct);
            if (latest == 0 && _lastProcessedCheckpoint == 0)
            {
                //_logger.LogInformation("Latest checkpoint is 0.");
            }

            if (_lastProcessedCheckpoint != 0)
            {
                //_logger.LogInformation(
                //    "Checkpoint watcher already initialised at sequence {Seq}.",
                //    _lastProcessedCheckpoint);
                return;
            }

            var start = latest > StartupBackfillCheckpointCount
                ? latest - StartupBackfillCheckpointCount + 1
                : 0UL;

            //_logger.LogInformation(
            //    "Starting checkpoint backfill from {Start} to {End}.",
            //    start, latest);

            await ProcessCheckpointRangeAsync(ledger, start, latest, ct);

            _lastProcessedCheckpoint = latest;

            //_logger.LogInformation(
            //    "Checkpoint backfill complete. Last processed checkpoint = {Seq}.",
            //    _lastProcessedCheckpoint);
        }

        private async Task PollForNewCheckpointsAsync(
            LedgerService.LedgerServiceClient ledger,
            CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                var latest = await GetLatestCheckpointSequenceAsync(ledger, ct);

                if (latest > _lastProcessedCheckpoint)
                {
                    var start = _lastProcessedCheckpoint + 1;
                    var end = latest;

                    //_logger.LogInformation(
                    //    "Processing new checkpoints from {Start} to {End}.",
                    //    start, end);

                    await ProcessCheckpointRangeAsync(ledger, start, end, ct);

                    _lastProcessedCheckpoint = end;

                    //_logger.LogInformation(
                    //    "Checkpoint poll complete. Last processed checkpoint = {Seq}.",
                    //    _lastProcessedCheckpoint);
                }

                await Task.Delay(PollInterval, ct);
            }
        }

        private async Task ProcessCheckpointRangeAsync(
            LedgerService.LedgerServiceClient ledger,
            ulong startInclusive,
            ulong endInclusive,
            CancellationToken ct)
        {
            for (ulong seq = startInclusive; seq <= endInclusive; seq++)
            {
                var checkpoint = await GetCheckpointBySequenceAsync(ledger, seq, ct);
                if (checkpoint is null)
                    continue;

                await ProcessCheckpointAsync(ledger, checkpoint, ct);
            }
        }

        //new JsonSerializerOptions
        //    {
        //    WriteIndented = true
        //    }

        private async Task ProcessCheckpointAsync(
            LedgerService.LedgerServiceClient ledger,
            Checkpoint checkpoint,
            CancellationToken ct)
        {
            foreach (var tx in checkpoint.Transactions)
            {
                var events = tx.Events?.Events;
                if (events is null || events.Count == 0)
                    continue;

                foreach (var evt in events)
                {
                    var eventType = evt.EventType ?? "";

                    if (!eventType.Contains("::smart_storage::PlayerDepositBatchEvent", StringComparison.Ordinal))
                        continue;

                    if (evt.Json is null)
                        continue;

                    var jsonText = JsonFormatter.Default.Format(evt.Json);
                    using var doc = JsonDocument.Parse(jsonText);
                    var root = doc.RootElement;

                    var characterId = GetString(root, "character_id");
                    var characterAddress = GetString(root, "character_address");
                    var characterName = await ResolveCharacterNameAsync(ledger, characterId, ct);

                    var row = new PlayerDepositEventRow
                    {
                        Id = BuildStableId(
                            tx.Digest ?? "",
                            eventType,
                            characterAddress,
                            characterId,
                            GetString(root, "storage_unit_id"),
                            GetStringOrRaw(root, "item_count"),
                            GetStringOrRaw(root, "total_quantity"),
                            GetStringOrRaw(root, "total_points_awarded")),
                        TxDigest = tx.Digest ?? "",
                        EventSeq = "",
                        PackageId = evt.PackageId ?? "",
                        TimestampMs = tx.Timestamp?.ToDateTimeOffset().ToUnixTimeMilliseconds().ToString() ?? "",
                        CharacterAddress = characterAddress,
                        CharacterId = characterId,
                        CharacterName = characterName,
                        StorageUnitId = GetString(root, "storage_unit_id"),
                        ItemCount = GetStringOrRaw(root, "item_count"),
                        TotalQuantity = GetStringOrRaw(root, "total_quantity"),
                        TotalPointsAwarded = GetStringOrRaw(root, "total_points_awarded"),
                        MovedBy = GetString(root, "moved_by"),
                        RawJson = JsonSerializer.Serialize(root, new JsonSerializerOptions { WriteIndented = true })
                    };

                    _store.Add(row);
                }
            }
        }

        private static string BuildStableId(
            string txDigest,
            string eventType,
            string characterAddress,
            string characterId,
            string storageUnitId,
            string itemCount,
            string totalQuantity,
            string totalPointsAwarded)
        {
            return string.Join(":",
                txDigest,
                eventType,
                characterAddress,
                characterId,
                storageUnitId,
                itemCount,
                totalQuantity,
                totalPointsAwarded);
        }

        private static async Task<ulong> GetLatestCheckpointSequenceAsync(
            LedgerService.LedgerServiceClient ledger,
            CancellationToken ct)
        {
            var response = await ledger.GetCheckpointAsync(
                new GetCheckpointRequest(),
                cancellationToken: ct);

            return response.Checkpoint?.SequenceNumber ?? 0;
        }

        private static async Task<Checkpoint?> GetCheckpointBySequenceAsync(
            LedgerService.LedgerServiceClient ledger,
            ulong sequence,
            CancellationToken ct)
        {
            var response = await ledger.GetCheckpointAsync(
                new GetCheckpointRequest
                {
                    SequenceNumber = sequence,
                    ReadMask = new FieldMask
                    {
                        Paths =
                        {
                            "sequence_number",
                            "transactions.digest",
                            "transactions.events"
                        }
                    }
                },
                cancellationToken: ct);

            return response.Checkpoint;
        }

        private async Task<string> ResolveCharacterNameAsync(
            LedgerService.LedgerServiceClient ledger,
            string characterId,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(characterId))
                return string.Empty;

            var cacheKey = $"character-name:{characterId}";
            if (_cache.TryGetValue<string>(cacheKey, out var cached) && !string.IsNullOrWhiteSpace(cached))
                return cached;

            try
            {
                var req = new GetObjectRequest
                {
                    ObjectId = characterId,
                    ReadMask = new FieldMask
                    {
                        Paths = { "json" }
                    }
                };

                var resp = await ledger.GetObjectAsync(req, cancellationToken: ct);
                if (resp.Object?.Json is null)
                    return string.Empty;

                var jsonText = JsonFormatter.Default.Format(resp.Object.Json);
                using var doc = JsonDocument.Parse(jsonText);
                var root = doc.RootElement;

                string name = string.Empty;

                if (root.TryGetProperty("metadata", out var metadata) &&
                    metadata.TryGetProperty("name", out var nameEl))
                {
                    name = nameEl.GetString() ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(name))
                {
                    _cache.Set(cacheKey, name, TimeSpan.FromMinutes(10));
                }

                return name;
            }
            catch
            {
                return string.Empty;
            }
        }

        private static string GetString(JsonElement obj, string name)
            => obj.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String
                ? el.GetString() ?? ""
                : "";

        private static string GetStringOrRaw(JsonElement obj, string name)
            => obj.TryGetProperty(name, out var el)
                ? (el.ValueKind == JsonValueKind.String ? el.GetString() ?? "" : el.GetRawText())
                : "";
    }
}