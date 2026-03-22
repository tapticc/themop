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

        public const string GetKnownCharactersPage = """
        query GetKnownCharactersPage($type: String!, $first: Int!, $after: String) {
          objects(first: $first, after: $after, filter: { type: $type }) {
            pageInfo {
              hasNextPage
              endCursor
            }
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

        public const string GetItemConfigs = """
        query GetItemConfigs($registry: SuiAddress!) {
          object(address: $registry) {
            dynamicFields(first: 50) {
              nodes {
                name {
                  json
                }
                value {
                  __typename
                  ... on MoveValue {
                    json
                  }
                }
              }
            }
          }
        }
        """;

        public const string GetPlayerPoints = """
        query GetPlayerPoints($registry: SuiAddress!) {
          object(address: $registry) {
            dynamicFields(first: 50) {
              nodes {
                name {
                  type {
                    repr
                  }
                  json
                }
                value {
                  __typename
                  ... on MoveValue {
                    json
                  }
                }
              }
            }
          }
        }
        """;

    }
}
