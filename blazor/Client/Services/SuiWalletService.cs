using Microsoft.JSInterop;

namespace Client.Services
{
    public class SuiWalletService(SuiInterop suiInterop) : IWalletService
    {
        private readonly SuiInterop _suiInterop = suiInterop;

        public WalletType WalletType => WalletType.SuiTestnet;

        public async Task<string> ConnectAsync()
        {
            return await _suiInterop.ConnectSuiAsync();
        }

        public Task DisconnectAsync()
        {
            // optional later if you add a reset/exported TS function
            return Task.CompletedTask;
        }

        /* **when finishing these, will need to use the same pattern as above to add them to the SuiInterop class 
         * and call the appropriate JS functions, then uncomment these methods**
        public Task<object> CreateProjectAsync(string packageId, string name)
        {
            return _js.InvokeAsync<object>(
                "walletInterop.createProjectSui",
                packageId,
                name
            ).AsTask();
        }

        public Task<object> SetStatusAsync(string packageId, string projectId, string adminCapId, byte status)
        {
            return _js.InvokeAsync<object>(
                "walletInterop.setStatusSui",
                packageId,
                projectId,
                adminCapId,
                status
            ).AsTask();
        }
        */

        public Task ResetAsync()
        {
            return Task.CompletedTask;
        }
    }
}
