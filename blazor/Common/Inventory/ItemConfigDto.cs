namespace Common.Inventory
{
    public class ItemConfigDto
    {
        public ulong ItemId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public ulong CompliancePoints { get; set; }
        public ulong EssentialMultiplier { get; set; }
        public bool IsEnabled { get; set; }
    }
}
