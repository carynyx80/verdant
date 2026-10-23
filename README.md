# Verdant

Programmable creator-fee launchpad for BNB Chain. **Unaudited development release; not mainnet ready.** No mainnet transactions, deployments, statistics or revenue are fabricated.

## Run
Node 22 LTS, pnpm 11.25.0:

```sh
pnpm install
pnpm db:generate
pnpm dev
# separate terminals, after environment configuration:
pnpm api
pnpm worker
```

For Vercel, import this repository with Root Directory left blank (`.`); [full deployment settings](docs/VERCEL.md). No credentials are needed to deploy the undeployed UI.

Web: http://localhost:3000. API: http://localhost:3001. The frontend intentionally works without backend credentials, showing explicit undeployed/empty states. Copy public configuration to root `.env.local` (or `apps/web/.env.local` if using the optional subdirectory entry point). Load server variables through a process manager. See `.env.example` and [deployment runbook](docs/DEPLOYMENT.md).

```sh
pnpm typecheck
pnpm test
pnpm build
forge test --root contracts -vvv
```

## Included
- Responsive Next.js/TypeScript trading application with all requested route paths, wagmi/viem wallet connection, optional WalletConnect, BNB balance, network switching, launch wizard and real-time allocation validation.
- Real contract transaction integrations: launch, curve quote/buy/sell, approval, transaction receipts and creator claim. These are disabled without verified deployment/indexer configuration.
- Fixed-supply BEP-20, factory, constant-product virtual curve, separate creator/protocol fees, isolated immutable allocation accounting and restricted claims.
- Atomic V2 graduation manager with permanent LP custody; approved post-graduation fee route that explicitly permits external venue bypass.
- Candidate oracle-bounded buyback/burn and liquidity vaults, two-reviewer AI expenses, two-of-three product milestone treasury. **Utility modules are not wired to fee escrow.**
- NestJS API, Prisma/PostgreSQL schema and migration, BullMQ/Redis confirmed-block worker, idempotent raw-event indexing, fail-stop deep-reorg handling and server-only LLM task runner with expense records.
- Local EVM tests, mathematical property checks, CI configuration and gated Foundry deployment script.

## Incomplete
This does not complete all requested production milestones. Utility execution integration, production oracle, full analytics/holder/index projections, real DEX fork testing, initial creator purchase, image uploading, production AI billing reconciliation, wallet-authenticated metadata, full protected admin console, notification delivery, automatic reorg rollback and independent audit remain incomplete. Discovery sorting and chart timeframe aggregation are not implemented. Agent pages expose templates, not running agents. Portfolio only reads BNB balance and indexed launches, not all token holdings.

**Utility fee allocations remain escrowed in the current router. Do not fund this deployment candidate.** There is no admin bypass to move those funds. The backend is development scaffolding with executable indexing logic; PostgreSQL/Redis integration has not been run locally.

## Validation and status
See [readiness report](docs/READINESS.md), [security risks](docs/SECURITY.md), and raw `docs/*-test-results.txt`. Unit tests and mock integration checks do not establish mainnet safety. Foundry source is supplied; local forge executable was unavailable. GitHub repository: https://github.com/carynyx80/verdant. See [Vercel setup](docs/VERCEL.md) for frontend import settings. No hosted application or verified contract addresses exist.

## Structure
`apps/web` — interface · `apps/api` — Nest API · `apps/worker` — indexer

`packages/shared` — integer math · `packages/blockchain` — ABIs · `packages/database` — schema/migration · `packages/ai` — task runner

`contracts` — protocol, execution candidates and tests · `infrastructure` — local services · `docs` — review/deployment evidence
