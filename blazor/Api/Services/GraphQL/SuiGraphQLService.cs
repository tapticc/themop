using Api.Services.Models;
using Api.Services.Sui;
using Common.Inventory;
using Common.Player;
using Common.Roles;
using Common.Storage;
using Common.Sui;
using Google.Protobuf;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Api.Services.GraphQL
{
    public class SuiGraphQLService(
        GraphQLClient graphql,
        IOptions<SuiOptions> options,
        ILogger<SuiGraphQLService> logger,
        CharacterNameIndex characterNameIndex,
        SuiGrpcGateway gw)
    {
        private readonly GraphQLClient _graphql = graphql;
        private readonly SuiOptions _options = options.Value;
        private readonly ILogger<SuiGraphQLService> _logger = logger;
        private readonly Dictionary<string, string> _characterNameCache = [];
        private readonly CharacterNameIndex _characterNameIndex = characterNameIndex;
        private readonly SuiGrpcGateway _gw = gw;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public async Task<string?> GetCharacterPackageIdForWalletAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {
            var result = await _graphql.SendAsync<OwnedObjectsQueryResponse>(
                SuiQueries.GetOwnedObjectsWithType,
                new
                {
                    owner = walletAddress
                },
                cancellationToken);

            var node = result.Address?.Objects?.Nodes?
                .FirstOrDefault(x =>
                    string.Equals(
                        x.Contents?.Type?.Repr,
                        null,
                        StringComparison.OrdinalIgnoreCase) == false &&
                    x.Contents!.Type!.Repr!.EndsWith("::character::PlayerProfile", StringComparison.Ordinal));

            var fullType = node?.Contents?.Type?.Repr;
            var packageId = TryGetPackageIdFromType(fullType);

            return packageId;
        }

        public async Task<CharacterSummary?> GetCharacterSummaryForWalletAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {

            var packageId = await GetCharacterPackageIdForWalletAsync(walletAddress, cancellationToken);

            if (string.IsNullOrWhiteSpace(packageId))
                return null;

            var profileType = $"{packageId}::character::PlayerProfile";

            var profileResult = await _graphql.SendAsync<PlayerProfileQueryResponse>(
                SuiQueries.GetPlayerProfile,
                new
                {
                    owner = walletAddress,
                    type = profileType
                },
                cancellationToken);

            var profileNode = profileResult.Objects?.Nodes?.FirstOrDefault();
            if (profileNode?.AsMoveObject?.Contents?.Json is null)
                return null;

            var profile = Deserialize<PlayerProfileData>(profileNode.AsMoveObject.Contents.Json.Value);
            if (profile is null || string.IsNullOrWhiteSpace(profile.PlayerProfileId))
                return null;

            var characterResult = await _graphql.SendAsync<CharacterQueryResponse>(
                SuiQueries.GetCharacter,
                new { id = profile.CharacterId }, //Id is the player profile id and not the character id
                cancellationToken);

            var characterNode = characterResult.Object;
            if (characterNode?.AsMoveObject?.Contents?.Json is null)
                return null;

            var character = Deserialize<CharacterData>(characterNode.AsMoveObject.Contents.Json.Value);
            if (character is null)
                return null;

            return new CharacterSummary
            {
                PlayerProfileId = profile.PlayerProfileId,
                CharacterId = character.CharacterId,
                CharacterName = character.Metadata?.Name,
                OwnerCapId = character.OwnerCapId,
                PackageId = packageId,
                DebugData = profileNode?.AsMoveObject?.Contents?.Json.ToString()
            };
        }

        public async Task<WalletRoleContext?> GetWalletRoleContextAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_options.Packages.TheMopPackageId))
                return new();

            var mopPackageId = _options.Packages.TheMopPackageId;

            if (string.IsNullOrWhiteSpace(walletAddress))
                return null;

            if (string.IsNullOrWhiteSpace(mopPackageId))
                return null;

            var roles = await GetOwnedRoleCapsForWalletAsync(
                walletAddress,
                cancellationToken);

            var roleIds = roles
                .Select(r => r.RoleId)
                .Distinct()
                .OrderBy(x => x)
                .ToList();

            var permissions = new WalletPermissions
            {
                IsHighExecutor = RolePermissions.IsHighExecutor(roleIds),
                CanAssignRoles = RolePermissions.CanAssignRoles(roleIds),
                CanRevokeRoles = RolePermissions.CanRevokeRoles(roleIds),
                CanManageTreasury = RolePermissions.CanManageTreasury(roleIds),
                CanManageLogistics = RolePermissions.CanManageLogistics(roleIds),
                CanRecon = RolePermissions.CanRecon(roleIds),
                CanManageCompliance = RolePermissions.CanManageCompliance(roleIds),
                IsRegisteredCitizen = RolePermissions.IsRegisteredCitizen(roleIds),
                CanDeposit = RolePermissions.CanDeposit(roleIds),
                CanUseGates = RolePermissions.CanUseGates(roleIds),
                CanWithdrawFromStorage = RolePermissions.CanWithdrawFromStorage(roleIds),
                CanAuthorizeExtensions = RolePermissions.CanAuthorizeExtensions(roleIds),
                CanConfigureEconomy = RolePermissions.CanConfigureEconomy(roleIds),
                CanManageDirectives = RolePermissions.CanManageDirectives(roleIds),
                ShowAdminPanel = RolePermissions.ShowAdminPanel(roleIds),
                ShowTreasuryPanel = RolePermissions.ShowTreasuryPanel(roleIds),
                ShowLogisticsPanel = RolePermissions.ShowLogisticsPanel(roleIds),
                ShowReconPanel = RolePermissions.ShowReconPanel(roleIds),
                ShowCompliancePanel = RolePermissions.ShowCompliancePanel(roleIds),
            };

            return new WalletRoleContext
            {
                WalletAddress = walletAddress,
                Roles = roles,
                RoleIds = roleIds,
                Permissions = permissions
            };
        }

        public async Task<List<WalletRoleCapSummary>> GetOwnedRoleCapsForWalletAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_options.Packages.TheMopPackageId))
                return [];

            var mopPackageId = _options.Packages.TheMopPackageId;

            var result = await _graphql.SendAsync<OwnedObjectsQueryResponse>(
                SuiQueries.GetOwnedObjectsWithType,
                new
                {
                    owner = walletAddress
                },
                cancellationToken);

            var roleCapType = $"{mopPackageId}::roles::RoleCap";

            var nodes = result.Address?.Objects?.Nodes?
                .Where(x =>
                    string.Equals(
                        x.Contents?.Type?.Repr,
                        roleCapType,
                        StringComparison.Ordinal))
                .ToList();

            if (nodes is null || nodes.Count == 0)
                return [];

            var roles = new List<WalletRoleCapSummary>();

            foreach (var node in nodes)
            {
                if (node.Contents?.Json is null)
                    continue;

                var roleCap = Deserialize<RoleCapData>(node.Contents.Json.Value);
                if (roleCap is null)
                    continue;

                roles.Add(new WalletRoleCapSummary
                {
                    RoleCapId = node.Address,
                    RoleId = roleCap.RoleId,
                    GrantedBy = roleCap.GrantedBy,
                    RoleName = RoleIds.GetName(roleCap.RoleId)
                });
            }

            return roles;
        }

        public async Task<List<OwnedObjectNode>> GetOwnedRoleCapNodesForWalletAsync(
            string walletAddress,
            string packageId,
            CancellationToken cancellationToken = default)
        {
            var result = await _graphql.SendAsync<OwnedObjectsQueryResponse>(
                SuiQueries.GetOwnedObjectsWithType,
                new
                {
                    owner = walletAddress
                },
                cancellationToken);

            var roleCapType = $"{packageId}::roles::RoleCap";

            return result.Address?.Objects?.Nodes?
                .Where(x =>
                    string.Equals(
                        x.Contents?.Type?.Repr,
                        roleCapType,
                        StringComparison.Ordinal))
                .ToList()
                ?? [];
        }

        public async Task<bool> WalletHasRoleAsync(
            string walletAddress,
            byte roleId,
            CancellationToken cancellationToken = default)
        {
            var roles = await GetOwnedRoleCapsForWalletAsync(
                walletAddress,
                cancellationToken);

            return roles.Any(x => x.RoleId == roleId);
        }

        public async Task<string?> GetRoleCapIdForWalletAsync(
            string walletAddress,
            byte roleId,
            CancellationToken cancellationToken = default)
        {
            var roles = await GetOwnedRoleCapsForWalletAsync(
                walletAddress,
                cancellationToken);

            return roles.FirstOrDefault(x => x.RoleId == roleId)?.RoleCapId;
        }

        public async Task<List<byte>> GetOwnedRoleIdsForWalletAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {
            var roles = await GetOwnedRoleCapsForWalletAsync(
                walletAddress,
                cancellationToken);

            return [.. roles.Select(x => x.RoleId)];
        }

        public async Task<PagedKnownCharactersResponse> GetKnownCharactersPageAsync(
            int first,
            string? after,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_options.Packages.World))
                return new();

            var worldId = _options.Packages.World;

            var characterType = $"{worldId}::character::Character";

            var result = await _graphql.SendAsync<KnownCharactersQueryResponse>(
                SuiQueries.GetKnownCharactersPage,
                new
                {
                    type = characterType,
                    first,
                    after
                },
                cancellationToken);

            var items = result.Objects?.Nodes?
                .Select(node =>
                {
                    var profile = Deserialize<PlayerProfileData>(
                        node.AsMoveObject!.Contents!.Json!.Value);

                    return new KnownCharacterSummary
                    {
                        CharacterId = profile?.PlayerProfileId ?? "",
                        CharacterAddress = profile?.CharacterAddress ?? "",
                        CharacterName = profile?.Metadata?.Name ?? "(Unnamed)"
                    };
                })
                .ToList() ?? [];

            return new PagedKnownCharactersResponse
            {
                Items = items,
                HasNextPage = result.Objects?.PageInfo?.HasNextPage ?? false,
                EndCursor = result.Objects?.PageInfo?.EndCursor
            };
        }

        //INVENTORY

        public async Task<List<ItemConfigDto>> GetItemConfigsAsync(
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_options.Packages.ItemConfigRegistryId))
                return [];

            var result = await _graphql.SendAsync<ItemConfigsQueryResponse>(
                SuiQueries.GetItemConfigs,
                new
                {
                    registry = _options.Packages.ItemConfigRegistryId
                },
                cancellationToken);

            var items = result.Object?.DynamicFields?.Nodes?
                .Select(node =>
                {
                    var data = Deserialize<ItemConfigData>(
                        node.Value!.Json!.Value);

                    return new ItemConfigDto
                    {
                        ItemId = long.Parse(data?.ItemId ?? "0"),
                        DisplayName = data?.DisplayName ?? "",
                        CompliancePoints = long.Parse(data?.CompliancePoints ?? "0"),
                        EssentialMultiplier = long.Parse(data?.EssentialMultiplier ?? "0"),
                        IsEnabled = data?.IsEnabled ?? false
                    };
                })
                .OrderBy(x => x.ItemId)
                .ToList() ?? [];

            return items;
        }

        //PLAYERS


        public async Task<PlayerPointsDto> GetPlayerPointsAsync(
            string characterAddress,
            CancellationToken cancellationToken = default)
        {
            var root = await _graphql.SendAsync<JsonElement>(
                SuiQueries.GetPlayerPoints,
                new
                {
                    registry = _options.Packages.PointsRegistryId
                },
                cancellationToken);

            if (!root.TryGetProperty("object", out var obj) ||
                !obj.TryGetProperty("dynamicFields", out var dynamicFields) ||
                !dynamicFields.TryGetProperty("nodes", out var nodes) ||
                nodes.ValueKind != JsonValueKind.Array)
            {
                return new PlayerPointsDto(characterAddress, 0, 0);
            }

            foreach (var node in nodes.EnumerateArray())
            {
                if (!node.TryGetProperty("name", out var name) ||
                    !name.TryGetProperty("json", out var nameJson))
                    continue;

                var nodeCharacterAddress =
                    nameJson.TryGetProperty("character_address", out var ca)
                        ? ca.GetString()
                        : null;

                if (!string.Equals(
                        nodeCharacterAddress,
                        characterAddress,
                        StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!node.TryGetProperty("value", out var value) ||
                    !value.TryGetProperty("json", out var json))
                    continue;

                var compliance = json.TryGetProperty("compliance_points", out var cp)
                    ? ParseLong(cp)
                    : 0;

                var ministry = json.TryGetProperty("ministry_points", out var mp)
                    ? ParseLong(mp)
                    : 0;

                return new PlayerPointsDto(
                    characterAddress,
                    compliance,
                    ministry);
            }

            return new PlayerPointsDto(characterAddress, 0, 0);
        }

        public async Task<List<MinistryLeaderboardEntry>> GetMinistryLeaderboardAsync(
            CancellationToken cancellationToken = default)
        {
            var root = await _graphql.SendAsync<JsonElement>(
                SuiQueries.GetMinistryLeaderboard,
                new
                {
                    registry = _options.Packages.PointsRegistryId
                },
                cancellationToken);

            if (!root.TryGetProperty("object", out var obj) ||
                !obj.TryGetProperty("dynamicFields", out var dynamicFields) ||
                !dynamicFields.TryGetProperty("nodes", out var nodes) ||
                nodes.ValueKind != JsonValueKind.Array)
            {
                return new List<MinistryLeaderboardEntry>();
            }

            var list = new List<MinistryLeaderboardEntry>();

            foreach (var node in nodes.EnumerateArray())
            {
                if (!node.TryGetProperty("name", out var name) ||
                    !name.TryGetProperty("json", out var nameJson))
                    continue;

                if (!node.TryGetProperty("value", out var value) ||
                    !value.TryGetProperty("json", out var valueJson))
                    continue;

                var address =
                    nameJson.TryGetProperty("character_address", out var addr)
                        ? addr.GetString() ?? ""
                        : "";

                var ministry =
                    valueJson.TryGetProperty("ministry_points", out var mp)
                        ? ParseLong(mp)
                        : 0;

                list.Add(new MinistryLeaderboardEntry
                {
                    CharacterAddress = address,
                    MinistryPoints = ministry
                });
            }

            foreach (var entry in list)
            {
                entry.CharacterName = await ResolveCharacterNameAsync(
                    entry.CharacterAddress,
                    cancellationToken);
            }

            return list
                .OrderByDescending(x => x.MinistryPoints)
                .Take(25)
                .ToList();
        }

        public async Task<List<OwnerStoragePickupDto>> GetOwnerStorageWithOpenItemsAsync(
            string characterId,
            CancellationToken ct = default)
        {
            var result = new List<OwnerStoragePickupDto>();

            var ownedObjects = await _gw.ListOwnedObjectsAsync(
                characterId,
                "testnet",
                100,
                null);

            //_logger.LogInformation(
            //    "Found {Count} owned objects for wallet {WalletAddress}",
            //    ownedObjects.Objects.Count,
            //    characterId);

            foreach (var obj in ownedObjects.Objects)
            {
                if (string.IsNullOrWhiteSpace(obj.ObjectType))
                    continue;

                //_logger.LogInformation(
                //    "Checking object {ObjectId} of type {ObjectType}",
                //    obj.ObjectId,
                //    obj.ObjectType);

                if (!obj.ObjectType.Contains("::storage_unit::StorageUnit"))
                    continue;

                var storage = await _gw.GetObjectAsync("testnet", obj.ObjectId);

                if (storage?.Object?.Json is null)
                    continue;

                var json = JsonFormatter.Default.Format(storage.Object.Json);

                _logger.LogInformation(
                    "Checking storage unit {ObjectId} with JSON: {Json}",
                    obj.ObjectId,
                    json);

                using var doc = JsonDocument.Parse(json);
                var fields = doc.RootElement;

                // Get metadata name
                string name = "";

                if (fields.TryGetProperty("metadata", out var md) &&
                    md.TryGetProperty("name", out var nm))
                {
                    name = nm.GetString() ?? "";
                }

                // Get inventory keys
                if (!fields.TryGetProperty("inventory_keys", out var invKeys) ||
                    invKeys.ValueKind != JsonValueKind.Array)
                    continue;

                // Open inventory usually index 0
                var openInventoryId = invKeys[0].GetString();

                if (string.IsNullOrWhiteSpace(openInventoryId))
                    continue;

                var inventoryObj = await _gw.GetObjectAsync(
                    "testnet",
                    openInventoryId);

                if (inventoryObj?.Object?.Json is null)
                    continue;

                var invJson = JsonFormatter.Default.Format(inventoryObj.Object.Json);

                using var invDoc = JsonDocument.Parse(invJson);

                if (!invDoc.RootElement.TryGetProperty("items", out var items) ||
                    !items.TryGetProperty("contents", out var contents))
                    continue;

                if (contents.GetArrayLength() == 0)
                    continue;

                result.Add(new OwnerStoragePickupDto
                {
                    StorageUnitId = obj.ObjectId,
                    StorageName = string.IsNullOrWhiteSpace(name)
                        ? obj.ObjectId[^6..]
                        : name
                });
            }

            return result;
        }

        //HELPERS

        private async Task<string> ResolveCharacterNameAsync(
            string walletAddress,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(walletAddress))
                return "";

            if (_characterNameCache.TryGetValue(walletAddress, out var cached))
                return cached;

            if (_characterNameIndex.TryGet(walletAddress, out var indexed) &&
                !string.IsNullOrWhiteSpace(indexed.CharacterName))
            {
                _characterNameCache[walletAddress] = indexed.CharacterName;
                return indexed.CharacterName;
            }

            try
            {
                var objects = await _gw.ListOwnedObjectsAsync(
                    walletAddress,
                    "testnet",
                    50,
                    null);

                foreach (var obj in objects.Objects)
                {
                    if (string.IsNullOrWhiteSpace(obj.ObjectType))
                        continue;

                    // Direct Character ownership
                    if (obj.ObjectType.Contains("::character::Character", StringComparison.Ordinal))
                    {
                        var character = await _gw.GetCharacterAsync(
                            obj.ObjectId,
                            "testnet",
                            ct);

                        if (character is not null && !string.IsNullOrWhiteSpace(character.Name))
                        {
                            _characterNameCache[walletAddress] = character.Name;

                            _characterNameIndex.Upsert(
                                walletAddress,
                                character.ObjectId,
                                character.Name);

                            return character.Name;
                        }
                    }

                    // PlayerProfile ownership -> follow character_id
                    if (obj.ObjectType.Contains("::character::PlayerProfile", StringComparison.Ordinal))
                    {
                        var profileName = await TryResolveCharacterNameFromPlayerProfileAsync(
                            obj.ObjectId,
                            ct);

                        if (!string.IsNullOrWhiteSpace(profileName))
                        {
                            _characterNameCache[walletAddress] = profileName;

                            _characterNameIndex.Upsert(
                                walletAddress,
                                "",
                                profileName);

                            return profileName;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to resolve character name for wallet {WalletAddress}",
                    walletAddress);
            }

            return "";
        }

        private async Task<string?> TryResolveCharacterNameFromPlayerProfileAsync(
            string playerProfileObjectId,
            CancellationToken ct)
        {
            try
            {
                var resp = await _gw.GetObjectAsync("testnet", playerProfileObjectId);
                var obj = resp.Object;

                if (obj?.Json is null)
                    return null;

                var jsonText = JsonFormatter.Default.Format(obj.Json);
                using var doc = JsonDocument.Parse(jsonText);
                var root = doc.RootElement;

                // Try direct profile metadata name first
                if (root.TryGetProperty("metadata", out var metadata) &&
                    metadata.ValueKind == JsonValueKind.Object &&
                    metadata.TryGetProperty("name", out var nameEl))
                {
                    var directName = nameEl.GetString();
                    if (!string.IsNullOrWhiteSpace(directName))
                        return directName;
                }

                // Otherwise follow character_id -> Character object
                if (root.TryGetProperty("character_id", out var characterIdEl))
                {
                    var characterId = characterIdEl.GetString();
                    if (!string.IsNullOrWhiteSpace(characterId))
                    {
                        var character = await _gw.GetCharacterAsync(characterId, "testnet", ct);
                        if (character is not null && !string.IsNullOrWhiteSpace(character.Name))
                            return character.Name;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to resolve character name from player profile {PlayerProfileObjectId}",
                    playerProfileObjectId);
            }

            return null;
        }

        private static long ParseLong(JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt64(out var n))
                return n;

            if (el.ValueKind == JsonValueKind.String && long.TryParse(el.GetString(), out var s))
                return s;

            return 0;
        }

        public static string? TryGetPackageIdFromType(string? fullType)
        {
            if (string.IsNullOrWhiteSpace(fullType))
                return null;

            var idx = fullType.IndexOf("::", StringComparison.Ordinal);
            if (idx <= 0)
                return null;

            return fullType[..idx];
        }

        private static T? Deserialize<T>(JsonElement json)
        {
            try
            {
                return json.Deserialize<T>(JsonOptions);
            }
            catch
            {
                return default;
            }
        }
    }
}
