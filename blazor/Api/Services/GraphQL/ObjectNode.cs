using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class ObjectNode
    {
        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("asMoveObject")]
        public MoveObject? AsMoveObject { get; set; }
    }
}
