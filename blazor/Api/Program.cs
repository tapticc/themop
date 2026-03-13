using Api.Endpoints;
using Api.Services.GraphQL;
using Api.Services.Sui;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.Configure<SuiOptions>(builder.Configuration.GetSection("Sui"));

builder.Services.AddSingleton<SuiGrpcGateway>();
builder.Services.AddHttpClient<GraphQLClient>();
builder.Services.AddScoped<SuiGraphQLService>();
builder.Services.AddScoped<RoleService>();

builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p =>
        p.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
});

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();
app.MapSuiEndpoints();

app.Run();