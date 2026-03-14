using Client.Services;
using Common.Roles;
using Common.Sui;

namespace Client.Models
{
    public class AppState
    {
        public string? WalletAddress { get; private set; }
        public WalletType? ConnectedWallet { get; private set; }

        public CharacterSummary? CharacterSummary { get; private set; }
        public WalletRoleContext? RoleContext { get; private set; }

        public bool IsConnected => ConnectedWallet != null;

        public event Action? OnChange;

        public void SetWallet(WalletType type, string address)
        {
            ConnectedWallet = type;
            WalletAddress = address;
            Notify();
        }

        public void SetCharacterSummary(CharacterSummary? summary)
        {
            CharacterSummary = summary;
            Notify();
        }

        public void SetRoleContext(WalletRoleContext? context)
        {
            RoleContext = context;
            Notify();
        }


        public void Clear()
        {
            WalletAddress = null;
            ConnectedWallet = null;
            CharacterSummary = null;
            RoleContext = null;
            Notify();
        }

        private void Notify() => OnChange?.Invoke();
    }
}
