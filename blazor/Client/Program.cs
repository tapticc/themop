using Client;
using Client.Models;
using Client.Services;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Radzen;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient {
    BaseAddress = new Uri("https://localhost:7150/")
});

builder.Services.AddSingleton<AppState>();

builder.Services.AddScoped<SuiWalletService>();
builder.Services.AddScoped<SuiApiClient>();
builder.Services.Configure<SuiOptions>(builder.Configuration.GetSection("Sui"));
builder.Services.AddSingleton<SuiNetworkService>();
builder.Services.AddScoped<SuiInterop>();

builder.Services.AddRadzenComponents();

await builder.Build().RunAsync();
