# Extending the Blazor + Sui Data Layer

This guide explains how to add a new dataset (example: Killmail).

## Typical flow

1 Define DTOs in Common

2 Add GraphQL query

3 Add API service method

4 Add API endpoint

5 Add SuiApiClient method

6 Add optional wallet interop

7 Build Razor page

## Key files

Client/wwwroot/suiInterop.ts
Browser wallet interaction and JSON client reads. Rebuild js after edits using: pnpm -C .\Client run build

Client/Services/SuiInterop.cs
Typed wrapper around TypeScript functions.

Api/Services/GraphQL/SuiGraphQLService.cs
GraphQL dataset queries and mapping.

Api/Services/GraphQL/SuiQueries.cs
GraphQL query definitions stored centrally.

Api/Services/Sui/SuiGrpcGateway.cs
Direct object inspection and ownership reads.

Client/Services/SuiApiClient.cs
HTTP bridge between Blazor and API.

Common/
Shared DTOs.

## Choosing data source

GraphQL:
Lists, registries, leaderboards.

gRPC:
Ownership, object truth, inspection.

Interop:
Wallet signing, direct client reads.

## Best practice

Keep:
DTOs shared
API clean
UI simple
Interop minimal

## Takeaway

Follow the same pattern used for storage units and gates to add any new gameplay dataset.
