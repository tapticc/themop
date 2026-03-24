using Common.Gates;
using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class GateService(
        SuiInterop interop,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public Task<GateDetails> GetGateAsync(string gateId) =>
            _interop.GetGateAsync(gateId);

        public Task<GatePermitConfigDto> GetPermitConfigAsync() =>
            _interop.GetGatePermitConfigAsync(_contracts.GatePermitRegistryId);
    }
}
