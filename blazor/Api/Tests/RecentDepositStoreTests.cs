using Api.Services.Sui;
using Common.Events;
using Xunit;

namespace Api.Tests
{

    public class RecentDepositStoreTests
    {
        [Fact]
        public void Add_Should_Keep_Only_Last_Three_Per_Wallet()
        {
            var store = new RecentDepositStore();

            store.Add(new PlayerDepositEventRow { Id = "1", CharacterAddress = "0xabc", TimestampMs = "1000" });
            store.Add(new PlayerDepositEventRow { Id = "2", CharacterAddress = "0xabc", TimestampMs = "2000" });
            store.Add(new PlayerDepositEventRow { Id = "3", CharacterAddress = "0xabc", TimestampMs = "3000" });
            store.Add(new PlayerDepositEventRow { Id = "4", CharacterAddress = "0xabc", TimestampMs = "4000" });

            var items = store.GetRecent("0xabc");

            Assert.Equal(3, items.Count);
            Assert.Equal("4", items[0].Id);
            Assert.Equal("3", items[1].Id);
            Assert.Equal("2", items[2].Id);
        }

        [Fact]
        public void Add_Should_Not_Duplicate_Same_Event()
        {
            var store = new RecentDepositStore();

            var row = new PlayerDepositEventRow
            {
                Id = "evt-1",
                CharacterAddress = "0xabc",
                TimestampMs = "1000"
            };

            store.Add(row);
            store.Add(row);

            var items = store.GetRecent("0xabc");

            Assert.Single(items);
        }

        [Fact]
        public void GetRecentGlobal_Should_Return_MostRecent_Across_Wallets()
        {
            var store = new RecentDepositStore();

            store.Add(new PlayerDepositEventRow { Id = "1", CharacterAddress = "0xaaa", TimestampMs = "1000" });
            store.Add(new PlayerDepositEventRow { Id = "2", CharacterAddress = "0xbbb", TimestampMs = "3000" });
            store.Add(new PlayerDepositEventRow { Id = "3", CharacterAddress = "0xccc", TimestampMs = "2000" });

            var items = store.GetRecentGlobal(3);

            Assert.Equal(3, items.Count);
            Assert.Equal("2", items[0].Id);
            Assert.Equal("3", items[1].Id);
            Assert.Equal("1", items[2].Id);
        }
    }
}
