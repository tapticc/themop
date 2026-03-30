using Api.Services.Sui;
using Xunit;

namespace Api.Tests
{
    public class CharacterNameIndexTests
    {
        [Fact]
        public void Upsert_Should_Store_And_Return_Character()
        {
            var index = new CharacterNameIndex();

            index.Upsert(
                "0xabc",
                "0xchar1",
                "SirTapticc");

            var found = index.TryGet("0xabc", out var record);

            Assert.True(found);
            Assert.NotNull(record);
            Assert.Equal("0xabc", record.WalletAddress);
            Assert.Equal("0xchar1", record.CharacterId);
            Assert.Equal("SirTapticc", record.CharacterName);
        }

        [Fact]
        public void Upsert_Should_Overwrite_Existing_Record()
        {
            var index = new CharacterNameIndex();

            index.Upsert("0xabc", "0xchar1", "OldName");
            index.Upsert("0xabc", "0xchar2", "NewName");

            var found = index.TryGet("0xabc", out var record);

            Assert.True(found);
            Assert.Equal("0xchar2", record.CharacterId);
            Assert.Equal("NewName", record.CharacterName);
        }

        [Fact]
        public void TryGet_Should_Return_False_When_NotFound()
        {
            var index = new CharacterNameIndex();

            var found = index.TryGet("0xmissing", out var record);

            Assert.False(found);
            Assert.Null(record);
        }
    }
}
