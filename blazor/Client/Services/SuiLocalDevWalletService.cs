using Microsoft.JSInterop;

namespace Client.Services
{
    public sealed class SuiLocalDevWalletService : IWalletService
    {
        private readonly IJSRuntime _js;

        public WalletType WalletType => WalletType.SuiTestnet;

        public SuiLocalDevWalletService(IJSRuntime js)
        {
            _js = js;
        }

        public async Task<string> ConnectAsync()
        {
            return await _js.InvokeAsync<string>("walletInterop.connectSuiLocalDev");
        }

        public Task DisconnectAsync()
        {
            return _js.InvokeVoidAsync("walletInterop.resetSuiLocalDev").AsTask();
        }

        public Task<object> CreateProjectAsync(string packageId, string name)
        {
            return _js.InvokeAsync<object>(
                "walletInterop.createProjectSuiLocalDev",
                packageId,
                name
            ).AsTask();
        }

        public Task<object> SetStatusAsync(string packageId, string projectId, string adminCapId, byte status)
        {
            return _js.InvokeAsync<object>(
                "walletInterop.setStatusSuiLocalDev",
                packageId,
                projectId,
                adminCapId,
                status
            ).AsTask();
        }

        public Task ResetAsync()
        {
            return _js.InvokeVoidAsync("walletInterop.resetSuiLocalDev").AsTask();
        }
    }
}
