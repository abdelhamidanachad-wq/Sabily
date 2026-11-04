# Sabily Media & Knowledge: source-ingestion and rights policy

## Purpose
Build a source-first Islamic learning catalogue for Qur'an, Hadith, Seerah, Tajweed, Fiqh, Aqeedah, dua/adhkar, tutorials, family learning and Muslim history. The catalogue supports short vertical video, long video, cards, articles, audio and courses.

This is an ingestion policy, not blanket permission to copy online material. A source is usable only after its exact dataset, edition, asset and licence have been checked.

## Candidate source register

| Source | Potential use | Rights / operational gate |
|---|---|---|
| Tanzil Project | Uthmani Qur'an text | CC BY 3.0; preserve the required notice and link. Do not modify the Arabic text. Validate every import against canonical surah/ayah counts. |
| Quran Foundation / Quran.com APIs | Qur'an text, translations, tafsir, morphology and audio metadata at runtime | Use the official API and follow current Developer Terms. Do not treat API access as permission to bulk-export or redistribute raw content. Do not modify Qur'an text. Credit Quran Foundation in social-video use of its content. |
| Sunnah.com API | Selected Hadith records, identifiers and grading metadata | Request an API key and use the documented API. Do not scrape or mass-reproduce collections. Preserve collection, book, hadith number, narrator and grading as separate fields; record the edition and any grading source. |
| OpenITI | Academic research corpus, Arabic/Persian Islamicate texts and metadata | Review the licence attached to each release and work. Preserve release/DOI, editor, provenance and metadata. Do not assume every text in the corpus is public domain. |
| Islam Museum open data | Knowledge-graph records and licensed media metadata | Its knowledge-graph data is stated as CC0; essays are CC BY-SA 4.0; media has per-record licences. Tanzil-derived Qur'an text remains subject to Tanzil attribution and no-modification requirements. |
| Wikimedia Commons | Supporting images, maps, historical objects and some audio/video | Verify the individual file page. Record creator, exact licence/version, source URL and attribution; comply with ShareAlike and non-commercial restrictions where present. |

## Ingestion gates

1. **Exact asset rights:** store canonical source URL, publisher/creator, licence identifier, licence URL, attribution text, version/release and retrieval date. If unclear, mark `review_required` or `link_only`; never infer permission from a GitHub repository being public.
2. **Religious accuracy:** keep Qur'an Arabic verbatim; preserve translation edition and translator. Hadith requires collection, book/chapter, identifier, narrator where supplied, Arabic and translation edition, grading and the scholar/source responsible for that grading. Seerah and Fiqh items require traceable works and named scholarly/editorial review.
3. **No synthetic citations:** AI may structure and adapt approved source material, but it cannot invent ayat, hadith wording, chains, grading, historical dates, scholarly positions or references.
4. **Editorial status:** every imported or AI-assisted item begins as draft/pending review. Only a qualified reviewer may approve religious claims; a rights reviewer must separately confirm the licence before publication.
5. **Link instead of copy:** where terms allow viewing but not bulk reuse, retain a canonical link or approved embed rather than downloading or rehosting the source.
6. **Attribution travels with content:** show source and licence in the item detail and in video captions/credits where required. Keep machine-readable source metadata with the item.
7. **Corrections and takedowns:** keep source version and review history. Disable affected items immediately when a rights holder or qualified reviewer reports a problem.

## Recommendation and privacy principles

- Users choose an age band (kids, teens, adults, older adults); do not collect an exact date of birth just to tune the feed.
- Masculine/feminine voice or presenter preference is an explicit optional content preference, never inferred from a user's gender.
- Rank using chosen topics/languages/formats, explicit likes/saves, completion and negative feedback. Never optimize solely for watch time.
- Provide “not for me”, hide/report, preference reset and a personalization-off switch.
- Keep children in child-rated content and exclude mature items from child/teen profiles. Add guardian controls before enabling child accounts in production.
- Use a finite, user-controlled feed; no forced autoplay or endless autoplay chain.

## Implemented schema in this branch

- `sabily_content_sources`: source registry and rights metadata.
- `sabily_content_items`: media, cards, audience suitability, source references, licence and review state.
- `sabily_content_preferences`: user-selected age band, language, topics/formats, optional voice preference and personalization switch.
- `sabily_content_interactions`: first-party feedback events, scoped to the user's own account.
- `sabily_recommend_content`: explainable preference and feedback ranking over approved, rights-cleared items.
- `sabily_record_content_interaction`: validated interaction event writer.

## Not yet included

This foundation does not bulk-import all upstream datasets, automatically license third-party video/audio, create final rendered videos, or replace scholarly/legal review. Those require source-by-source approval, provider-specific media adapters, moderation tooling, and an explicit operational decision.
