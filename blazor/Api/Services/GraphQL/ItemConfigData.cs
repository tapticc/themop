using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class ItemConfigData
    {
        [JsonPropertyName("item_id")]
        public string? ItemId { get; set; }

        [JsonPropertyName("display_name")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("compliance_points")]
        public string? CompliancePoints { get; set; }

        [JsonPropertyName("essential_multiplier")]
        public string? EssentialMultiplier { get; set; }

        [JsonPropertyName("is_enabled")]
        public bool IsEnabled { get; set; }
    }
}
