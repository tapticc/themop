namespace Client.Services
{
    public interface IWalletService
    {
        WalletType WalletType { get; }
        Task<string> ConnectAsync();
        Task DisconnectAsync();
    }
}
