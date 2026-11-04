-- Sabily Media & Knowledge: rights-aware content catalogue and private interaction signals.
create table if not exists public.sabily_content_sources (
 id uuid primary key default gen_random_uuid(), title text not null, source_url text not null unique,
 publisher text, source_kind text not null, licence_id text, licence_url text,
 rights_status text not null default 'review_required' check (rights_status in ('public_domain','open_licensed','permission_granted','link_only','review_required','restricted')),
 attribution text, usage_notes text, verified_at timestamptz, verified_by uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table public.sabily_content_sources enable row level security;
create policy "Approved source records readable" on public.sabily_content_sources for select to authenticated using (rights_status in ('public_domain','open_licensed','permission_granted','link_only'));
revoke insert,update,delete on public.sabily_content_sources from anon,authenticated;
grant select on public.sabily_content_sources to authenticated;

create table if not exists public.sabily_content_items (
 id uuid primary key default gen_random_uuid(), slug text unique, title text not null, description text,
 category text not null, format text not null check(format in ('short_video','long_video','card','article','audio','course')),
 media_url text, thumbnail_url text, body jsonb not null default '{}'::jsonb, language text not null default 'en',
 duration_seconds integer check(duration_seconds is null or duration_seconds between 0 and 86400),
 audience_bands text[] not null default array['adult','senior']::text[],
 min_age integer not null default 18 check(min_age between 0 and 120), max_age integer,
 presentation_preference text not null default 'all' check(presentation_preference in ('all','masculine_voice','feminine_voice')),
 content_rating text not null default 'general' check(content_rating in ('children','family','general','mature')),
 source_ids uuid[] not null default '{}', source_references jsonb not null default '[]'::jsonb,
 licence_id text, licence_url text,
 rights_status text not null default 'review_required' check(rights_status in ('public_domain','open_licensed','permission_granted','link_only','review_required','restricted')),
 review_status text not null default 'draft' check(review_status in ('draft','pending_review','approved','rejected','needs_correction')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, published_at timestamptz,
 created_by uuid references auth.users(id), metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(max_age is null or max_age between min_age and 120),
 check(review_status <> 'approved' or rights_status in ('public_domain','open_licensed','permission_granted','link_only'))
);
create index if not exists sabily_content_feed_idx on public.sabily_content_items(review_status,published_at desc,category,format);
alter table public.sabily_content_items enable row level security;
create policy "Members read approved published content" on public.sabily_content_items for select to authenticated using(review_status='approved' and published_at is not null and published_at<=now());
revoke insert,update,delete on public.sabily_content_items from anon,authenticated;
grant select on public.sabily_content_items to authenticated;

create table if not exists public.sabily_content_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 age_band text not null default 'adult' check(age_band in ('child','teen','adult','senior')),
 preferred_languages text[] not null default array['en']::text[], preferred_categories text[] not null default '{}',
 preferred_formats text[] not null default array['short_video','card','article']::text[],
 presentation_preference text not null default 'all' check(presentation_preference in ('all','masculine_voice','feminine_voice')),
 autoplay_enabled boolean not null default false, personalization_enabled boolean not null default true, updated_at timestamptz not null default now()
);
alter table public.sabily_content_preferences enable row level security;
create policy "Members manage own content preferences" on public.sabily_content_preferences for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

create table if not exists public.sabily_content_interactions (
 id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
 content_id uuid not null references public.sabily_content_items(id) on delete cascade,
 event_type text not null check(event_type in ('impression','view_3s','view_25','complete','like','save','share','skip','hide','report','card_open')),
 watch_seconds integer not null default 0 check(watch_seconds between 0 and 86400),
 surface text not null default 'feed' check(surface in ('feed','cards','search','course','profile')), created_at timestamptz not null default now()
);
create index if not exists sabily_content_interactions_user_idx on public.sabily_content_interactions(user_id,created_at desc);
alter table public.sabily_content_interactions enable row level security;
create policy "Members manage own content interactions" on public.sabily_content_interactions for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
