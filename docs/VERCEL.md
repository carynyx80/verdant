# Vercel deployment

Import https://github.com/carynyx80/verdant. The repository now includes a conventional root Next.js app, root Next.js dependencies and root vercel.json. A new import needs no subdirectory configuration.

## Recommended project settings

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | Leave blank / repository root (`.`) |
| Node.js | 22.x |
| Install Command | Use vercel.json: `npx --yes pnpm@11.25.0 install --frozen-lockfile` |
| Build Command | Use vercel.json: `npm run build` |
| Output Directory | `.next` |

For an existing Vercel project, open Settings → Build and Deployment, clear any old Root Directory override, and remove conflicting custom install/build/output overrides. Then deploy the newest `main` commit with the build cache disabled for the first retry. Vercel's project Root Directory is not changed by a Git push.

The root app reuses the same interface source in apps/web; it does not duplicate the UI implementation. Both root and apps/web builds are supported. If you retain Root Directory `apps/web`, keep “Include source files outside Root Directory” enabled; its own vercel.json remains present. The root layout is recommended because it avoids that additional monorepo setting.

The lockfile pins the install. Both entry points use an ESM Next.js configuration and resolve tracing paths from the actual config location rather than the shell working directory. The root build synchronizes artwork from apps/web/public into public.

## Environment variables

No variables are required to deploy and view the undeployed UI. Empty token data is deliberate until verified contracts and a persistent backend are configured.

Optional public variables, set in Vercel and followed by a redeploy:

- `NEXT_PUBLIC_APP_URL`: frontend HTTPS origin for WalletConnect metadata.
- `NEXT_PUBLIC_API_URL`: external HTTPS Nest API origin, without a trailing slash. Leave unset to use the undeployed same-origin API.
- `NEXT_PUBLIC_BNB_RPC_URL`: browser-safe BNB RPC endpoint; its full URL is public.
- `NEXT_PUBLIC_FACTORY_ADDRESS`: verified, reviewed deployment address; leave unset until deployment is authorized and completed.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: optional WalletConnect ID with the frontend origin allowed.

Do not expose private signing keys, database passwords, admin tokens or LLM credentials through public variables. Locally, the root app reads .env.local; apps/web reads apps/web/.env.local.

## Verify deployment

Visit `/`, `/launch`, `/creator`, `/docs`, `/api/health`, and `/api/tokens`. Unconfigured token lists must be empty, and token deployment must remain unavailable. The Studio artwork should load at `/images/studio-sculpture.png`.

Vercel hosts the frontend and its undeployed fallback API. PostgreSQL, Redis, the real Nest API and the indexing workers still require persistent hosting. This deployment change does not deploy BNB contracts.

## Evidence and limits

See vercel-root-verification.txt for checks executed for this correction. GitHub Actions logs for the previous commit showed ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION for zustand@5.0.16. The workspace now pins the older compatible 5.0.15 release and keeps the 1,440-minute dependency age check enabled. Direct Vercel build logs require account login, so these changes are tested locally; they do not claim a verified Vercel-hosted deployment.

References: https://vercel.com/docs/monorepos and https://vercel.com/docs/project-configuration/vercel-json.
