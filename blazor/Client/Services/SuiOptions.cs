namespace Client.Services
{
    public class SuiOptions
    {
        public string DefaultNetwork { get; set; } = "localnet";

        public Dictionary<string, string> RpcUrls { get; set; } = [];

        public Dictionary<string, string> GraphQLEndpoints { get; set; } = [];
    }
}
