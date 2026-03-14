using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class CharacterData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("key")]
        public CharacterKey? Key { get; set; }

        [JsonPropertyName("tribe_id")]
        public int? TribeId { get; set; }

        [JsonPropertyName("character_address")]
        public string? CharacterAddress { get; set; }

        [JsonPropertyName("metadata")]
        public CharacterMetadata? Metadata { get; set; }

        [JsonPropertyName("owner_cap_id")]
        public string? OwnerCapId { get; set; }
    }
}
