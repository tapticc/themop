using System.Text.Json.Serialization;

namespace Api.Services.Models
{
    public class RoleCapData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("role_id")]
        public byte RoleId { get; set; }

        [JsonPropertyName("grantee")]
        public string? Grantee { get; set; }

        [JsonPropertyName("granted_by")]
        public string? GrantedBy { get; set; }
    }
}
