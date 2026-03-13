namespace Api.Services.Sui
{
    public class ExecuteTxRequest
    {
        public string Network { get; set; } = "localnet";
        public string TxBytesBase64 { get; set; } = "";
        public List<string> SignaturesBase64 { get; set; } = new();
    }
}
