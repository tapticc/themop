namespace Common.Roles
{
    public class WalletPermissions
    {
        public bool IsHighExecutor { get; init; }
        public bool CanAssignRoles { get; init; }
        public bool CanRevokeRoles { get; init; }
        public bool CanManageTreasury { get; init; }
        public bool CanManageLogistics { get; init; }
        public bool CanRecon { get; init; }
        public bool CanManageCompliance { get; init; }
        public bool IsRegisteredCitizen { get; init; }
        public bool CanDeposit { get; init; }
        public bool CanUseGates { get; init; }
        public bool CanWithdrawFromStorage { get; init; }
        public bool CanAuthorizeExtensions { get; init; }
        public bool CanConfigureEconomy { get; init; }
        public bool CanManageDirectives { get; init; }
        public bool ShowAdminPanel { get; init; }
        public bool ShowTreasuryPanel { get; init; }
        public bool ShowLogisticsPanel { get; init; }
        public bool ShowReconPanel { get; init; }
        public bool ShowCompliancePanel { get; init; }
        public bool CanWithdraw { get; init; }
    }
}
