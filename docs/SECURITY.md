# Security boundaries and outstanding risks

This source is an unaudited development implementation. No contracts have been deployed or verified on BNB mainnet. Do not fund it.

## Implemented boundaries
- Fixed supply, no owner mint or token admin.
- Integer output rounding, real reserve accounting, deadlines and minimum received.
- Curve and withdrawal reentrancy locks; checks/effects before external payout.
- Immutable fee weights and payout wallet; unique token accounting; no admin sweep.
- Protocol fees distinct from creator fees.
- Exact graduation token movement, permanently held LP, immutable DEX address.
- Milestone payouts require two distinct reviewers. Reviewers are a trust boundary; one reviewer can veto via rejection.
- Optional routed post-graduation fees only apply on that route. All external venue trades can bypass them.
- Candidate buyback/liquidity engines bound amount, deadline, oracle freshness and minimum output. Oracle quality/manipulation resistance is not solved by an interface.
- AI operational payouts require matching evidence hash and two reviewer approvals. Receipt hashes prove submitted evidence, not truth of the expenditure.

## Blocking issues
1. Independent contract security and economic review absent.
2. No BNB fork tests, real DEX migration tests, malicious DEX/token tests, MEV simulation or long-running invariant harness.
3. Graduation starting-price discontinuity needs quantitative design review. A seeded external pool can block migration. Creator can launch with no working adapter, stranding graduation; deployment validation must prevent this.
4. Utility escrow cannot currently release funds into candidate utility modules. There is deliberately no arbitrary admin withdrawal path. Candidate modules are not factory-integrated and should not be advertised as automated live utilities.
5. The frontend supports ApprovedFeeRoute when a verified route and DEX quote are available. Its route-bound fees are not enforced by external pools. No audited Infinity hook is implemented.
6. No production TWAP oracle implementation or tested liquidity impact cap. No keeper utility scheduling or execution reconciliation.
7. AI price reservation is not a provider-enforced spending cap. Unknown provider outcomes remain held for reconciliation; automatic retry must never bill twice. Price configuration and a conservative input/output reservation are checked before any provider call; provider-side billing limits and failure reconciliation remain required. Do not activate until billing reconciliation is tested.
8. Database and Redis integration untested here; migration generated but not applied. Events feed only launches and trades plus raw fee/graduation logs; derived utility projections are schema scaffolding.
9. Metadata writes now require payload-bound, expiring single-use EOA signatures and request size/rate limits. PostgreSQL-backed replay/race tests, shared edge quotas, moderation, canonical persistent hosting and image upload storage remain necessary. No external metadata URLs are fetched by server.
10. Administrative UI exposes authenticated read-only health, not a complete operations console. No wallet-signed admin sessions or multisig transaction UI.
11. Discovery sorting/filters, observed holder balances, timestamp-based chart ranges, creator claims and portfolio reads are implemented. Data is bounded to visible launches and observed blocks; charts are trade-price lines, not OHLC candles. Full-history analytics remain outstanding.
12. Indexer performs factory-scoped rollback to retained canonical checkpoints, with transactional cursor locking. Deep reorgs with no retained ancestor pause for manual reconciliation. PostgreSQL-backed replay/race tests remain outstanding. Read-only discovery uses confirmed RPC state; indexed trade history checks cursor canonicality and freshness.
13. Dependency vulnerability audit and dependency pinning/updates must pass before production. CI has run remotely; Foundry is unavailable locally. Check current GitHub checks for the exact published commit.
14. No notifications provider, production observability pipeline, backup restore rehearsal or incident response drill.

## Administrative trust
Protocol treasury receives only its own accrued fees. Immutable route/DEX/oracle contracts can affect execution behavior and must be reviewed by bytecode before deployment. Product/AI reviewers can approve disbursements within their dedicated vault balances; they have no access to creator revenue or other tokens' credits. No upgradeability is implemented. Permanently held LP cannot be rescued or recovered; users must understand this irreversibility.

## Post-graduation mechanism research
PancakeSwap's ordinary pool fees accrue under the pool's own LP/protocol rules; they do not create this configurable creator fee. Infinity supports hooks, but hook deployment and fee semantics require separate integration and audit. The implemented candidate approved route charges an explicit BNB fee only on transactions it processes. Protocol-owned V2 LP is permanently held, so LP fee growth is not a liquid creator-fee revenue stream.

Sources inspected on 2026-10-22:
- https://docs.pancakeswap.finance/trade/pancakeswap-exchange/trade
- https://developer.pancakeswap.finance/contracts/infinity/overview
- https://docs.pancakeswap.finance/trade/pancakeswap-infinity/hooks
