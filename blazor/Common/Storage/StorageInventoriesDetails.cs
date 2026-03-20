namespace Common.Storage
{
    public class StorageInventoriesDetails
    {
        public bool Found { get; set; }
        public string? Error { get; set; }

        public bool HasSmartStorageExtension { get; set; }
        public bool HasThemopUrl { get; set; }

        public string MetadataUrl { get; set; } = string.Empty;
        public string ExtensionType { get; set; } = string.Empty;
        public string StorageOwnerCapId { get; set; } = string.Empty;

        public List<string> InventoryKeys { get; set; } = [];
        public List<StorageInventoryGroup> Inventories { get; set; } = [];
    }
}
