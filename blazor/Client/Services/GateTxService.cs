using Microsoft.Extensions.Options;

namespace Client.Services
{

    public class GateTxService(
        SuiInterop interop,
        GateService gateService,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly GateService _gateService = gateService;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public async Task<TxResult> ConfigureGateAsync(
            string gateId,
            string characterId,
            string name,
            string description,
            string url)
        {
            var gate = await _gateService.GetGateAsync(gateId);

            if (!gate.Found)
            {
                return new TxResult
                {
                    Success = false,
                    Error = gate.Error ?? "Gate not found."
                };
            }

            if (string.IsNullOrWhiteSpace(gate.OwnerCapId))
            {
                return new TxResult
                {
                    Success = false,
                    Error = "Gate owner cap not found."
                };
            }

            return await _interop.ConfigureGateAssemblyAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                theMopPackageId = _contracts.TheMopPackageId,
                gateId,
                characterId,
                gateOwnerCapId = gate.OwnerCapId,
                name,
                description,
                url
            });
        }

        public async Task<TxResult> PurchaseJumpPermitAsync(
            string sourceGateId,
            string destinationGateId,
            string characterId,
            DateTimeOffset expiresAtUtc)
        {
            return await _interop.PurchaseJumpPermitAsync(new
            {
                theMopPackageId = _contracts.TheMopPackageId,
                gatePermitRegistryId = _contracts.GatePermitRegistryId,
                pointsRegistryId = _contracts.PointsRegistryId,
                sourceGateId,
                destinationGateId,
                characterId,
                expiresAtTimestampMs = expiresAtUtc.ToUnixTimeMilliseconds().ToString()
            });
        }
    }
}
