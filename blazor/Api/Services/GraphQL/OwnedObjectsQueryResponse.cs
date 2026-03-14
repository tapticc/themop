using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class OwnedObjectsQueryResponse
    {
        public AddressNode? Address { get; set; }
    }
}
