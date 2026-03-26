using Api.Services.GraphQL;
using Common.Inventory;
using Common.Roles;
using Common.Storage;
using Common.Sui;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/sui")]
    public class SuiController(SuiGraphQLService suiGraphQLService) : ControllerBase
    {
        private readonly SuiGraphQLService _suiGraphQLService = suiGraphQLService;

        [HttpGet("character-from-wallet")]
        public async Task<ActionResult<CharacterSummary>> GetCharacterFromWallet(
            [FromQuery] string walletAddress,
            CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetCharacterSummaryForWalletAsync(
                walletAddress,
                cancellationToken);

            if (result is null)
                return NotFound();

            return Ok(result);
        }

        [HttpGet("wallet-role-context")]
        public async Task<ActionResult<WalletRoleContext>> GetWalletRoleContext(
            [FromQuery] string walletAddress,
            CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetWalletRoleContextAsync(
                walletAddress,
                cancellationToken);

            if (result is null)
                return NotFound();

            return Ok(result);
        }

        [HttpGet("owned-role-caps")]
        public async Task<ActionResult<List<WalletRoleCapSummary>>> GetOwnedRoleCaps(
            [FromQuery] string walletAddress,
            CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetOwnedRoleCapsForWalletAsync(
                walletAddress,
                cancellationToken);

            return Ok(result);
        }

        //INVENTORY

        [HttpGet("item-configs")]
        public async Task<ActionResult<List<ItemConfigDto>>> GetItemConfigs(
            CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetItemConfigsAsync(cancellationToken);
            return Ok(result);
        }

        [HttpGet("owner-storage-pickup")]
        public async Task<List<OwnerStoragePickupDto>> GetOwnerStoragePickup([FromQuery] string characterId)
        {
            return await _suiGraphQLService.GetOwnerStorageWithOpenItemsAsync(characterId);
        }
    }
}