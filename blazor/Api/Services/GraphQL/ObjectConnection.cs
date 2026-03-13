using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class ObjectConnection
    {
        [JsonPropertyName("nodes")]
        public List<ObjectNode>? Nodes { get; set; }
    }
}
