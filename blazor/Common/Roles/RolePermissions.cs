namespace Common.Roles
{
    public static class RolePermissions
    {
        // ===== Core role checks =====

        public static bool HasRole(IEnumerable<byte> roles, byte roleId)
        {
            return roles.Contains(roleId);
        }

        public static bool HasRole(IEnumerable<WalletRoleCapSummary> roles, byte roleId)
        {
            return roles.Any(r => r.RoleId == roleId);
        }

        // ===== Administrative authority =====

        public static bool IsHighExecutor(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor);
        }

        public static bool CanAssignRoles(IEnumerable<byte> roles)
        {
            return IsHighExecutor(roles);
        }

        public static bool CanRevokeRoles(IEnumerable<byte> roles)
        {
            return IsHighExecutor(roles);
        }

        // ===== Treasury =====

        public static bool CanManageTreasury(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.TreasuryOfficer);
        }

        // ===== Logistics =====

        public static bool CanManageLogistics(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.LogisticsOperative);
        }

        // ===== Recon =====

        public static bool CanRecon(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.ReconOperative);
        }

        // ===== Compliance =====

        public static bool CanManageCompliance(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.ComplianceOfficer);
        }

        // ===== General citizen permissions =====

        public static bool IsRegisteredCitizen(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.RegisteredCitizen);
        }

        public static bool CanDeposit(IEnumerable<byte> roles)
        {
            return IsRegisteredCitizen(roles)
                || roles.Contains(RoleIds.HighExecutor);
        }

        public static bool CanUseGates(IEnumerable<byte> roles)
        {
            return IsRegisteredCitizen(roles)
                || roles.Contains(RoleIds.HighExecutor);
        }

        // ===== Storage unit permissions =====

        public static bool CanWithdrawFromStorage(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.LogisticsOperative);
        }

        public static bool CanAuthorizeExtensions(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor);
        }

        // ===== Economy configuration =====

        public static bool CanConfigureEconomy(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.TreasuryOfficer);
        }

        // ===== Directive system =====

        public static bool CanManageDirectives(IEnumerable<byte> roles)
        {
            return roles.Contains(RoleIds.HighExecutor)
                || roles.Contains(RoleIds.ComplianceOfficer);
        }

        // ===== UI helpers =====

        public static bool ShowAdminPanel(IEnumerable<byte> roles)
        {
            return IsHighExecutor(roles);
        }

        public static bool ShowTreasuryPanel(IEnumerable<byte> roles)
        {
            return CanManageTreasury(roles);
        }

        public static bool ShowLogisticsPanel(IEnumerable<byte> roles)
        {
            return CanManageLogistics(roles);
        }

        public static bool ShowReconPanel(IEnumerable<byte> roles)
        {
            return CanRecon(roles);
        }

        public static bool ShowCompliancePanel(IEnumerable<byte> roles)
        {
            return CanManageCompliance(roles);
        }
    }
}
