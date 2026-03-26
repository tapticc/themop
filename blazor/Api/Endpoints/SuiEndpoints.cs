using Api.Services.GraphQL;
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

        app.MapGet("/api/sui/player-points",
        async (string characterAddress, long? t, SuiGraphQLService suiGraphQLService, CancellationToken ct) =>
        {
            var result = await suiGraphQLService.GetPlayerPointsAsync(characterAddress, ct);
            return Results.Ok(result);
        });

        app.MapGet("/api/sui/player-profile-points",
        async (string walletAddress, string characterId, string characterName, long totalPoints, long? t, SuiGrpcGateway gw, CancellationToken ct) =>
        {
            var result = await gw.GetPlayerProfilePointsAsync(walletAddress, characterId, characterName, totalPoints);
            return Results.Ok(result);
        });

        app.MapGet("/api/sui/ministry-leaderboard",
        async (SuiGraphQLService suiGraphQLService, SuiGrpcGateway gw, CancellationToken ct) =>
        {
            var result = await suiGraphQLService.GetMinistryLeaderboardAsync(ct);

            return Results.Ok(result);
        });

        app.MapGet("/api/sui/known-characters",
        async (
            int first,
            string? after,
            string? walletAddress,
            string? characterName,
            SuiGraphQLService sui,
            CancellationToken ct) =>
        {
            var result = await sui.GetKnownCharactersPageAsync(first, after, walletAddress, characterName, ct);
            return Results.Ok(result);
        });

        //this was needed for localnet but moved to client grpc
        //app.MapPost("/api/sui/execute", async (ExecuteTxRequest body, SuiGrpcGateway gw) =>
        //{
        //    if (string.IsNullOrWhiteSpace(body.TxBytesBase64))
        //        return Results.BadRequest(new { title = "txBytesBase64 is required.", status = 400 });

        //    if (body.SignaturesBase64 is null || body.SignaturesBase64.Count == 0)
        //        return Results.BadRequest(new { title = "At least one signature is required.", status = 400 });

        //    try
        //    {
        //        var txBytes = Convert.FromBase64String(body.TxBytesBase64);
        //        var sigs = body.SignaturesBase64.Select(Convert.FromBase64String).ToArray();

        //        var resp = await gw.ExecuteSignedTransactionAsync(body.Network, txBytes, sigs);
        //        return Results.Ok(resp);
        //    }
        //    catch (FormatException ex)
        //    {
        //        return Results.BadRequest(new
        //        {
        //            title = "Invalid base64 in request.",
        //            status = 400,
        //            detail = ex.Message
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        return Results.Problem(
        //            title: "Transaction execution failed",
        //            detail: BuildExceptionDetails(ex),
        //            statusCode: 500);
        //    }
        //});

        //static string BuildExceptionDetails(Exception ex)
        //{
        //    var parts = new List<string>();
        //    var current = ex;

        //    while (current is not null)
        //    {
        //        parts.Add($"{current.GetType().Name}: {current.Message}");
        //        current = current.InnerException;
        //    }

        //    return string.Join(" --> ", parts);
        //}
    }
}