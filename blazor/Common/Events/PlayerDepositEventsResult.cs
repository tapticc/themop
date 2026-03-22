namespace Common.Events
{
    public class PlayerDepositEventsResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }

        public string? NextCursor { get; set; }
        public bool HasNextPage { get; set; }

        public List<PlayerDepositEventRow> Items { get; set; } = new();
    }
}
