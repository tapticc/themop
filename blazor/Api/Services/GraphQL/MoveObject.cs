using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class MoveObject
    {
        [JsonPropertyName("contents")]
        public MoveContents? Contents { get; set; }
    }
}
