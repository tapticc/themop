using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class PlayerProfileQueryResponse
    {
        [JsonPropertyName("objects")]
        public ObjectConnection? Objects { get; set; }
    }
}
