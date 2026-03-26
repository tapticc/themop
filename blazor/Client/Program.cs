using Client;
using Client.Models;
using Client.Services;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Radzen;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var baseUrl = config["ApiSettings:BaseUrl"];

    return new HttpClient
    {
        BaseAddress = new Uri(baseUrl ?? "https://localhost:7150/")
    };
});

builder.Services.AddSingleton<AppState>();
builder.Services.AddSingleton<SuiNetworkService>();

builder.Services.Configure<SuiOptions>(builder.Configuration.GetSection("Sui"));
builder.Services.Configure<SuiContractOptions>(builder.Configuration.GetSection("Sui:SuiContracts"));

builder.Services.AddScoped<ClientModeService>();
builder.Services.AddScoped<GateService>();
builder.Services.AddScoped<GateTxService>();
builder.Services.AddScoped<InventoryConfigTxService>();
builder.Services.AddScoped<RoleTxService>();
builder.Services.AddScoped<StorageInventoryService>();
builder.Services.AddScoped<SmartStorageTxService>();
builder.Services.AddScoped<WorldStorageService>();
builder.Services.AddScoped<WorldStorageTxService>();

builder.Services.AddScoped<SuiWalletService>();
builder.Services.AddScoped<SuiApiClient>();
builder.Services.AddScoped<SuiInterop>();

builder.Services.AddRadzenComponents();

await builder.Build().RunAsync();
