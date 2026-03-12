using Microsoft.JSInterop;

namespace Client.Services;

public class SuiInterop(IJSRuntime js) : IAsyncDisposable
{
    private readonly Lazy<Task<IJSObjectReference>> _moduleTask = new(() =>
        js.InvokeAsync<IJSObjectReference>("import", "./js/suiInterop.js").AsTask());

    public async Task InitAsync(string network, string rpcUrl)
    {
        var module = await _moduleTask.Value;
        await module.InvokeVoidAsync("init", network, rpcUrl);
    }

    public async Task<string> ConnectSuiAsync()
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<string>("connectSui");
    }

    public async Task<string> FindOwnedObjectIdByTypeAsync(string packageId, string moduleName, string objectName)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<string>(
            "findOwnedObjectIdByType",
            new
            {
                packageId,
                module = moduleName,
                objectName
            });
    }

    public async Task<object> GetSuiBalanceAsync(string owner)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<object>("getSuiBalance", owner);
    }

    public async Task<object> GetOwnedObjectsAsync(string owner)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<object>("getOwnedObjects", owner);
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