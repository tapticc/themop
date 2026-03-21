namespace Api.Services.Sui
{
    public class ApiDtos
    {
        public record OwnedObjectDto(string ObjectId, long Version, string ObjectType);

        public record ListOwnedObjectsDto(
            List<OwnedObjectDto> Objects,
            string? NextPageTokenHex
        );

        public record CharacterDto(
            string ObjectId,
            string Type,
            bool IsShared,
            string InitialSharedVersion,
            string CharacterAddress,
            long TribeId,
            string Tenant,
            string ItemId,
            string Name,
            string Description,
            string Url,
            string OwnerCapId
        );

        public class ObjectFieldsDump
        {
            public string? ObjectId { get; set; }
            public string? Type { get; set; }
            public string? OwnerKind { get; set; }  // Shared / AddressOwner / ObjectOwner / Immutable
            public long Version { get; set; }

            // 2-column UI table input
            public List<FieldRow> Fields { get; set; } = [];
        }

        public class FieldRow
        {
            public string? Name { get; set; }
            public string? ValueJson { get; set; } // stringified JSON for nested structs
        }
    }
}
