using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class CharacterMetadata
    {
        [JsonPropertyName("assembly_id")]
        public string? AssemblyId { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("url")]
        public string? Url { get; set; }
    }
}
