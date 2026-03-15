namespace Common.Roles
{
    public class GrantRoleTxRequest
    {
        public string PackageId { get; set; } = string.Empty;
        public string RoleRegistryId { get; set; } = string.Empty;
        public string HighExecutorRoleCapId { get; set; } = string.Empty;
        public byte RoleId { get; set; }
        public string Grantee { get; set; } = string.Empty;
    }
}

