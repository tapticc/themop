namespace Common.Gates
{
    public class GateDetails
    {
        public bool Found { get; set; }
        public string? Error { get; set; }

        public string ObjectId { get; set; } = string.Empty;
        public string OwnerCapId { get; set; } = string.Empty;
        public string OwnerCharacterId { get; set; } = string.Empty;

        public string MetadataName { get; set; } = string.Empty;
        public string MetadataDescription { get; set; } = string.Empty;
        public string MetadataUrl { get; set; } = string.Empty;
        public string ExtensionType { get; set; } = string.Empty;

        public string RawJson { get; set; } = string.Empty;
        public string LinkedGateId { get; set; } = string.Empty;
    }
}
