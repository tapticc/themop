namespace Common.Roles
{
    public class WalletRoleCapSummary
    {
        public string RoleCapId { get; set; } = string.Empty;
        public byte RoleId { get; set; }
        public string? GrantedBy { get; set; }
        public string? RoleName { get; set; }
    }
}
