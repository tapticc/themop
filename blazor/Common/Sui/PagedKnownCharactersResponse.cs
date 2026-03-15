namespace Common.Sui
{
    public class PagedKnownCharactersResponse
    {
        public List<KnownCharacterSummary> Items { get; set; } = new();
        public bool HasNextPage { get; set; }
        public string? EndCursor { get; set; }
    }
}
