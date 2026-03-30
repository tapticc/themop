# Technical Implementation --- Hackathon Submission

## Using Blazor + .NET + Sui Move to Build Eve Frontier Web Extensions

This project demonstrates a production‑style integration combining:

Blazor UI\
.NET backend\
Sui Move contracts\
GraphQL indexing\
gRPC object reads

The goal was to demonstrate real developer patterns, not isolated
examples.

---

## Major Technical Achievements

### Move Contract Design

Implemented:

• Extension authorization patterns • Gate permit purchasing • Points
registry • Role capability NFTs • Upgradeable package structure

Patterns:

• Typed witness extensions • Capability permissions • Dynamic registries
• Event driven design

---

## Hybrid Sui Data Strategy

GraphQL used for:

Dynamic fields\
Player registries\
Leaderboards

gRPC used for:

Object inspection\
Ownership resolution\
Character data\
Inventory inspection

This demonstrates real Sui integration patterns.

---

## Blazor Architecture

Demonstrates:

Wallet login flows\
Route protection\
Permission aware UI\
Embedded game UI constraints\
Infrastructure configuration UX

Why Blazor:

Personal experience and strengths\
Strong typing\
Minimal JS complexity\
Fast iteration\
Clean state handling

---

## Event Driven UX

Implemented:

Deposit event tracking\
Global activity feed\
Character name indexing\
Live score updates

Demonstrates how Move events drive web UX.

---

## Infrastructure UI Patterns

Built UI for:

Storage units\
Smart gates\
Inventories\
Role administration\
Leaderboards

---

## Technical Stack

Frontend:

Blazor WASM Client\
Radzen Components\
CSS Grid UX

Backend:

.NET API\
GraphQL client\
gRPC gateway\
Event watchers

Blockchain:

Sui Move\
Dynamic fields\
Capabilities\
Extension witnesses

---

## Why This Submission Is Interesting

Most blockchain projects show contracts, typically using React as the web tool of choice.

This shows:

Full Blazor + .NET integration
Contracts\
Backend integration\
Web UX\
Game interaction\
Permission models\
Infrastructure design

A complete developer reference example.

Move tests verify on-chain scoring and spend rules\
.NET tests verify permissions, event indexing, and caching/index services\
Together they cover both contract safety and application correctness

---

## Key Takeaway

This project demonstrates how Sui Move + Blazor enables **complete
gameplay systems**, not just smart contracts.
