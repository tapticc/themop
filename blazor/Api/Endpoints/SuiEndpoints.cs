using Api.Services.Sui;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class SuiEndpoints
{
    public static void MapSuiEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/sui/balance", async (string owner, string network, SuiGrpcGateway gw) =>
        {
            try
            {
                var resp = await gw.GetBalanceAsync(owner, network);
                return Results.Ok(resp);
            }
            catch (Exception)
            {
                return Results.BadRequest(new ProblemDetails
                {
                    Title = "An error occurred while fetching the balance",
                    Status = 400
                });
            }
        });

        app.MapGet("/api/sui/character", async (string owner, string network, SuiGrpcGateway gw) =>
        {
            try
            {
                var resp = await gw.GetCharacterAsync(owner, network);
                return Results.Ok(resp);
            }
            catch (Exception)
            {
                return Results.BadRequest(new ProblemDetails
                {
                    Title = "An error occurred while fetching the character data",
                    Status = 400
                });
            }
        });

        app.MapPost("/api/sui/execute", async (ExecuteTxRequest body, SuiGrpcGateway gw) =>
        {
            if (string.IsNullOrWhiteSpace(body.TxBytesBase64))
                return Results.BadRequest(new { title = "txBytesBase64 is required.", status = 400 });

            if (body.SignaturesBase64 is null || body.SignaturesBase64.Count == 0)
                return Results.BadRequest(new { title = "At least one signature is required.", status = 400 });

            try
            {
                var txBytes = Convert.FromBase64String(body.TxBytesBase64);
                var sigs = body.SignaturesBase64.Select(Convert.FromBase64String).ToArray();

                var resp = await gw.ExecuteSignedTransactionAsync(body.Network, txBytes, sigs);
                return Results.Ok(resp);
            }
            catch (FormatException)
            {
                return Results.BadRequest(new { title = "Invalid base64 in request.", status = 400 });
            }
            catch (Exception ex)
            {
                return Results.Problem($"An error occurred while executing the transaction: {ex.Message}");
            }
        });
    }
}