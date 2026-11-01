# Sabily Noor Compute — architecture & safety contract

## Product principle
Noor Compute is an optional public-benefit compute pool. Worship remains free, private and spiritually independent. Dhikr counts, prayer logs, Qur'an reading, fasting and other acts of worship MUST NOT generate compute credits, Noor points, money or token balances. A user may use Tasbih while separately opting into compute, but the two data streams must never be joined.

## Hybrid architecture
1. **Worship layer** — existing Tasbih and worship journal. No compute SDK, wallet or reward hooks in these flows.
2. **Consent & device policy** — `sabily_compute_preferences`: explicit opt-in, off by default, capped CPU (5–30%), Wi-Fi-only and charging-only defaults, background disabled by default. Consent is revocable immediately.
3. **Workload registry** — `sabily_compute_jobs`: only admin-reviewed public-benefit workloads can be approved. Each job must publish purpose, sponsor, methodology, resource profile, data handling, reward formula and independent verification method.
4. **Execution agent** — future installable/PWA-compatible worker, sandboxed and capability-limited. It requests signed, bounded tasks; never downloads arbitrary executable code; never runs during calls, low battery, thermal throttling, metered network, or when the user disables it. Browser tabs cannot guarantee durable background compute, so no background mode is promised in this MVP.
5. **Verification service** — server-side verifier validates signed task IDs, nonces, output hashes, duplicate submissions, resource caps and anti-Sybil controls. Client-submitted work units are never trusted.
6. **Reward ledger** — append-only `sabily_compute_reward_ledger` stores verified units, calculation version, unique verification reference and points. Service-role only writes; user can read their own rows. No client minting, editing or deleting.
7. **Noor wallet** — aggregate compute rewards as a separately labelled source; Noor points remain off-chain, non-transferable and non-cash until governance, financial/legal review and audited redemption rails exist.
8. **Optional future token** — separate opt-in product phase only after legal analysis in Morocco and every target jurisdiction, AML/KYC assessment where applicable, tax treatment, custody design, smart-contract audit, disclosures and user-consent review. No token issuance or mining pool is enabled by this migration.

## Reward formula
Use a published versioned formula based on *verified useful work*, not elapsed time or worship activity:
`points = floor(verified_units / 1000 * published_rate)`.
The workload sponsor funds the reward pool before a campaign starts. Display sponsor funding, total units, verification rate, points issued, rejected work, fees and remaining pool. Never promise a fiat exchange rate or guaranteed income. Publish a cap per account/day and per campaign.

## Safety requirements before any workload goes live
- Explicit opt-in, plain-language consent, easy pause/withdraw and a visible active indicator.
- Device-side CPU ceiling <=30%, Wi-Fi and charging defaults, thermal/battery/network checks, no hidden mining, no cryptojacking, no arbitrary code execution.
- No work on low battery, hot device, mobile data (unless separately opted in), or during audio/video calls.
- No personal files, contacts, location, microphone, camera or worship history in compute tasks.
- Only audited containerized workloads from known research/public-benefit partners; signed manifests, reproducible task inputs and verifiable outputs.
- Independent security review, abuse reporting, workload kill switch, incident response, privacy retention schedule and transparent energy/impact reporting.
- Never imply that compute is religiously required, spiritually rewarded, or a substitute for sadaqa. No guilt, streak pressure or religious claims around rewards.

## Current implementation boundary
This commit adds the consent/preferences UI and secure database foundation. It does not execute CPU workloads, mine a cryptocurrency, issue rewards or create a wallet/token. A real worker and verifier require a selected workload partner, signed task protocol, independent security review and operational funding.
