using Microsoft.Extensions.Options;

namespace Client.Services
{
    public class SuiNetwork
    {
        public string Network { get; set; } = "";
        public string RpcUrl { get; set; } = "";
        public string GraphQLEndpoint { get; set; } = "";
    }

    public record SuiNetworkConfig(SuiNetwork Network, string RpcUrl);

    public class SuiNetworkService
    {
        private readonly SuiOptions _options;

        public SuiNetworkService(IOptions<SuiOptions> options)
        {
            _options = options.Value;
            SetNetwork(_options.DefaultNetwork);
        }

        public SuiNetwork Current { get; private set; } = default!;

        public event Action? OnChanged;

        public void SetNetwork(string network)
        {
            Current = new SuiNetwork
            {
                Network = network,
                RpcUrl = _options.RpcUrls[network],
                GraphQLEndpoint = _options.GraphQLEndpoints[network]
            };

            OnChanged?.Invoke();
        }

        public string NetworkString => Current.Network.ToString().ToLower();
        public string NetworkKey => Current.Network.ToString().ToLowerInvariant();
    }
}
