using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class GraphQLResponse<T>
    {
        [JsonPropertyName("data")]
        public T? Data { get; set; }

        [JsonPropertyName("errors")]
        public GraphQLError[]? Errors { get; set; }
    }
}
