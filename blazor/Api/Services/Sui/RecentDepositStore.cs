using Common.Events;

namespace Api.Services.Sui
{
    public class RecentDepositStore
    {
        private readonly Lock _gate = new();
        private readonly Dictionary<string, LinkedList<PlayerDepositEventRow>> _rows = [];

        public void Add(PlayerDepositEventRow row)
        {
            if (string.IsNullOrWhiteSpace(row.CharacterAddress))
                return;

            lock (_gate)
            {
                if (!_rows.TryGetValue(row.CharacterAddress, out var list))
                {
                    list = new LinkedList<PlayerDepositEventRow>();
                    _rows[row.CharacterAddress] = list;
                }

                var exists = list.Any(x => x.Id == row.Id);
                if (exists)
                    return;

                list.AddFirst(row);

                while (list.Count > 3)
                {
                    list.RemoveLast();
                }
            }
        }

        public List<PlayerDepositEventRow> GetRecent(string walletAddress)
        {
            if (string.IsNullOrWhiteSpace(walletAddress))
                return [];

            lock (_gate)
            {
                return _rows.TryGetValue(walletAddress, out var list)
                    ? [.. list]
                    : [];
            }
        }

        public List<PlayerDepositEventRow> GetRecentGlobal(int count = 10)
        {
            lock (_gate)
            {
                return _rows
                    .SelectMany(x => x.Value)
                    .OrderByDescending(x => x.TimestampMs)
                    .Take(count)
                    .ToList();
            }
        }
    }
}
