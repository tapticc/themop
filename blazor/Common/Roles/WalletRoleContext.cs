namespace Common.Roles
{
    public class WalletRoleContext
    {
        public string WalletAddress { get; set; } = string.Empty;

        public List<WalletRoleCapSummary> Roles { get; set; } = new();

        public List<byte> RoleIds { get; set; } = new();

        public WalletPermissions Permissions { get; set; } = new();
    }
}
