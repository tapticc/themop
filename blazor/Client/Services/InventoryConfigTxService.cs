using Common.Inventory;
using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class InventoryConfigTxService(
        SuiInterop interop,
        SuiApiClient api,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly SuiApiClient _api = api;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public async Task<TxResult> SetItemConfigAsync(
            ulong itemId,
            string displayName,
            ulong compliancePoints,
            ulong essentialMultiplier,
            bool isEnabled,
            string walletAddress)
        {
            try
            {
                var roleCapId = await GetRoleCapIdAsync(walletAddress);

                var request = new SetItemConfigTxRequest
                {
                    PackageId = _contracts.TheMopPackageId,
                    ItemConfigRegistryId = _contracts.ItemConfigRegistryId,
                    RoleCapId = roleCapId,
                    ItemId = itemId,
                    DisplayName = displayName,
                    CompliancePoints = compliancePoints,
                    EssentialMultiplier = essentialMultiplier,
                    IsEnabled = isEnabled
                };

                return await _interop.SetItemConfigAsync(request);
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

        public async Task<TxResult> RemoveItemConfigAsync(ulong itemId, string walletAddress)
        {
            try
            {
                var adminCapId = await GetRoleCapIdAsync(walletAddress);

                var request = new RemoveItemConfigTxRequest
                {
                    PackageId = _contracts.TheMopPackageId,
                    ItemConfigRegistryId = _contracts.ItemConfigRegistryId,
                    AdminCapId = adminCapId,
                    ItemId = itemId
                };

                return await _interop.RemoveItemConfigAsync(request);
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

        private async Task<string> GetRoleCapIdAsync(string walletAddress)
        {
            var caps = await _api.GetOwnedRoleCapsAsync(walletAddress);

            var cap = caps.FirstOrDefault();

            if (cap is null || string.IsNullOrWhiteSpace(cap.RoleCapId))
                throw new InvalidOperationException("Connected wallet does not own RoleCap.");

            return cap.RoleCapId;
        }
    }
}
