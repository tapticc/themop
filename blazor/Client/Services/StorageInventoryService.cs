using Common.Storage;
using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class StorageInventoryService(
        SuiInterop interop,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public Task<StorageInventoriesDetails> GetInventoriesAsync(
            string storageUnitId,
            string characterOwnerCapId)
        {
            return _interop.GetStorageInventoriesAsync(
                storageUnitId,
                characterOwnerCapId,
                _contracts.TheMopPackageId,
                _contracts.WorldPackageId);
        }
    }
}
