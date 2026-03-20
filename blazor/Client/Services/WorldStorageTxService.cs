using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class WorldStorageTxService(
        SuiInterop interop,
        IOptions<SuiContractOptions> contracts)
    {
        private readonly SuiInterop _interop = interop;
        private readonly SuiContractOptions _contracts = contracts.Value;

        public Task<TxResult> OnlineAsync(string storageUnitId, string characterId, string networkNodeId, string ownerCapId) =>
            _interop.OnlineStorageUnitAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                storageUnitId,
                characterId,
                networkNodeId,
                energyConfigId = _contracts.EnergyConfigId,
                ownerCapId
            });

        public Task<TxResult> OfflineAsync(string storageUnitId, string characterId, string networkNodeId, string ownerCapId) =>
            _interop.OfflineStorageUnitAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                storageUnitId,
                characterId,
                networkNodeId,
                energyConfigId = _contracts.EnergyConfigId,
                ownerCapId
            });

        public Task<TxResult> SetSmartStorageExtensionAsync(string storageUnitId, string characterId, string ownerCapId) =>
            _interop.AuthorizeSmartStorageExtensionAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                theMopPackageId = _contracts.TheMopPackageId,
                storageUnitId,
                characterId,
                ownerCapId
            });

        public Task<TxResult> SetNameAsync(string storageUnitId, string characterId, string ownerCapId, string name) =>
            _interop.UpdateStorageUnitNameAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                storageUnitId,
                characterId,
                ownerCapId,
                name
            });

        public Task<TxResult> SetDescriptionAsync(string storageUnitId, string characterId, string ownerCapId, string description) =>
            _interop.UpdateStorageUnitDescriptionAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                storageUnitId,
                characterId,
                ownerCapId,
                description
            });

        public Task<TxResult> SetUrlAsync(string storageUnitId, string characterId, string ownerCapId, string url) =>
            _interop.UpdateStorageUnitUrlAsync(new
            {
                worldPackageId = _contracts.WorldPackageId,
                storageUnitId,
                characterId,
                ownerCapId,
                url
            });
    }
}
