namespace Common.Storage
{
    public class StorageInventoryItem
    {
        public string ItemId { get; set; } = string.Empty;
        public string Quantity { get; set; } = string.Empty;
        public string ObjectId { get; set; } = string.Empty;
        public string RawJson { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;
        public long PointsPerUnit { get; set; }
        public long TotalPoints { get; set; }
        public bool IsConfigured { get; set; }
    }
}
