namespace Common.Gates
{
    public class GatePermitConfigDto
    {
        public bool Found { get; set; }
        public string? Error { get; set; }

        public long PermitCostCompliancePoints { get; set; }
        public string LinkedPointsRegistryId { get; set; } = string.Empty;
        public string RawJson { get; set; } = string.Empty;
    }
}
