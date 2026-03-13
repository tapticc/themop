using Api.Services.Sui;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;

namespace Api.Services.GraphQL
{
    public class GraphQLClient(HttpClient http, IOptions<SuiOptions> options)
    {
        private readonly HttpClient _http = http;
        private readonly SuiOptions _options = options.Value;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private string GetEndpoint(string network)
        {
            if (_options.GraphQLEndpoints.TryGetValue(network, out var endpoint))
                return endpoint;

            throw new InvalidOperationException($"No GraphQL endpoint configured for network '{network}'.");
        }

        //overload to pick up the existing network
        public Task<T> SendAsync<T>(
            string query,
            object? variables = null,
            CancellationToken cancellationToken = default)
        {
            return SendAsync<T>(_options.DefaultNetwork, query, variables, cancellationToken);
        }

        public async Task<T> SendAsync<T>(
            string network,
            string query,
            object? variables = null,
            CancellationToken cancellationToken = default)
        {
            var endpoint = GetEndpoint(network);

            var payload = new
            {
                query,
                variables
            };

            var json = JsonSerializer.Serialize(payload);

            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var request =
                new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = content
                };

            var response = await _http.SendAsync(request, cancellationToken);

            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"GraphQL HTTP {(int)response.StatusCode} {response.ReasonPhrase}\n{body}");
            }

            var envelope =
                JsonSerializer.Deserialize<GraphQLResponse<T>>(body, JsonOptions)
                ?? throw new InvalidOperationException("GraphQL response empty");

            if (envelope.Errors?.Length > 0)
            {
                throw new InvalidOperationException(
                    string.Join(" | ",
                        envelope.Errors.Select(e => e.Message)));
            }

            return envelope.Data ?? throw new InvalidOperationException("GraphQL returned no data");
        }

        public async Task<JsonDocument> PostRawAsync(
            string network,
            string query,
            object? variables = null,
            CancellationToken cancellationToken = default)
        {
            var endpoint = GetEndpoint(network);

            var payload = new
            {
                query,
                variables
            };

            using var request =
                new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(payload),
                        Encoding.UTF8,
                        "application/json")
                };

            var response = await _http.SendAsync(request, cancellationToken);

            var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

            return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        }
    }
}
