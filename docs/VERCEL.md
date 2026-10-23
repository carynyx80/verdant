# Deploy the frontend on Vercel

Import https://github.com/carynyx80/verdant into Vercel.

| Setting | Value |
|---|---|
| Framework | Next.js |
| Root Directory | `apps/web` |
| Include source files outside Root Directory | Enabled |
| Node.js | 22.x |
| Install Command | `npx --yes pnpm@11.25.0 install --frozen-lockfile` |
| Build Command | `pnpm run build` |
| Output Directory | `.next` |

`apps/web/vercel.json` supplies the install/build/output settings. The repository pins pnpm 11.25.0 and Node 22.x. Keep access to the monorepo's root lockfile and shared `packages/blockchain` sources enabled. Root Directory is a Vercel project setting; it is not set by vercel.json.

No credentials are required to publish the undeployed frontend. It serves honest empty market data through `/api/tokens`; token deployment stays unavailable without a reviewed factory and persistent API. No fake statistics or trades are included.

## Environment variables
Set these in Vercel Project Settings → Environment Variables, then redeploy:

- `NEXT_PUBLIC_APP_URL`: the frontend's HTTPS origin (for WalletConnect metadata).
- `NEXT_PUBLIC_API_URL`: persistent Nest API HTTPS origin, without a trailing slash. Optional for UI-only deployment.
- `NEXT_PUBLIC_BNB_RPC_URL`: browser-safe BNB endpoint. Its URL is public, so do not use a server-only secret.
- `NEXT_PUBLIC_FACTORY_ADDRESS`: independently reviewed and verified launchpad factory. Leave unset until deployment is authorized.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: optional WalletConnect project ID; configure allowed origins there.

Never put database credentials, admin tokens, signing keys, or LLM credentials in NEXT_PUBLIC_* variables. Keep API CORS `WEB_ORIGIN` aligned with the production frontend and any explicitly allowed preview origins.

## Services hosted separately
PostgreSQL, Redis, Nest API and BullMQ workers need persistent infrastructure. Vercel hosts only this Next.js app. Server credential setup and the mainnet security gates remain in DEPLOYMENT.md and SECURITY.md. A successful Vercel deployment does not make the financial protocol production ready.

## Verify after import
Visit `/`, `/launch`, `/docs`, `/portfolio`, and `/api/health`. The launch flow must show the factory-unavailable state when unconfigured. Once an external API is connected, check HTTPS/CORS and inspect confirmed indexed data before enabling transactions.

Official references: https://vercel.com/docs/monorepos and https://vercel.com/docs/project-configuration/vercel-json.
