using Client.Services;
using Common.Roles;

namespace Client.Models
{
    public class AppState
    {
        public WalletType? ConnectedWallet { get; private set; }
        public string? WalletAddress { get; private set; }
        public string? CharacterName { get; private set; }
        public bool IsConnected => ConnectedWallet != null;
        public WalletRoleContext? RoleContext { get; private set; }

        public event Action? OnChange;

        public void SetWallet(WalletType type, string address)
        {
            ConnectedWallet = type;
            WalletAddress = address;
            Notify();
        }

        public void SetCharacterName(string name)
        {
            CharacterName = name;
            Notify();
        }

        public void ClearWallet()
        {
            ConnectedWallet = null;
            WalletAddress = null;
            CharacterName = null;
            Notify();
        }

        public void SetRoleContext(WalletRoleContext context)
        {
            RoleContext = context;
        }

        private void Notify() => OnChange?.Invoke();
    }
}
