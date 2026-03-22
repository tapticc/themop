namespace Common.Events
{
    public class PlayerDepositEventRow
    {
        public string Id { get; set; } = string.Empty;
        public string TxDigest { get; set; } = string.Empty;
        public string EventSeq { get; set; } = string.Empty;
        public string PackageId { get; set; } = string.Empty;
        public string TimestampMs { get; set; } = string.Empty;

        public string CharacterAddress { get; set; } = string.Empty;
        public string CharacterId { get; set; } = string.Empty;
        public string StorageUnitId { get; set; } = string.Empty;

        public string ItemCount { get; set; } = "0";
        public string TotalQuantity { get; set; } = "0";
        public string TotalPointsAwarded { get; set; } = "0";
        public string MovedBy { get; set; } = string.Empty;

        public string RawJson { get; set; } = string.Empty;
    }
}
