# Readiness report

Development snapshot prepared 2026-10-23 (America/Los_Angeles).

## Delivery
- Local application: http://localhost:3000 (production build preview).
- Local API: http://localhost:3001 (unconfigured chain/database mode).
- Git remote configured: https://github.com/carynyx80/verdant. See GitHub for current published commits.
- Hosted application: Vercel has successfully deployed earlier commits. Check the GitHub deployment status for the current commit. Configuration is documented in VERCEL.md.
- BNB contracts: not deployed. No verified addresses.
- Mainnet readiness: **BLOCKED**. Independent audit and several integration milestones outstanding.

## Executed verification
- Next.js production build completed successfully.
- Web and service TypeScript checks passed.
- Prisma client generated; initial PostgreSQL SQL migration generated, not applied.
- Nine shared tests passed: economic property samples, strict financial inputs, discovery sorting/filters, real-time chart ranges, identity validation, canonical metadata and payload-bound signature verification.
- 25 local EVM checks passed, including verified RPC token/trade/fee/holder reads and wrong-network rejection: see `contract-test-results.txt` for completed cases. Utility/DEX integrations use explicit mock contracts.
- Six same-origin API and six Nest API smoke checks passed in undeployed mode.
- All 12 requested route shapes returned HTTP 200 in the production build. This verifies rendering, not completion of every underlying feature.
- Browser: creator connection state, identity validation, 101% allocation guard and agent-specific detail navigation verified.
- Previous published commit passed remote application and Foundry CI. Current local Foundry executable unavailable. Not run: BNB RPC fork, PostgreSQL/Redis end-to-end and replay/race tests, browser wallet signing, independent review.

## Acceptance matrix
| Requirement | Current evidence / gap |
|---|---|
| 1 Wallet connects to BNB | wagmi integration; no real wallet signing test |
| 2 Real token creation | local EVM deployment passed; no BNB deployment |
| 3–4 Strategy and total | immutable weights; invalid allocation contract rejection and browser 101% guard passed |
| 5–8 Buys, sells, fees, allocations | local EVM and integer property tests passed |
| 9 Creator restrictions | unauthorized/double claim tests passed |
| 10–11 Buyback and burn | mock DEX test passed; real oracle and escrow integration absent |
| 12 Liquidity automation | candidate contract; not integration verified |
| 13 AI budgets | expense vault approval tests; off-chain runner supplied, provider/reconciliation integration untested |
| 14 Milestone authorization | two-reviewer payout tests passed |
| 15–16 Graduation and migration | mock V2 checks listed in final test log; real PancakeSwap fork untested |
| 17 Post-graduation fees | candidate approved route; mock test listed in final log; direct DEX trades bypass fees |
| 18 Trading chart | confirmed RPC event prices with real timestamp range filtering; no OHLC candles |
| 19 Fee dashboard | reads live contract credit/balance values when configured; index reconciliation untested |
| 20 All critical invariants | core local checks passed; full fuzz/invariant/adversarial suite incomplete |

## Required external configuration
Reviewed RPC and failover; database; Redis; HTTPS API/web host; reviewed factory/route/manager/router addresses; deployment block; WalletConnect project ID; server LLM credentials/model and explicit pricing; expense reviewer/operator multisigs; audited TWAP oracle; metadata/image storage; admin token; monitoring and backup systems. Deployment signing stays in a hardware wallet or encrypted keystore.

## Release blockers
Read SECURITY.md in full. Most material: unaudited fund-handling contracts; non-integrated utility escrow; graduation price discontinuity and pool griefing; untested production DEX/oracle; untested database-backed metadata/reorg integration and incomplete operational services; no complete database/reorg tests. No mainnet deployment should be authorized until these are resolved and independently verified.
