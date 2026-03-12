using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class CharacterKey
    {
        [JsonPropertyName("item_id")]
        public string? ItemId { get; set; }

        [JsonPropertyName("tenant")]
        public string? Tenant { get; set; }
    }
}
