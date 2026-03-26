# The Ministry of Passage

The Ministry of Passage is a full-stack Eve Frontier extension project built on **Sui Move**, **Blazor**, and a hybrid **GraphQL + gRPC** integration layer.

At a high level, the project demonstrates how on-chain game infrastructure can be extended beyond simple ownership and asset transfer into something closer to a functioning player institution. In this case, that institution is the Ministry of Passage: a fictional organization responsible for regulated storage, controlled travel, contribution tracking, permit issuance, and role-based authority.

## Technical stack

Frontend:

- Blazor Server
- Radzen components
- Permission-aware navigation

Backend:

- .NET API
- GraphQL integration
- gRPC gateway
- Event watchers

Blockchain:

- Sui Move
- Dynamic fields
- Capability permissions
- Extension witnesses

## Architecture

Game Client → Blazor UI → .NET API → GraphQL + gRPC → Sui Move

## Documentation

See:

- docs/MinistryOfPassage.md
- docs/TechnicalImplementation.md
- docs/WhyThisIsInteresting.md
- docs/ExtendingBlazorDataSets.md

## Final takeaway

The Ministry of Passage demonstrates how Sui Move can power **programmable gameplay infrastructure** and how Blazor can turn that infrastructure into a coherent player-facing experience.
