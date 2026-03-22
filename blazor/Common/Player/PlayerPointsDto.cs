namespace Common.Player
{
    public record PlayerPointsDto(
        string CharacterAddress,
        long CompliancePoints,
        long MinistryPoints
    );
}
