# Sabily V2 — Team Beta Test Guide

## Purpose

Use this build to test real member and administrator journeys, find defects, and give the product team reproducible feedback. This is a preview/beta, not a public production release.

## Access

1. Open the Vercel preview URL attached to the Sabily V2 pull request.
2. Sign in using an approved team test account supplied by the project owner.
3. Do not share passwords, use real customer/member personal data, or enter confidential information into generated content.
4. Test with separate member, creator/moderator and administrator accounts where available. A member account must never see privileged admin controls.

If preview access is protected, ask the project owner to add the tester to the Vercel preview access group. Do not disable deployment protection just to make testing easier.

## Test checklist

The in-app **Beta feedback** page includes a checklist that is saved in the current browser. Cover these journeys:

- Sign in, sign out and restore a session after refresh.
- Complete onboarding and edit the member profile.
- Change language preference; verify Arabic and Urdu switch to RTL. Note: the language registry and direction are present, but complete translated interface copy is not yet delivered.
- Load prayer times, change the calculation method and refresh.
- Mark prayers complete and check persistence across refresh.
- Open Quran, switch surahs, change text size, toggle English translation and play recitation.
- Grant location permission and verify Qibla bearing; deny permission and verify the fallback message.
- Open Discover, switch Watch/Cards, filter topics, play media and test like/save/share/hide.
- Create or join a community, publish a post, comment and report content.
- Browse events and test available event actions.
- Update profile, interests, theme and home widgets.
- Sign in as a member and verify admin routes are denied. Sign in as an approved admin and test admin workspace sections.

## How to report a defect

Open **Beta feedback** from the member navigation. Select the category and severity, then include:

1. Exact page and account role (never include password or private member details).
2. Steps to reproduce, numbered.
3. Expected result.
4. Actual result and exact error text.
5. Device, operating system, browser and screen size.
6. Screenshot or short screen recording if safe and useful.

Choose **Open GitHub issue** if you have repository access. Otherwise choose **Copy report** or **Download** and send the report to the project owner through the team's approved channel. The app does not silently upload beta feedback.

## Known beta limitations

- UI localization is incomplete. Language preference and document direction are wired, but most visible copy remains English.
- Discover uses the existing approved-content recommendation backend and controls. It is not yet the final full-screen Reels player or complete creator-following/comments experience.
- Creator application, moderation-to-publish workflow and asynchronous media transcoding need further implementation.
- AI Studio currently has a basic draft-generation path. Durable background orchestration, batch translation, scheduling and advanced media generation remain future work.
- Some modules are preview shells or depend on Supabase migrations, provider credentials, content or integrations being configured.
- iOS and Android native packaging and store builds are not part of this web beta.

## Data and safety

- Use test accounts and test content only.
- Do not publish AI-generated religious content as authoritative guidance. Quran and Hadith references must be verified by qualified human reviewers.
- Never upload media unless the team has rights to use it.
- Report any permission leak, cross-account data exposure, incorrect role access or unexpected publishing as **Blocker**.
- Do not apply new database migrations to production from this beta branch without schema/ledger reconciliation and approval.

## Release gate

The team beta is ready for wider internal testing only after:
- CI tests and production build pass.
- Vercel preview is available and access is restricted to intended testers.
- Member/admin role checks pass.
- No blocker security, privacy or data-integrity issues remain.
- Test feedback is triaged into fix, follow-up or accepted limitation.
