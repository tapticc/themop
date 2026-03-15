using Api.Services.GraphQL;
using Common.Roles;

namespace Api.Services.Sui
{
    public class RoleService(SuiGraphQLService graphql)
    {
        private readonly SuiGraphQLService _graphql = graphql;

        public async Task<WalletRoleContext> GetContextAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {
            var roles = await _graphql.GetOwnedRoleCapsForWalletAsync(
                walletAddress,
                cancellationToken);

            var roleIds = roles
                .Select(r => r.RoleId)
                .Distinct()
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
    }
}
