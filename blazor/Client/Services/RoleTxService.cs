using Common.Roles;
using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class RoleTxService(
        SuiInterop interop,
        SuiApiClient api,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly SuiApiClient _api = api;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public async Task<TxResult> GrantRoleAsync(string signerWalletAddress, string grantee, byte roleId)
        {
            try
            {
                var highExecutorRoleCapId = await GetHighExecutorRoleCapIdAsync(signerWalletAddress);

                var request = new GrantRoleTxRequest
                {
                    PackageId = _contracts.TheMopPackageId,
                    RoleRegistryId = _contracts.RoleRegistryId,
                    HighExecutorRoleCapId = highExecutorRoleCapId,
                    RoleId = roleId,
                    Grantee = grantee
                };

                return await _interop.GrantRoleAsync(request);
            }
            catch (Exception ex)
            {
                return new TxResult
                {
                    Success = false,
                    Error = ex.Message
                };
            }
        }

        public async Task<TxResult> RevokeRoleAsync(string grantedBy, string roleCapId)
        {
            try
            {
                var highExecutorRoleCapId = await GetHighExecutorRoleCapIdAsync(grantedBy);

                var request = new RevokeRoleTxRequest
                {
                    PackageId = _contracts.TheMopPackageId,
                    RoleRegistryId = _contracts.RoleRegistryId,
                    HighExecutorRoleCapId = highExecutorRoleCapId,
                    RoleCapId = roleCapId
                };

                return await _interop.RevokeRoleAsync(request);
            }
            catch (Exception ex)
            {
                return new TxResult
                {
                    Success = false,
                    Error = ex.Message
                };
            }
        }

        private async Task<string> GetHighExecutorRoleCapIdAsync(string grantee)
        {
            var result = await _api.GetOwnedRoleCapsAsync(grantee);

            var highExecutorCap = result?
                .FirstOrDefault(x => x.RoleId == RoleIds.HighExecutor);

            return highExecutorCap == null
                ? throw new InvalidOperationException("Connected wallet does not own High Executor role.")
                : highExecutorCap.RoleCapId;
        }
    }
}