using Common.Events;
using Common.Inventory;
using Common.Player;
using Common.Roles;
using Common.Sui;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;

namespace Client.Services
{
    public class SuiApiClient(HttpClient http, IOptions<SuiContractOptions> options)
    {
        private readonly HttpClient _http = http;
        private readonly SuiContractOptions _options = options.Value;

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

        public async Task<WalletRoleContext?> GetWalletRoleContextAsync(string walletAddress)
        {
            var url =
                $"api/sui/wallet-role-context" +
                $"?walletAddress={Uri.EscapeDataString(walletAddress)}" +
                $"&packageId={Uri.EscapeDataString(_options.TheMopPackageId)}";

            return await _http.GetFromJsonAsync<WalletRoleContext>(url);
        }

        public async Task<WalletRoleContext?> GetWalletRoleContextAsync(string walletAddress, string packageId)
        {
            var url =
                $"api/sui/wallet-role-context" +
                $"?walletAddress={Uri.EscapeDataString(walletAddress)}" +
                $"&packageId={Uri.EscapeDataString(packageId)}";

            return await _http.GetFromJsonAsync<WalletRoleContext>(url);
        }

        public async Task<List<WalletRoleCapSummary>> GetOwnedRoleCapsAsync(string walletAddress)
        {
            var response = await _http.GetFromJsonAsync<List<WalletRoleCapSummary>>(
                $"api/sui/owned-role-caps?walletAddress={walletAddress}");

            return response ?? [];
        }

        public async Task<PagedKnownCharactersResponse?> GetKnownCharactersPageAsync(
            int first = 20,
            string? after = null)
        {
            var url = $"api/sui/known-characters?first={first}";

            if (!string.IsNullOrWhiteSpace(after))
            {
                url += $"&after={Uri.EscapeDataString(after)}";
            }

            return await _http.GetFromJsonAsync<PagedKnownCharactersResponse>(url);
        }

        //INVENTORY

        public async Task<List<ItemConfigDto>> GetItemConfigsAsync()
        {
            var response = await _http.GetFromJsonAsync<List<ItemConfigDto>>(
                "api/sui/item-configs");

            return response ?? [];
        }

        //EVENTS

        public async Task<PlayerDepositEventsResult> GetPlayerDepositEventsAsync(
            string walletAddress,
            string? cursor = null,
            int limit = 25)
        {
            var url =
                $"api/sui/player-deposit-events?walletAddress={Uri.EscapeDataString(walletAddress)}&limit={limit}";

            if (!string.IsNullOrWhiteSpace(cursor))
            {
                url += $"&cursor={Uri.EscapeDataString(cursor)}";
            }

            var result = await _http.GetFromJsonAsync<PlayerDepositEventsResult>(url);
            return result ?? new PlayerDepositEventsResult
            {
                Success = false,
                Error = "No response from API."
            };
        }

        public async Task<PlayerPointsDto> GetPlayerPointsAsync(string characterAddress, bool forceRefresh = false)
        {
            var url =
                $"api/sui/player-points?characterAddress={Uri.EscapeDataString(characterAddress)}";

            if (forceRefresh)
            {
                url += $"&t={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            }

            var response = await _http.GetFromJsonAsync<PlayerPointsDto>(url);
            return response ?? new PlayerPointsDto(characterAddress, 0, 0);
        }

        public async Task<PlayerProfilePointsDto> GetPlayerProfilePointsAsync(
            string walletAddress,
            string characterId,
            string characterName,
            long totalPoints,
            bool forceRefresh = false)
        {
            var url =
                $"api/sui/player-profile-points" +
                $"?walletAddress={Uri.EscapeDataString(walletAddress)}" +
                $"&characterId={Uri.EscapeDataString(characterId)}" +
                $"&characterName={Uri.EscapeDataString(characterName)}" +
                $"&totalPoints={totalPoints}";

            if (forceRefresh)
            {
                url += $"&t={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            }

            var result = await _http.GetFromJsonAsync<PlayerProfilePointsDto>(url);

            return result ?? new PlayerProfilePointsDto
            {
                WalletAddress = walletAddress,
                CharacterId = characterId,
                CharacterName = characterName,
                TotalPoints = totalPoints
            };
        }
    }
}
