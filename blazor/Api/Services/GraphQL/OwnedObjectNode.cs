namespace Api.Services.GraphQL
{
    public class OwnedObjectNode
    {
        public string Address { get; set; } = string.Empty;

        public MoveContents? Contents { get; set; }
    }
}
