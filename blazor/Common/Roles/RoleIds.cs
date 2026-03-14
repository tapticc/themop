namespace Common.Roles
{
    public static class RoleIds
    {
        public const byte HighExecutor = 1;

        public const byte ComplianceOfficer = 2;

        public const byte LogisticsOperative = 3;

        public const byte ReconOperative = 4;

        public const byte TreasuryOfficer = 5;

        public const byte RegisteredCitizen = 6;

        public static readonly IReadOnlyDictionary<byte, string> Names =
            new Dictionary<byte, string>
            {
            { HighExecutor, "High Executor" },
            { ComplianceOfficer, "Compliance Officer" },
            { LogisticsOperative, "Logistics Operative" },
            { ReconOperative, "Recon Operative" },
            { TreasuryOfficer, "Treasury Officer" },
            { RegisteredCitizen, "Registered Citizen" }
            };

        public static string GetName(byte roleId)
        {
            return Names.TryGetValue(roleId, out var name)
                ? name
                : $"Unknown ({roleId})";
        }

        public static bool IsAdminRole(byte roleId)
        {
            return roleId == HighExecutor;
        }

        public static bool IsWorkerRole(byte roleId)
        {
            return roleId == RegisteredCitizen;
        }

        public static bool CanAssignRoles(byte roleId)
        {
            return roleId == HighExecutor;
        }

        public static bool CanManageTreasury(byte roleId)
        {
            return roleId == HighExecutor ||
                   roleId == TreasuryOfficer;
        }

        public static bool CanManageLogistics(byte roleId)
        {
            return roleId == HighExecutor ||
                   roleId == LogisticsOperative;
        }

        public static bool CanRecon(byte roleId)
        {
            return roleId == HighExecutor ||
                   roleId == ReconOperative;
        }

        public static readonly byte[] All =
        {
            HighExecutor,
            ComplianceOfficer,
            LogisticsOperative,
            ReconOperative,
            TreasuryOfficer,
            RegisteredCitizen
        };
    }
}
