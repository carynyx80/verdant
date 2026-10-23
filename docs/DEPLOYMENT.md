# Deployment runbook — gated, not executed

## Local development
Use Node 22 LTS and pnpm 11.25.0. `pnpm install`, `pnpm db:generate`, then `pnpm dev` (web), `pnpm api` and `pnpm worker` in separate processes. Scripts do not implicitly read .env; load environment through your service manager or Node's --env-file support. The root Next.js entry point reads .env.local; the optional apps/web entry point reads apps/web/.env.local.

Start PostgreSQL and Redis with `POSTGRES_PASSWORD=... docker compose -f infrastructure/compose.yaml up -d`. Set DATABASE_URL to match. Apply schema with `pnpm exec prisma migrate deploy --schema packages/database/prisma/schema.prisma`. Start worker only with a verified factory and exact deployment block. No private wallet keys are used by the indexer.

## Web hosting
See [Vercel import settings](VERCEL.md) for exact build commands, root directory and public environment variables.
Deploy the repository root to Vercel using the tracked root vercel.json; build `npm run build`, output `.next`. The optional apps/web entry point remains supported. Set public API HTTPS origin, RPC endpoint, reviewed factory address and WalletConnect project ID. The frontend is a standard Next.js application; it has not been converted or published to Sites' Worker runtime.

## Persistent services
Run the Nest API and BullMQ worker on a persistent Node host, never a request-only serverless runtime. API currently binds loopback; expose through an authenticated TLS reverse proxy. Use managed PostgreSQL and Redis with TLS, private networking, backups, connection limits, monitoring and authenticated Redis. The supplied Compose file is for local development only. Production metadata writes still need wallet challenge authentication, quotas and durable image hosting before public exposure.

## Mainnet gates
An independent review must cover every financial contract and the full economic design. Resolve all readiness blockers. Run Foundry fuzz/invariant and fork tests against verified BNB endpoints and exact approved PancakeSwap deployments. Verify chain ID and router bytecode independently. The candidate Foundry script requires an independent review digest, explicit deployment flag, deployed protocol multisig, approved router code hash, and predicted factory address. Those flags are technical guards, not substitutes for human authorization or a real audit.

Compute factory address using deployer nonce + 2; the script deploys manager, route, factory in that order. Rehearse all nonce assumptions on a fork. Use a hardware wallet or encrypted Foundry keystore. Do not pass private keys through chat, CLI arguments or repository files. Simulate the script without --broadcast first. Broadcast only following explicit authorization for the reviewed artifacts. Verify source on BscScan, record ABI/addresses/code hashes/block and pin the same values in API, worker and frontend. Security review and deployment have NOT occurred.

## Reorg response
Indexer waits 20 confirmations and commits events with its cursor atomically. Duplicate logs use chain/transaction/log identity. RPC failures retry with exponential backoff. A confirmed checkpoint hash mismatch pauses the queue and requires operator reconciliation; automatic rollback is not implemented. Before restoring, stop public data serving, compare a second RPC, roll back derived rows after the last trusted block in a transaction, restore checkpoint hash/height, replay, and reconcile every vault against contract state. Full automated recovery and deep-reorg integration tests are release blockers.
