using Api.Services.GraphQL;
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
    }
}
