using Common.Roles;
using Xunit;

namespace Common.Tests
{
    public class RolePermissionsTests
    {
        [Fact]
        public void HighExecutor_Should_Have_AdminCapabilities()
        {
            var roles = new List<byte> { RoleIds.HighExecutor };

            Assert.True(RolePermissions.IsHighExecutor(roles));
            Assert.True(RolePermissions.CanAssignRoles(roles));
            Assert.True(RolePermissions.CanRevokeRoles(roles));
            Assert.True(RolePermissions.ShowAdminPanel(roles));
        }

        [Fact]
        public void Citizen_Should_Not_Have_AdminCapabilities()
        {
            var roles = new List<byte> { RoleIds.RegisteredCitizen };

            Assert.True(RolePermissions.IsRegisteredCitizen(roles));
            Assert.False(RolePermissions.CanAssignRoles(roles));
            Assert.False(RolePermissions.ShowAdminPanel(roles));
        }

        [Fact]
        public void LogisticsRole_Should_Enable_LogisticsPermissions()
        {
            var roles = new List<byte> { RoleIds.LogisticsOperative };

            Assert.True(RolePermissions.CanManageLogistics(roles));
            Assert.True(RolePermissions.ShowLogisticsPanel(roles));
            Assert.False(RolePermissions.CanManageTreasury(roles));
        }
    }
}
