namespace Api.Services.Sui
{
    public class CharacterNameIndex
    {
        private readonly object _gate = new();
#pragma warning disable IDE0028 // Simplify collection initialization
        private readonly Dictionary<string, CharacterNameRecord> _byWallet = new(StringComparer.OrdinalIgnoreCase);
#pragma warning restore IDE0028 // Simplify collection initialization

        public void Upsert(string walletAddress, string characterId, string characterName)
        {
            if (string.IsNullOrWhiteSpace(walletAddress))
                return;

            lock (_gate)
            {
                _byWallet[walletAddress] = new CharacterNameRecord
                {
                    WalletAddress = walletAddress,
                    CharacterId = characterId,
                    CharacterName = characterName
                };
            }
        }

        public bool TryGet(string walletAddress, out CharacterNameRecord record)
        {
            lock (_gate)
            {
                return _byWallet.TryGetValue(walletAddress, out record!);
            }
        }

        public class CharacterNameRecord
        {
            public string WalletAddress { get; set; } = string.Empty;
            public string CharacterId { get; set; } = string.Empty;
            public string CharacterName { get; set; } = string.Empty;
        }
    }
}
