namespace Common.Inventory
{
    public class SetItemConfigTxRequest
    {
        public string PackageId { get; set; } = string.Empty;
        public string ItemConfigRegistryId { get; set; } = string.Empty;
        public string RoleCapId { get; set; } = string.Empty;

        public long ItemId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public long CompliancePoints { get; set; }
        public long EssentialMultiplier { get; set; }
        public bool IsEnabled { get; set; }
    }
}
