namespace Api.Services.GraphQL
{
    public class ObjectsConnection
    {
        public PageInfoNode? PageInfo { get; set; }
        public List<KnownCharacterNode>? Nodes { get; set; }
    }
}
