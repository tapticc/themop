namespace Common.Storage
{
    public class StorageUnitDetails
    {
        public bool Found { get; set; }
        public string? Error { get; set; }

        public string ObjectId { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Digest { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Owner { get; set; }

        public string AssemblyItemId { get; set; } = string.Empty;
        public string Tenant { get; set; } = string.Empty;
        public string OwnerCapId { get; set; } = string.Empty;
        public string TypeId { get; set; } = string.Empty;

        public string MetadataName { get; set; } = string.Empty;
        public string MetadataDescription { get; set; } = string.Empty;
        public string MetadataUrl { get; set; } = string.Empty;

        public string EnergySourceId { get; set; } = string.Empty;
        public string ExtensionType { get; set; } = string.Empty;

        public List<string> InventoryKeys { get; set; } = [];

        public string StatusJson { get; set; } = string.Empty;
        public string LocationJson { get; set; } = string.Empty;
        public string RawJson { get; set; } = string.Empty;
        public string OwnerCharacterId { get; set; } = string.Empty;
    }
}
