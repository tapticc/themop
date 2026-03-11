using Microsoft.JSInterop;

namespace Client.Services
{
    public class SuiInterop(IJSRuntime js) : IAsyncDisposable
    {
        private readonly Lazy<Task<IJSObjectReference>> _moduleTask = new(() => js.InvokeAsync<IJSObjectReference>(
                "import", "./js/suiInterop.js").AsTask());

        public async Task InitAsync(string network = "localnet")
        {
            var module = await _moduleTask.Value;
            await module.InvokeVoidAsync("init", network);
        }

        public async Task<string> GetSuiBalanceJsonAsync(string owner)
        {
            var module = await _moduleTask.Value;
            // returns whatever your JS returns; JSON string is easiest to start with
            return await module.InvokeAsync<string>("getSuiBalance", owner);
        }

        public async Task<string> GetOwnedObjectsJsonAsync(string owner)
        {
            var module = await _moduleTask.Value;
            return await module.InvokeAsync<string>("getOwnedObjects", owner);
        }

        public async ValueTask DisposeAsync()
        {
            if (_moduleTask.IsValueCreated)
            {
                var module = await _moduleTask.Value;
                await module.DisposeAsync();
            }

            GC.SuppressFinalize(this);
        }
    }
}
