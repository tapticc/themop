using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class PlayerProfileData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("character_id")]
        public string? CharacterId { get; set; }
    }
}
