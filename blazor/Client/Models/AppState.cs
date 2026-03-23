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
        public bool AuthResolved { get; set; }

        public string? CurrentAssemblyAddress { get; set; }
        public string? ReturnUrl { get; set; }

        public void SetAssembly(string assembly)
        {
            CurrentAssemblyAddress = assembly;
            OnChange?.Invoke();
        }

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


        public void ResetSession()
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
