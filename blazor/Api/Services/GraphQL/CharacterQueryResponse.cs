using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class CharacterQueryResponse
    {
        [JsonPropertyName("object")]
        public ObjectNode? Object { get; set; }
    }
}
