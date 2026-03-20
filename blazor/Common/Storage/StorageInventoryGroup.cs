namespace Common.Storage
{
    public class StorageInventoryGroup
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public bool HasInventory { get; set; }
        public string InventoryObjectId { get; set; } = string.Empty;
        public string UsedCapacity { get; set; } = string.Empty;
        public string MaxCapacity { get; set; } = string.Empty;
        public List<StorageInventoryItem> Items { get; set; } = [];
    }
}
