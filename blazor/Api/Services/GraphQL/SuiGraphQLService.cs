using Api.Services.Models;
using Api.Services.Sui;
using Common.Inventory;
using Common.Roles;
using Common.Sui;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Api.Services.GraphQL
{
    public class SuiGraphQLService(GraphQLClient graphql, IOptions<SuiOptions> options)
    {
        private readonly GraphQLClient _graphql = graphql;
        private readonly SuiOptions _options = options.Value;

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
            if (profile is null || string.IsNullOrWhiteSpace(profile.Id))
                return null;

            var characterResult = await _graphql.SendAsync<CharacterQueryResponse>(
                SuiQueries.GetCharacter,
                new { id = profile.Id },
                cancellationToken);

            var characterNode = characterResult.Object;
            if (characterNode?.AsMoveObject?.Contents?.Json is null)
                return null;

            var character = Deserialize<CharacterData>(characterNode.AsMoveObject.Contents.Json.Value);
            if (character is null)
                return null;

            return new CharacterSummary
            {
                PlayerProfileId = profileNode.Address,
                CharacterId = characterNode.Address,
                CharacterName = character.Metadata?.Name,
                OwnerCapId = character.OwnerCapId,
                PackageId = packageId
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
                return new();

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
            if (string.IsNullOrWhiteSpace(_options.Packages.PlayerProfileObjectTypeId))
                return new();

            var PlayerProfileObjectTypeId = _options.Packages.PlayerProfileObjectTypeId;

            var characterType = $"{PlayerProfileObjectTypeId}::character::Character";

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
                        CharacterId = profile?.Id ?? "",
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
                        ItemId = ulong.Parse(data?.ItemId ?? "0"),
                        DisplayName = data?.DisplayName ?? "",
                        CompliancePoints = ulong.Parse(data?.CompliancePoints ?? "0"),
                        EssentialMultiplier = ulong.Parse(data?.EssentialMultiplier ?? "0"),
                        IsEnabled = data?.IsEnabled ?? false
                    };
                })
                .OrderBy(x => x.ItemId)
                .ToList() ?? [];

            return items;
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
