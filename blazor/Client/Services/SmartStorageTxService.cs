using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class SmartStorageTxService(
        SuiInterop interop,
        SuiApiClient api,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly SuiApiClient _api = api;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public Task<TxResult> DepositConfiguredItemsToOpenAsync(
            string storageUnitId,
            string characterId,
            string characterOwnerCapId,
            IReadOnlyList<long> itemIds,
            IReadOnlyList<long> quantities)
        {
            return _interop.DepositConfiguredItemsToOpenAsync(new
            {
                theMopPackageId = _contracts.TheMopPackageId,
                worldPackageId = _contracts.WorldPackageId,
                smartStorageRegistryId = _contracts.SmartStorageRegistryId,
                itemConfigRegistryId = _contracts.ItemConfigRegistryId,
                pointsRegistryId = _contracts.PointsRegistryId,
                storageUnitId,
                characterId,
                characterOwnerCapId,
                itemIds = itemIds.Select(x => (ulong)x).ToArray(),
                quantities = quantities.Select(x => (uint)x).ToArray(),
            });
        }

        public async Task<TxResult> MoveOpenItemsToMainAsync(
            string storageUnitId,
            string characterId,
            string walletAddress,
            IReadOnlyList<long> itemIds,
            IReadOnlyList<long> quantities)
        {
            try
            {
                var roleCapId = await GetOpenInventoryManagerRoleCapIdAsync(walletAddress);

                return await _interop.MoveOpenItemsToMainAsync(new
                {
                    theMopPackageId = _contracts.TheMopPackageId,
                    smartStorageRegistryId = _contracts.SmartStorageRegistryId,
                    itemConfigRegistryId = _contracts.ItemConfigRegistryId,
                    roleCapId,
                    storageUnitId,
                    characterId,
                    itemIds = itemIds.Select(x => (long)x).ToArray(),
                    quantities = quantities.Select(x => (uint)x).ToArray(),
                });
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

        private async Task<string> GetOpenInventoryManagerRoleCapIdAsync(string walletAddress)
        {
            var caps = await _api.GetOwnedRoleCapsAsync(walletAddress);

            var cap =
                caps.FirstOrDefault(x => x.RoleId == 1) // High Executor
                ?? caps.FirstOrDefault(x => x.RoleId == 5); // Treasury Officer

            if (cap is null || string.IsNullOrWhiteSpace(cap.RoleCapId))
                throw new InvalidOperationException("Connected wallet does not own a High Executor or Treasury Officer role cap.");

            return cap.RoleCapId;
        }
    }
}
