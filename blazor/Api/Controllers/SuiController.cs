using Api.Services.GraphQL;
using Api.Services.Sui;
using Common.Inventory;
using Common.Roles;
using Common.Storage;
using Common.Sui;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/sui")]
    public class SuiController(SuiGraphQLService suiGraphQLService, SuiGrpcGateway suiGrpcGateway) : ControllerBase
    {
        private readonly SuiGraphQLService _suiGraphQLService = suiGraphQLService;
        private readonly SuiGrpcGateway _suiGrpcGateway = suiGrpcGateway;

        //CHARACTER / WALLET

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

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance(
           [FromQuery] string owner,
           [FromQuery] string network)
        {
            try
            {
                var resp = await _suiGrpcGateway.GetBalanceAsync(owner, network);
                return Ok(resp);
            }
            catch (Exception)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "An error occurred while fetching the balance",
                    Status = 400
                });
            }
        }

        [HttpGet("character")]
        public async Task<IActionResult> GetCharacter(
            [FromQuery] string owner,
            [FromQuery] string network)
        {
            try
            {
                var resp = await _suiGrpcGateway.GetCharacterAsync(owner, network);
                return Ok(resp);
            }
            catch (Exception)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "An error occurred while fetching the character data",
                    Status = 400
                });
            }
        }

        [HttpGet("player-points")]
        public async Task<IActionResult> GetPlayerPoints(
            [FromQuery] string characterAddress,
            CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetPlayerPointsAsync(characterAddress, cancellationToken);
            return Ok(result);
        }

        [HttpGet("player-profile-points")]
        public async Task<IActionResult> GetPlayerProfilePoints(
            [FromQuery] string walletAddress,
            [FromQuery] string characterId,
            [FromQuery] string characterName,
            [FromQuery] long totalPoints)
        {
            var result = await _suiGrpcGateway.GetPlayerProfilePointsAsync(walletAddress, characterId, characterName, totalPoints);
            return Ok(result);
        }

        [HttpGet("ministry-leaderboard")]
        public async Task<IActionResult> GetMinistryLeaderboard(CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetMinistryLeaderboardAsync(cancellationToken);
            return Ok(result);
        }

        [HttpGet("known-characters")]
        public async Task<IActionResult> GetKnownCharacters(
            [FromQuery] int first,
            [FromQuery] string? after,
            [FromQuery] string? walletAddress,
            [FromQuery] string? characterName,
            CancellationToken cancellationToken)
        {
            var result = await _suiGraphQLService.GetKnownCharactersPageAsync(first, after, walletAddress, characterName, cancellationToken);
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