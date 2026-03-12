namespace Api.Services.GraphQL
{
    public static class SuiQueries
    {
        public const string GetPlayerProfile = """
        query GetPlayerProfile($owner: SuiAddress!, $type: String!) {
          objects(
            first: 1
            filter: {
              ownerKind: ADDRESS
              owner: $owner
              type: $type
            }
          ) {
            nodes {
              address
              asMoveObject {
                contents {
                  json
                }
              }
            }
          }
        }
        """;

        public const string GetCharacter = """
        query GetCharacter($id: SuiAddress!) {
          object(address: $id) {
            address
            asMoveObject {
              contents {
                json
              }
            }
          }
        }
        """;

        public const string GetOwnedObjectsWithType = """       
        query GetOwnedObjectsWithType($owner: SuiAddress!) {
          address(address: $owner) {
            objects(first: 50) {
              nodes {
                address
                contents {
                  type {
                    repr
                  }
                  json
                }
              }
            }
          }
        }
        """;

    }
}
