namespace Common.Inventory
{
    public class SetItemConfigTxRequest
    {
        public string PackageId { get; set; } = string.Empty;
        public string ItemConfigRegistryId { get; set; } = string.Empty;
        public string RoleCapId { get; set; } = string.Empty;

        public ulong ItemId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public ulong CompliancePoints { get; set; }
        public ulong EssentialMultiplier { get; set; }
        public bool IsEnabled { get; set; }
    }
}
