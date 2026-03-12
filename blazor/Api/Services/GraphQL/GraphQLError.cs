using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class GraphQLError
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }
}
