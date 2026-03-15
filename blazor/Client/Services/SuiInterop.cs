using Common.Roles;
using Microsoft.JSInterop;

namespace Client.Services;

public class SuiInterop(IJSRuntime js) : IAsyncDisposable
{
    private readonly Lazy<Task<IJSObjectReference>> _moduleTask = new(() =>
        js.InvokeAsync<IJSObjectReference>("import", "./js/suiInterop.js").AsTask());

    public async Task InitAsync(string network, string rpcUrl, string preferredWallet, string apiBaseUrl)
    {
        var module = await _moduleTask.Value;
        await module.InvokeVoidAsync("init", network, rpcUrl, preferredWallet, apiBaseUrl);
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


    // -------------------- Move method calls (via API) --------------------

    // CONFIG

    public async Task<object> SetResourceConfigAsync(object args)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<object>("setResourceConfig", args);
    }

    public async Task<object> SetComplianceConfigAsync(object args)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<object>("setComplianceConfig", args);
    }

    public async Task<object> SetGateCostConfigAsync(object args)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<object>("setGateCostConfig", args);
    }

    public async Task<object> SetFullItemConfigAsync(object args)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<object>("setFullItemConfig", args);
    }


    //ROLES

    public async Task<TxResult> GrantRoleAsync(GrantRoleTxRequest request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("grantRole", request);
    }

    public async Task<TxResult> RevokeRoleAsync(RevokeRoleTxRequest request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("revokeRole", request);
    }
}