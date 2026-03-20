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

        public Task ResetAsync()
        {
            return Task.CompletedTask;
        }
    }
}
