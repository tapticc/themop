using Common.Gates;
using Common.Inventory;
using Common.Roles;
using Common.Storage;
using Microsoft.JSInterop;

namespace Client.Services;

public class SuiInterop(IJSRuntime js) : IAsyncDisposable
{
    private const string JsVersion = "20260324-1";

    private readonly Lazy<Task<IJSObjectReference>> _moduleTask = new(() =>
        js.InvokeAsync<IJSObjectReference>("import", $"/js/suiInterop.js?v={JsVersion}").AsTask());

    public async Task InitAsync(string network, string rpcUrl, string preferredWallet)
    {
        var module = await _moduleTask.Value;
        await module.InvokeVoidAsync("init", network, rpcUrl, preferredWallet);
    }

    public async Task<string> ConnectSuiAsync()
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<string>("connectSui");
    }

    public async Task<string?> GetCurrentAddressAsync()
    {
        var module = await _moduleTask.Value;

        return await module.InvokeAsync<string?>(
            "getCurrentAddress");
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

    //INVENTORY

    public async Task<TxResult> SetItemConfigAsync(SetItemConfigTxRequest request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("setItemConfig", request);
    }

    public async Task<TxResult> RemoveItemConfigAsync(RemoveItemConfigTxRequest request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("removeItemConfig", request);
    }

    //STORAGE UNITS

    public async Task<StorageUnitDetails> GetStorageUnitAsync(string storageUnitId)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<StorageUnitDetails>("getStorageUnit", storageUnitId);
    }

    public async Task<TxResult> OnlineStorageUnitAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("onlineStorageUnit", request);
    }

    public async Task<TxResult> OfflineStorageUnitAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("offlineStorageUnit", request);
    }

    public async Task<TxResult> AuthorizeSmartStorageExtensionAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("authorizeSmartStorageExtension", request);
    }

    public async Task<TxResult> UpdateStorageUnitNameAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("updateStorageUnitName", request);
    }

    public async Task<TxResult> UpdateStorageUnitDescriptionAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("updateStorageUnitDescription", request);
    }

    public async Task<TxResult> UpdateStorageUnitUrlAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("updateStorageUnitUrl", request);
    }

    public async Task<TxResult> ConfigureStorageAssemblyAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("configureStorageAssembly", request);
    }

    public async Task<TxResult> DepositConfiguredItemsToOpenAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("depositConfiguredItemsToOpen", request);
    }

    public async Task<StorageInventoriesDetails> GetStorageInventoriesAsync(
        string storageUnitId,
        string characterOwnerCapId,
        string theMopPackageId,
        string worldPackageId)
    {
        var module = await _moduleTask.Value;

        return await module.InvokeAsync<StorageInventoriesDetails>(
            "getStorageInventories",
            new
            {
                storageUnitId,
                characterOwnerCapId,
                theMopPackageId,
                worldPackageId
            });
    }
    public async Task<TxResult> MoveOpenItemsToMainAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("moveOpenItemsToMain", request);
    }

    ///////////////////////// GATES
    
    public async Task<GateDetails> GetGateAsync(string gateId)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<GateDetails>("getGate", gateId);
    }

    public async Task<TxResult> ConfigureGateAssemblyAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("configureGateAssembly", request);
    }

    public async Task<GatePermitConfigDto> GetGatePermitConfigAsync(string registryId)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<GatePermitConfigDto>(
            "getGatePermitConfig",
            new { registryId });
    }

    public async Task<TxResult> PurchaseJumpPermitAsync(object request)
    {
        var module = await _moduleTask.Value;
        return await module.InvokeAsync<TxResult>("purchaseJumpPermit", request);
    }

}