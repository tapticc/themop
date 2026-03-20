using Common.Storage;

namespace Client.Services
{
    public class WorldStorageService(SuiInterop interop)
    {
        private readonly SuiInterop _interop = interop;

        public Task<StorageUnitDetails> GetStorageUnitAsync(string storageUnitId)
        {
            return _interop.GetStorageUnitAsync(storageUnitId);
        }
    }
}
