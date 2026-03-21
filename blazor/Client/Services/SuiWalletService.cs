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

        public async Task<string?> GetCurrentAddressAsync()
        {
            return await _suiInterop.GetCurrentAddressAsync();
        }

        public Task DisconnectAsync()
        {
            return Task.CompletedTask;
        }

        public static Task ResetAsync()
        {
            return Task.CompletedTask;
        }
    }
}
