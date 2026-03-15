namespace Common.Roles
{
    public class RevokeRoleTxRequest
    {
        public string PackageId { get; set; } = string.Empty;
        public string RoleRegistryId { get; set; } = string.Empty;
        public string HighExecutorRoleCapId { get; set; } = string.Empty;
        public string RoleCapId { get; set; } = string.Empty;
    }
}
