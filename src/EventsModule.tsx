import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Clock3, ExternalLink, MapPin, Play, Radio, RefreshCw, Users, Video } from "lucide-react";
import { supabase } from "./supabase";

type EventKind = "community" | "learning" | "service" | "jummah" | "taraweeh";
type SabilyEvent = {
  id: string;
  title: string;
  description: string;
  event_type: EventKind;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  city: string | null;
  stream_url: string | null;
  event_status: "draft" | "published" | "cancelled";
  stream_status: "scheduled" | "live" | "ended";
};

const kinds: Array<{ id: EventKind | "all"; label: string }> = [
  { id: "all", label: "All events" }, { id: "learning", label: "Learning" },
  { id: "community", label: "Community" }, { id: "service", label: "Service" },
  { id: "jummah", label: "Jumu'ah" }, { id: "taraweeh", label: "Taraweeh" },
];
const kindLabel: Record<EventKind, string> = { community: "Community", learning: "Learning", service: "Service", jummah: "Jumu'ah", taraweeh: "Taraweeh" };

function youtubeEmbed(raw: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(url.pathname.split("/").filter(Boolean)[0])}` : null;
    if (!["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id = url.searchParams.get("v") || (["embed", "live", "shorts"].includes(parts[0]) ? parts[1] : null);
    return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}

function when(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

function EventCard({ event, attending, onRsvp, onNavigate }: { event: SabilyEvent; attending: boolean; onRsvp: (event: SabilyEvent) => void; onNavigate: (page: string) => void }) {
  const live = event.stream_status === "live" && Boolean(youtubeEmbed(event.stream_url));
  const photo = event.event_type === "taraweeh" || event.event_type === "jummah" ? "/images/evening-prayer.webp" : "/images/community-gathering.webp";
  return <article className="event-card">
    <div className="event-card-image" style={{ backgroundImage: `url(${photo})` }}>
      <span className="event-kind-pill">{kindLabel[event.event_type]}</span>
      {live && <span className="event-live-pill"><i/> LIVE NOW</span>}
    </div>
    <div className="event-card-content">
      <time className="event-time" dateTime={event.starts_at}><CalendarDays size={15}/>{when(event.starts_at)}</time>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="event-meta">{event.venue ? <span><MapPin size={14}/>{[event.venue, event.city].filter(Boolean).join(" · ")}</span> : <span><Video size={14}/>Online gathering</span>}</div>
      <div className="event-card-actions">
        {event.event_type === "jummah" || event.event_type === "taraweeh" ? <button className="event-secondary-action" onClick={() => onNavigate(event.event_type === "jummah" ? "Live Jumu'ah" : "Live Taraweeh")}>{live ? <><Play size={15}/> Watch live</> : <><Radio size={15}/> Live details</>}</button> : <button className={attending ? "event-secondary-action attending" : "event-secondary-action"} onClick={() => onRsvp(event)}>{attending ? <><Check size={15}/> Going</> : <><Users size={15}/> I'm interested</>}</button>}
        <span className="event-stream-state">{live ? "Broadcast active" : event.stream_status === "ended" ? "Finished" : "Scheduled"}</span>
      </div>
    </div>
  </article>;
}

export function EventsPreview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [events, setEvents] = useState<SabilyEvent[]>([]);
  useEffect(() => {
    let active = true;
    if (supabase) void supabase.from("sabily_events").select("id,title,description,event_type,starts_at,ends_at,venue,city,stream_url,event_status,stream_status").eq("event_status", "published").gte("starts_at", new Date().toISOString()).order("starts_at").limit(2).then(({ data }) => { if (active) setEvents((data || []) as SabilyEvent[]); });
    return () => { active = false; };
  }, []);
  return <section className="events-preview home-widget">
    <div className="section-heading"><div><span className="eyebrow">MEET · LEARN · GIVE</span><h3>Make good things happen together</h3></div><button className="toolkit-link" onClick={() => onNavigate("Events")}>Explore events <ArrowUpRight size={15}/></button></div>
    {events.length ? <div className="events-preview-list">{events.map(event => <article className="events-preview-item" key={event.id}><div className="event-date-block"><b>{new Date(event.starts_at).getDate()}</b><small>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(event.starts_at))}</small></div><div><small>{kindLabel[event.event_type]} · {when(event.starts_at)}</small><b>{event.title}</b><span>{event.city || event.venue || "Online"}</span></div></article>)}</div> : <div className="events-preview-empty"><CalendarDays size={19}/><span>Community gatherings and learning events will appear here.</span></div>}
  </section>;
}

export default function EventsModule({ userId, view, onNavigate, onToast }: { userId: string; view: "events" | "live" | "jummah" | "taraweeh"; onNavigate: (page: string) => void; onToast: (message: string) => void }) {
  const [events, setEvents] = useState<SabilyEvent[]>([]);
  const [attending, setAttending] = useState<string[]>([]);
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError("Connect Supabase to load published events and live schedules."); return; }
    setLoading(true); setError("");
    const { data, error: loadError } = await supabase.from("sabily_events").select("id,title,description,event_type,starts_at,ends_at,venue,city,stream_url,event_status,stream_status").eq("event_status", "published").order("starts_at", { ascending: true }).limit(100);
    if (loadError) { setError("Events are not available right now. Please try again shortly."); setLoading(false); return; }
    const rows = (data || []) as SabilyEvent[];
    setEvents(rows);
    if (rows.length) {
      const { data: rsvps, error: rsvpError } = await supabase.from("sabily_event_rsvps").select("event_id").eq("user_id", userId).in("event_id", rows.map(item => item.id));
      if (!rsvpError) setAttending((rsvps || []).map(row => row.event_id));
    }
    setLoading(false);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (view === "events") return; const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load, view]);

  const visibleEvents = useMemo(() => events.filter(event => {
    if ((view === "jummah" && event.event_type !== "jummah") || (view === "taraweeh" && event.event_type !== "taraweeh")) return false;
    if (view === "live" && !["jummah", "taraweeh"].includes(event.event_type)) return false;
    if (view === "events" && filter !== "all" && event.event_type !== filter) return false;
    return event.event_status === "published";
  }), [events, filter, view]);
  const liveEvent = visibleEvents.find(event => event.stream_status === "live");
  const upcoming = visibleEvents.filter(event => event.stream_status !== "ended" && new Date(event.starts_at).getTime() >= Date.now());
  const title = view === "jummah" ? "Jumu'ah, together" : view === "taraweeh" ? "Taraweeh, together" : view === "live" ? "Gather with the community" : "Good things happen together";
  const subtitle = view === "events" ? "Find a circle to learn, serve and grow with. Your next good moment may be closer than you think." : "Join a scheduled community worship gathering or watch a broadcast when its host brings it online.";

  async function toggleRsvp(event: SabilyEvent) {
    if (!supabase) { onToast("Connect Supabase to save your event interest."); return; }
    const currentlyGoing = attending.includes(event.id);
    const result = currentlyGoing
      ? await supabase.from("sabily_event_rsvps").delete().eq("event_id", event.id).eq("user_id", userId)
      : await supabase.from("sabily_event_rsvps").upsert({ event_id: event.id, user_id: userId, status: "interested" }, { onConflict: "event_id,user_id" });
    if (result.error) { onToast("Could not update your event interest. Please try again."); return; }
    setAttending(previous => currentlyGoing ? previous.filter(id => id !== event.id) : [...previous, event.id]);
    onToast(currentlyGoing ? "Event removed from your list." : "Saved. You’re interested in this event.");
  }

  if (view === "events") return <div className="events-page">
    <section className="events-hero" style={{ backgroundImage: "linear-gradient(90deg,rgba(8,35,27,.92),rgba(8,35,27,.46) 55%,rgba(8,35,27,.05)),url('/images/community-gathering.webp')" }}>
      <div className="events-hero-copy"><span className="eyebrow">SABILY COMMUNITY CALENDAR</span><h1>{title}</h1><p>{subtitle}</p><button className="events-hero-cta" onClick={() => document.getElementById("events-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Browse upcoming events <ArrowUpRight size={16}/></button></div>
      <div className="events-hero-note"><CalendarDays size={18}/><span>Local gatherings<br/><b>Shared with care</b></span></div>
    </section>
    <section className="events-feature-row"><div className="events-feature-intro"><span className="eyebrow">LIVE WORSHIP</span><h2>Gather, wherever you are.</h2><p>Join community-led Jumu'ah and Taraweeh broadcasts when they’re scheduled and streaming.</p><button className="event-secondary-action" onClick={() => onNavigate("Live Worship")}>Explore live worship <Radio size={15}/></button></div>{liveEvent ? <div className="live-teaser live-teaser-active"><img src="/images/evening-prayer.webp" alt="Warmly lit mosque prayer hall at dusk"/><span className="event-live-pill"><i/> LIVE NOW</span><div><b>{liveEvent.title}</b><button onClick={() => onNavigate(liveEvent.event_type === "jummah" ? "Live Jumu'ah" : "Live Taraweeh")}>Join the broadcast <Play size={14}/></button></div></div> : <div className="live-teaser"><img src="/images/evening-prayer.webp" alt="Warmly lit mosque prayer hall at dusk"/><div className="live-teaser-placeholder"><Radio size={20}/><span>Broadcasts appear here when a host schedules one.</span></div></div>}</section>
    <div className="events-list-heading" id="events-list"><div><span className="eyebrow">WHAT’S COMING UP</span><h2>Find your next gathering</h2></div><button className="refresh-btn" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    <div className="event-filters" role="group" aria-label="Filter events">{kinds.map(item => <button key={item.id} className={filter === item.id ? "selected" : ""} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
    {error && <div className="event-state error" role="status">{error}</div>}
    {loading ? <div className="event-state"><span className="loading-orb"/> Loading community events…</div> : visibleEvents.length ? <div className="events-grid">{visibleEvents.map(event => <EventCard key={event.id} event={event} attending={attending.includes(event.id)} onRsvp={toggleRsvp} onNavigate={onNavigate}/>)}</div> : <div className="events-empty"><span className="empty-event-icon"><CalendarDays size={24}/></span><h3>No events scheduled yet</h3><p>There’s nothing published in this category right now. Check back soon, or invite your local community host to add a gathering.</p><button className="event-secondary-action" onClick={() => setFilter("all")}>See all categories <ArrowUpRight size={15}/></button></div>}
    <aside className="events-ad-slot"><span className="ad-placeholder-label"><span>SPONSORED SPACE</span><small>PLACEMENT PREVIEW</small></span><b>A thoughtful place for a community partner.</b><p>No advertisement is active in this space.</p></aside>
  </div>;

  return <div className="live-page">
    <section className="live-hero" style={{ backgroundImage: "linear-gradient(90deg,rgba(8,35,27,.94),rgba(8,35,27,.70) 48%,rgba(8,35,27,.15)),url('/images/evening-prayer.webp')" }}>
      <span className="eyebrow">SABILY LIVE WORSHIP</span><h1>{title}</h1><p>{subtitle}</p>
      <div className="live-tabs"><button className={view === "live" ? "selected" : ""} onClick={() => onNavigate("Live Worship")}>All gatherings</button><button className={view === "jummah" ? "selected" : ""} onClick={() => onNavigate("Live Jumu'ah")}>Jumu'ah</button><button className={view === "taraweeh" ? "selected" : ""} onClick={() => onNavigate("Live Taraweeh")}>Taraweeh</button></div>
    </section>
    {error && <div className="event-state error" role="status">{error}</div>}
    {loading ? <div className="event-state"><span className="loading-orb"/> Checking the schedule…</div> : liveEvent ? <section className="live-watch-section"><div className="live-section-heading"><div><span className="event-live-pill"><i/> LIVE NOW</span><h2>{liveEvent.title}</h2><p>{kindLabel[liveEvent.event_type]} · {liveEvent.city || liveEvent.venue || "Online"}</p></div><button className="refresh-btn" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button></div>{youtubeEmbed(liveEvent.stream_url) ? <div className="live-player"><iframe src={youtubeEmbed(liveEvent.stream_url)!} title={`${liveEvent.title} live broadcast`} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div> : <div className="live-unavailable"><Video size={22}/><div><b>This gathering is marked live, but its video player is unavailable.</b><span>Ask the host to add a valid YouTube Live video link.</span></div>{liveEvent.stream_url&&<a href={liveEvent.stream_url} target="_blank" rel="noreferrer">Open stream <ExternalLink size={14}/></a>}</div>}<p className="live-note">Broadcast timing and availability are managed by the local host. Sabily does not produce the livestream.</p></section> : <div className="live-empty"><div className="live-empty-art"><img src="/images/evening-prayer.webp" alt="A mosque prayer hall at golden hour"/><div className="live-empty-icon"><Radio size={24}/></div></div><div className="live-empty-copy"><span className="eyebrow">COMMUNITY BROADCAST</span><h2>No broadcast is live right now</h2><p>When a host schedules a Jumu'ah or Taraweeh gathering, you’ll find the time and verified stream link here. This space never shows a simulated live feed.</p><button className="event-secondary-action" onClick={() => onNavigate("Events")}>Browse the events calendar <CalendarDays size={15}/></button></div></div>}
    {upcoming.length > 0 && <section className="live-upcoming"><div className="events-list-heading"><div><span className="eyebrow">UPCOMING GATHERINGS</span><h2>Save a time for worship</h2></div></div><div className="events-grid">{upcoming.map(event => <EventCard key={event.id} event={event} attending={attending.includes(event.id)} onRsvp={toggleRsvp} onNavigate={onNavigate}/>)}</div></section>}
    <aside className="events-ad-slot"><span className="ad-placeholder-label"><span>COMMUNITY PARTNER</span><small>PLACEMENT PREVIEW</small></span><b>Space reserved for a trusted local partner.</b><p>No advertisement is active in this space.</p></aside>
  </div>;
}
