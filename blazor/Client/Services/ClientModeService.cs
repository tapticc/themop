using Microsoft.JSInterop;

namespace Client.Services
{
    public class ClientModeService
    {
        private readonly IJSRuntime _jsRuntime;
        private bool? _cachedIsGameClient;

        public ClientModeService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async ValueTask InitializeAsync()
        {
            try
            {
                await _jsRuntime.InvokeVoidAsync("clientMode.init");
                _cachedIsGameClient = await _jsRuntime.InvokeAsync<bool>("clientMode.isGameClient");
            }
            catch
            {
                _cachedIsGameClient = false;
            }
        }

        public async ValueTask<bool> IsGameClientAsync(bool forceRefresh = false)
        {
            if (!forceRefresh && _cachedIsGameClient.HasValue)
            {
                return _cachedIsGameClient.Value;
            }

            try
            {
                if (forceRefresh)
                {
                    await _jsRuntime.InvokeAsync<object>("clientMode.refresh");
                }
                else
                {
                    await _jsRuntime.InvokeVoidAsync("clientMode.init");
                }

                _cachedIsGameClient = await _jsRuntime.InvokeAsync<bool>("clientMode.isGameClient");
                return _cachedIsGameClient.Value;
            }
            catch
            {
                _cachedIsGameClient = false;
                return false;
            }
        }

        public async ValueTask<ClientModeInfo> DetectAsync()
        {
            try
            {
                return await _jsRuntime.InvokeAsync<ClientModeInfo>("clientMode.detect")
                       ?? new ClientModeInfo();
            }
            catch
            {
                return new ClientModeInfo();
            }
        }
    }

    public class ClientModeInfo
    {
        public bool IsGameClient { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public bool IsPortrait { get; set; }
        public bool IsNarrow { get; set; }
        public double Ratio { get; set; }
    }
}
