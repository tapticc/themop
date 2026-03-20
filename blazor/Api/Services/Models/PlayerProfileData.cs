using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class PlayerProfileData
    {
        [JsonPropertyName("id")]
        public string? PlayerProfileId { get; set; }

        [JsonPropertyName("character_id")]
        public string? CharacterId { get; set; }

        [JsonPropertyName("character_address")]
        public string? CharacterAddress { get; set; }

        [JsonPropertyName("metadata")]
        public PlayerProfileMetadata? Metadata { get; set; }
    }
}
