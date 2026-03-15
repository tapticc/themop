namespace Api.Services.GraphQL
{
    public class PageInfoNode
    {
        public bool HasNextPage { get; set; }
        public string? EndCursor { get; set; }
    }
}
