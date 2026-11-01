# Sabily — worship, charity and funding architecture

## Worship
Qur'an experience has three distinct modes: horizontal Mushaf page navigation; ayah-by-ayah vertical scrolling with recitation controls; and continuous reading. Persist only references and personal progress, not copied Qur'an text. Add audio reciter selection, ayah repeat, playback speed, translation/tafsir toggles, bookmarks and offline caching from licensed providers. Wird plans use the 60 Hizb structure; Tahajjud is a private optional tracker. No worship screen contains advertising, monetisation, sponsored prompts or rewards.

## Charity and good deeds
Projects include Iftar meals, Ramadan food baskets, Mushaf distribution, mosque construction and cleaning, surgery support, hospitals and healing centres. Users and organisations can submit project drafts; a review team verifies organiser, beneficiary, authority, budget, location, bank recipient, safeguarding and proof-of-delivery plan before publication. Volunteer opportunities have capacity, date/location, signup, organiser approval, attendance and completion records. Patron/supporter profiles express interest only until a compliant payment provider is configured; do not display a payment as received before settlement.

## Noor and advertising
Noor points are non-cash, non-transferable participation indicators. Worship does not mint Noor. Optional sponsored placements may appear only in approved non-worship surfaces, with clear "Sponsored" labels, frequency caps and user controls. Never reward ad clicks or make users watch ads to access Qur'an, prayer or essential app features. Ad revenue is reconciled from provider/server reports; client impression events are not financial evidence. Allocate only validated net revenue after provider fees/taxes, and display gross, deductions, net, project allocation and settled transfer references. Do not promise a fixed donation per impression unless provider settlement confirms it.

## Super-admin
Provider settings may expose provider name, capability, enabled status and a secret reference, never API secret values. Keep credentials in Supabase Edge Function secrets/Vercel environment variables. Separate AI chat and AI content generation, model routing, token/cost limits, moderation and human editorial approval. OAuth must be configured in Supabase Auth and provider consoles. Ad placements must have prohibited-surface exclusions for Qur'an, prayer, Tasbih, Tahajjud, Wird, Qibla and Sadaqa checkout. Privileged actions require server-side super-admin authorization and audit logs.

## Safety and trust
Medical and surgery campaigns require beneficiary consent, verified facility and privacy controls; do not publish sensitive medical details without consent. Mosque construction requires permits/land/contractor checks. Volunteers need safeguarding and emergency procedures. Projects publish progress and evidence. Donations and patron subscriptions remain disabled until payment/legal review and a provider contract are complete.

## Delivery sequence
1. Apply and test the new charity, ad-revenue, volunteer, Qur'an progress, Wird and Tahajjud schema.
2. Implement member project submission, admin review, volunteer discovery/signup, patron interest and transparent project reporting.
3. Implement Mushaf and ayah-scroll readers against a trusted licensed Qur'an text/audio API.
4. Implement ad provider server-to-server reconciliation, net revenue allocation and public impact reporting.
5. Complete super-admin provider management, AI model routing, OAuth health, content workflow and ad placement controls.
6. Integrate payment settlement only after legal/compliance review; then full RLS, accessibility, Arabic RTL, offline and production QA.

This foundation does not itself launch ads, accept donations, transfer funds, or activate Qur'an text/audio providers.
