namespace Api.Services.Sui
{
    public class SuiOptions
    {
        public string DefaultNetwork { get; set; } = "testnet";
        public Dictionary<string, string> RpcUrls { get; set; } = [];
        public Dictionary<string, string> GraphQLEndpoints { get; set; } = [];
        public SuiPackageOptions Packages { get; set; } = new();
    }
}
