using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class MoveTypeRef
    {
        [JsonPropertyName("repr")]
        public string? Repr { get; set; }
    }
}
