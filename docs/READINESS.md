# Readiness report

Development snapshot prepared 2026-10-22 (America/Los_Angeles).

## Delivery
- Local application: http://localhost:3000 (production build preview).
- Local API: http://localhost:3001 (unconfigured chain/database mode).
- Git: local repository; no remote supplied, no GitHub push.
- Hosted application: not deployed. Standard Next.js/Vercel configuration prepared.
- BNB contracts: not deployed. No verified addresses.
- Mainnet readiness: **BLOCKED**. Independent audit and several integration milestones outstanding.

## Executed verification
- Next.js production build completed successfully.
- Web and service TypeScript checks passed.
- Prisma client generated; initial PostgreSQL SQL migration generated, not applied.
- Three math property tests: 10,000 allocation conservation samples and 1,000 curve invariant samples.
- 22 local EVM contract checks passed: see `contract-test-results.txt` for completed cases. Utility/DEX integrations use explicit mock contracts.
- Five API smoke checks passed in undeployed mode.
- All 12 requested route shapes returned HTTP 200 in the production build. This verifies rendering, not completion of every underlying feature.
- Browser: homepage visually reviewed; token identity step advances; allocation 101% disables review; restored homepage for handoff.
- Not run: Foundry executable unavailable; BNB RPC fork, PostgreSQL/Redis end-to-end, browser wallet signing, independent review, remote CI.

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
| 18 Trading chart | line renders confirmed event reserve prices; no live chain data or timeframe OHLC |
| 19 Fee dashboard | reads live contract credit/balance values when configured; index reconciliation untested |
| 20 All critical invariants | core local checks passed; full fuzz/invariant/adversarial suite incomplete |

## Required external configuration
Reviewed RPC and failover; database; Redis; HTTPS API/web host; reviewed factory/route/manager/router addresses; deployment block; WalletConnect project ID; server LLM credentials/model and explicit pricing; expense reviewer/operator multisigs; audited TWAP oracle; metadata/image storage; admin token; monitoring and backup systems. Deployment signing stays in a hardware wallet or encrypted keystore.

## Release blockers
Read SECURITY.md in full. Most material: unaudited fund-handling contracts; non-integrated utility escrow; graduation price discontinuity and pool griefing; untested production DEX/oracle; incomplete metadata authentication and operational/admin services; no complete database/reorg tests. No mainnet deployment should be authorized until these are resolved and independently verified.
