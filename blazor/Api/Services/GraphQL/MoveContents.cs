using System.Text.Json;
using System.Text.Json.Serialization;

namespace Api.Services.GraphQL
{
    public class MoveContents
    {
        public MoveTypeRef? Type { get; set; }
        public JsonElement? Json { get; set; }
    }
}
