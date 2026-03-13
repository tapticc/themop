using Common.Sui;
using System.Net.Http.Json;

namespace Client.Services
{
    public class SuiApiClient(HttpClient http)
    {
        private readonly HttpClient _http = http;

        public async Task<HttpResponseMessage> GetBalanceAsync(string owner, string network)
        {
            var url =
                $"api/sui/balance?owner={Uri.EscapeDataString(owner)}&network={Uri.EscapeDataString(network)}";

            return await _http.GetAsync(url);
        }

        public async Task<HttpResponseMessage> GetOwnedObjectsAsync(
            string owner,
            string network,
            int pageSize = 50,
            string? pageTokenHex = null)
        {
            var url = $"api/sui/owned-objects?owner={Uri.EscapeDataString(owner)}&network={Uri.EscapeDataString(network)}&pageSize={pageSize}";
            if (!string.IsNullOrWhiteSpace(pageTokenHex))
                url += $"&pageToken={Uri.EscapeDataString(pageTokenHex)}";

            return await _http.GetAsync(url);
        }

        public async Task<HttpResponseMessage> GetCharacterAsync(
            string owner,
            string network)
        {
            var url = $"api/sui/character?owner={Uri.EscapeDataString(owner)}&network={Uri.EscapeDataString(network)}";

            return await _http.GetAsync(url);
        }

        public async Task<HttpResponseMessage> GetDumpDataAsync(
            string owner,
            string network)
        {
            var url = $"api/sui/dumpdata?owner={Uri.EscapeDataString(owner)}&network={Uri.EscapeDataString(network)}";

            return await _http.GetAsync(url);
        }

        public async Task<HttpResponseMessage> GetObjectFieldsDumpUniversalAsync(
            string owner,
            string network)
        {
            var url = $"api/sui/objectfields?owner={Uri.EscapeDataString(owner)}&network={Uri.EscapeDataString(network)}";

            return await _http.GetAsync(url);
        }

        //doesn't need to use the gateway, can call directly to the sui api server since it doesn't require CORS
        public async Task<CharacterSummary?> GetCharacterFromWalletAsync(string walletAddress)
        {
            return await _http.GetFromJsonAsync<CharacterSummary>(
                $"api/sui/character-from-wallet?walletAddress={Uri.EscapeDataString(walletAddress)}");
        }
    }
}
