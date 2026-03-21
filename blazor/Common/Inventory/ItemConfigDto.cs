namespace Common.Inventory
{
    public class ItemConfigDto
    {
        public long ItemId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public long CompliancePoints { get; set; }
        public long EssentialMultiplier { get; set; }
        public bool IsEnabled { get; set; }
    }
}
