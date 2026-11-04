-- Explainable recommendations: relevance, stated preferences, source review and negative feedback.
create or replace function public.sabily_recommend_content(p_limit integer default 24,p_surface text default 'feed')
returns setof public.sabily_content_items
language sql stable security invoker set search_path=public
as $$
 with prefs as (select * from public.sabily_content_preferences where user_id=auth.uid()),
 ranked as (
  select c.*,
   (case when coalesce((select personalization_enabled from prefs),true)=false then 0 else
      (case when c.category=any(coalesce((select preferred_categories from prefs),'{}'::text[])) then 4 else 0 end) +
      (case when c.format=any(coalesce((select preferred_formats from prefs),array['short_video','card','article']::text[])) then 2 else 0 end) +
      (case when c.language=any(coalesce((select preferred_languages from prefs),array['en']::text[])) then 3 else 0 end) +
      (case when c.presentation_preference='all' or c.presentation_preference=coalesce((select presentation_preference from prefs),'all') then 1 else 0 end)
    end) +
    coalesce((select sum(case i.event_type when 'like' then 3 when 'save' then 4 when 'complete' then 3 when 'share' then 2 when 'skip' then -3 else 0 end)
      from public.sabily_content_interactions i where i.user_id=auth.uid() and i.content_id=c.id and i.created_at>now()-interval '90 days'),0) as score
  from public.sabily_content_items c
  where c.review_status='approved' and c.published_at is not null and c.published_at<=now()
   and c.rights_status in ('public_domain','open_licensed','permission_granted','link_only')
   and (not exists(select 1 from prefs) or c.audience_bands @> array[coalesce((select age_band from prefs),'adult')])
   and (not exists(select 1 from prefs) or c.content_rating<>'mature' or (select age_band from prefs) in ('adult','senior'))
   and not exists(select 1 from public.sabily_content_interactions i where i.user_id=auth.uid() and i.content_id=c.id and i.event_type in ('hide','report'))
 )
 select ranked.* from ranked order by score desc,published_at desc limit greatest(1,least(coalesce(p_limit,24),50));
$$;
revoke all on function public.sabily_recommend_content(integer,text) from public,anon;
grant execute on function public.sabily_recommend_content(integer,text) to authenticated;

create or replace function public.sabily_record_content_interaction(p_content_id uuid,p_event_type text,p_watch_seconds integer default 0,p_surface text default 'feed')
returns bigint language plpgsql security invoker set search_path=public as $$
declare new_id bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_event_type not in ('impression','view_3s','view_25','complete','like','save','share','skip','hide','report','card_open') then raise exception 'Unsupported interaction'; end if;
 insert into public.sabily_content_interactions(user_id,content_id,event_type,watch_seconds,surface)
 values(auth.uid(),p_content_id,p_event_type,greatest(0,least(coalesce(p_watch_seconds,0),86400)),coalesce(p_surface,'feed'))
 returning id into new_id;
 return new_id;
end; $$;
revoke all on function public.sabily_record_content_interaction(uuid,text,integer,text) from public,anon;
grant execute on function public.sabily_record_content_interaction(uuid,text,integer,text) to authenticated;
