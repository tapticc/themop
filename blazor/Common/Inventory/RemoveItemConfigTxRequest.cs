namespace Common.Inventory
{
    public class RemoveItemConfigTxRequest
    {
        public string PackageId { get; set; } = string.Empty;
        public string ItemConfigRegistryId { get; set; } = string.Empty;
        public string AdminCapId { get; set; } = string.Empty;

        public ulong ItemId { get; set; }
    }
}
