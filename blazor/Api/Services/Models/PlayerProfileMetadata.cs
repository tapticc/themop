using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class PlayerProfileMetadata
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
