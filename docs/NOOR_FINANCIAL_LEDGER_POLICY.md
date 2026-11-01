# Noor financial ledger and redemption policy

## Balance segregation
- **Earned Noor**: eligible advertising revenue and verified computing compensation. Redemption may be enabled only after legal, provider, identity, fraud and liquidity checks.
- **Donated Noor**: credited only after a real-money donation settles. It is always charity-restricted and cannot be withdrawn, refunded through the rewards system, or moved into earned balance.
- **Charity Noor**: value allocated to an approved Sadaqa project. It is reserved for project execution and cannot be used for personal payouts.

## Provenance
Every credit is tied to an idempotent source event. The append-only ledger records bucket, source type, source reference, Noor units, backing currency/value, settlement state and metadata. Client roles cannot insert, update or delete ledger rows. Provider webhooks and trusted server processes use service-role credentials only.

## Withdrawal review
Members may submit a withdrawal request. Admins/super-admins review and decide; moderators may inspect but cannot approve. A future payout service must:
1. Verify identity and eligibility under applicable law and provider terms.
2. Calculate available earned balance after all pending reservations and prior settled payouts.
3. Reserve earned balance atomically and idempotently.
4. Record any conversion quote, fees and payout currency.
5. Mark paid only after provider settlement confirmation.
6. Release reservations on rejection or failure.
7. Never use donated or charity balances for user payouts.

## Exchange and crypto
Exchange quotes are configuration records, not proof of liquidity or permission to issue a token. USDT conversion, custody, token issuance and cash payout remain disabled until legal approval and authorised providers are in place. Do not promise a fixed Noor/MAD or Noor/USDT rate unless backed by a valid, current quote and redeemable reserves.

## Charity accounting
Donations are reflected in the charity-restricted bucket after settlement. Ad and compute income must be reconciled against provider reports before Noor rewards or charity allocations are credited. Fees, taxes, chargebacks and refunds must be accounted for separately. Public impact reporting must disclose only settled allocations and completed transfers.

## Worship separation
Prayer, Qur'an, adhkar, Tasbih, Tahajjud and Wird never generate rewards and must remain usable without advertising. Noor is a financial/rewards layer, not a measure of worship or piety.
