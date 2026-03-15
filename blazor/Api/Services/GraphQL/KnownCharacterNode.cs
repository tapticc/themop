namespace Api.Services.GraphQL
{
    public class KnownCharacterNode
    {
        public string Address { get; set; } = string.Empty;
        public OwnerAddressNode? Owner { get; set; }
        public MoveObject? AsMoveObject { get; set; }
    }
}
