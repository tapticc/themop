using Api.Services.Models;
using Api.Services.Sui;
using Common.Sui;
using System.Text.Json;

namespace Api.Services.GraphQL
{
    public class SuiGraphQLService(GraphQLClient graphql)
    {
        private readonly GraphQLClient _graphql = graphql;
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public async Task<string?> GetCharacterPackageIdForWalletAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {
            var result = await _graphql.SendAsync<OwnedObjectsQueryResponse>(
                SuiQueries.GetOwnedObjectsWithType,
                new
                {
                    owner = walletAddress
                },
                cancellationToken);

            var node = result.Address?.Objects?.Nodes?
                .FirstOrDefault(x =>
                    string.Equals(
                        x.Contents?.Type?.Repr,
                        null,
                        StringComparison.OrdinalIgnoreCase) == false &&
                    x.Contents!.Type!.Repr!.EndsWith("::character::PlayerProfile", StringComparison.Ordinal));

            var fullType = node?.Contents?.Type?.Repr;
            var packageId = TryGetPackageIdFromType(fullType);

            return packageId;
        }

        public async Task<CharacterSummary?> GetCharacterSummaryForWalletAsync(
            string walletAddress,
            CancellationToken cancellationToken = default)
        {

            var packageId = await GetCharacterPackageIdForWalletAsync(walletAddress, cancellationToken);

            if (string.IsNullOrWhiteSpace(packageId))
                return null;

            var profileType = $"{packageId}::character::PlayerProfile";

            var profileResult = await _graphql.SendAsync<PlayerProfileQueryResponse>(
                SuiQueries.GetPlayerProfile,
                new
                {
                    owner = walletAddress,
                    type = profileType
                },
                cancellationToken);

            var profileNode = profileResult.Objects?.Nodes?.FirstOrDefault();
            if (profileNode?.AsMoveObject?.Contents?.Json is null)
                return null;

            var profile = Deserialize<PlayerProfileData>(profileNode.AsMoveObject.Contents.Json.Value);
            if (profile is null || string.IsNullOrWhiteSpace(profile.CharacterId))
                return null;

            var characterResult = await _graphql.SendAsync<CharacterQueryResponse>(
                SuiQueries.GetCharacter,
                new { id = profile.CharacterId },
                cancellationToken);

            var characterNode = characterResult.Object;
            if (characterNode?.AsMoveObject?.Contents?.Json is null)
                return null;

            var character = Deserialize<CharacterData>(characterNode.AsMoveObject.Contents.Json.Value);
            if (character is null)
                return null;

            return new CharacterSummary
            {
                PlayerProfileId = profileNode.Address,
                CharacterId = characterNode.Address,
                CharacterName = character.Metadata?.Name,
                OwnerCapId = character.OwnerCapId
            };
        }

        public static string? TryGetPackageIdFromType(string? fullType)
        {
            if (string.IsNullOrWhiteSpace(fullType))
                return null;

            var idx = fullType.IndexOf("::", StringComparison.Ordinal);
            if (idx <= 0)
                return null;

            return fullType[..idx];
        }

        private static T? Deserialize<T>(JsonElement json)
        {
            try
            {
                return json.Deserialize<T>(JsonOptions);
            }
            catch
            {
                return default;
            }
        }
    }
}
