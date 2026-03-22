namespace Common.Events
{
    public class PlayerProfilePointsDto
    {
        public string CharacterName { get; set; } = string.Empty;
        public string WalletAddress { get; set; } = string.Empty;
        public string CharacterId { get; set; } = string.Empty;

        public long TotalPoints { get; set; }

        public List<PlayerDepositEventRow> RecentDeposits { get; set; } = [];
        public List<AchievementStampDto> Stamps { get; set; } = [];
    }
}
