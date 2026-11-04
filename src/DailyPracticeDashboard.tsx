import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, Check, Clock3, Heart, MoonStar, ShieldCheck, Sparkles, Sun, Target } from "lucide-react";
import { supabase } from "./supabase";

type HabitRow = { habit_key: string; completed: boolean; updated_at: string };
type Habit = { key: string; label: string; detail: string; group: "prayer" | "worship" | "focus"; icon: typeof Clock3 };

const habits: Habit[] = [
  { key: "prayer_fajr", label: "Fajr", detail: "Start the day with prayer", group: "prayer", icon: MoonStar },
  { key: "prayer_dhuhr", label: "Dhuhr", detail: "Pause for midday prayer", group: "prayer", icon: Sun },
  { key: "prayer_asr", label: "Asr", detail: "Return to what matters", group: "prayer", icon: Sun },
  { key: "prayer_maghrib", label: "Maghrib", detail: "Mark the close of the day", group: "prayer", icon: MoonStar },
  { key: "prayer_isha", label: "Isha", detail: "End the day with prayer", group: "prayer", icon: MoonStar },
  { key: "adhkar_sabah", label: "Morning Adhkar", detail: "A mindful start with remembrance", group: "worship", icon: Sun },
  { key: "quran", label: "Qur’an reading", detail: "Even a few verses count", group: "worship", icon: BookOpen },
  { key: "tasbih", label: "Tasbih & dhikr", detail: "Remember Allah throughout the day", group: "worship", icon: Activity },
  { key: "adhkar_masaa", label: "Evening Adhkar", detail: "Close the day with remembrance", group: "worship", icon: MoonStar },
  { key: "phone_free_start", label: "Phone-free first 30 minutes", detail: "Choose your morning before the feed does", group: "focus", icon: Clock3 },
  { key: "mindful_social", label: "Mindful social media", detail: "Stay within the screen-time limit you chose", group: "focus", icon: Target },
  { key: "protect_attention", label: "Protect my attention", detail: "Step away from content that does not serve me", group: "focus", icon: ShieldCheck },
];

function localDateKey() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export default function DailyPracticeDashboard({ userId, onNavigate }: { userId: string; onNavigate: (page: string) => void }) {
  const [rows, setRows] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const today = useMemo(localDateKey, []);
  const completed = habits.filter(habit => rows[habit.key]).length;
  const prayerDone = habits.filter(habit => habit.group === "prayer" && rows[habit.key]).length;
  const worshipDone = habits.filter(habit => habit.group === "worship" && rows[habit.key]).length;
  const focusDone = habits.filter(habit => habit.group === "focus" && rows[habit.key]).length;

  const load = useCallback(async () => {
    if (!supabase) { setError("Connect Sabily to sync your daily practice."); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from("sabily_daily_habit_logs").select("habit_key,completed,updated_at").eq("user_id", userId).eq("local_date", today);
    if (queryError) setError(queryError.message);
    else { setRows(Object.fromEntries((data as HabitRow[] || []).map(row => [row.habit_key, row.completed]))); setError(""); }
    setLoading(false);
  }, [today, userId]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(habit: Habit) {
    if (!supabase || busyKey) return;
    const next = !rows[habit.key];
    setBusyKey(habit.key);
    setRows(old => ({ ...old, [habit.key]: next }));
    const { error: saveError } = await supabase.from("sabily_daily_habit_logs").upsert({
      user_id: userId, local_date: today, habit_key: habit.key, completed: next, updated_at: new Date().toISOString()
    }, { onConflict: "user_id,local_date,habit_key" });
    if (saveError) { setRows(old => ({ ...old, [habit.key]: !next })); setError(saveError.message); }
    else setError("");
    setBusyKey("");
  }

  const groups = [
    { key: "prayer", title: "The five daily prayers", subtitle: "A gentle check-in for each salah", count: prayerDone, total: 5, icon: MoonStar, action: "Prayer", items: habits.filter(h => h.group === "prayer") },
    { key: "worship", title: "Daily worship", subtitle: "Small, consistent acts of remembrance and learning", count: worshipDone, total: 4, icon: BookOpen, action: "Azkar", items: habits.filter(h => h.group === "worship") },
    { key: "focus", title: "Healthy attention", subtitle: "Build space away from endless scrolling and harmful content", count: focusDone, total: 3, icon: Heart, action: "Digital Wellbeing", items: habits.filter(h => h.group === "focus") },
  ] as const;

  return <section className="daily-practice" aria-label="Daily worship and healthy habits tracker">
    <div className="practice-heading">
      <div><span className="eyebrow">YOUR DAILY COMPASS</span><h2>Small steps. A steadier life.</h2><p>Track your prayers, worship and the habits that protect your time and attention.</p></div>
      <div className="practice-score"><span>{completed}<small> / 12</small></span><b>today's steps</b><div className="practice-progress"><i style={{ width: (completed / habits.length * 100) + "%" }} /></div></div>
    </div>
    <div className="practice-summary">
      <div><MoonStar/><span><b>{prayerDone}/5</b><small>Prayers</small></span></div>
      <div><BookOpen/><span><b>{worshipDone}/4</b><small>Worship</small></span></div>
      <div><Heart/><span><b>{focusDone}/3</b><small>Healthy habits</small></span></div>
      <div><Sparkles/><span><b>{Math.round(completed / habits.length * 100)}%</b><small>Daily progress</small></span></div>
    </div>
    <div className="practice-groups">
      {groups.map(group => <article className="practice-group" key={group.key}>
        <header><div className="practice-group-icon"><group.icon size={19}/></div><div><h3>{group.title}</h3><p>{group.subtitle}</p></div><span className="practice-group-count">{group.count}/{group.total}</span></header>
        <div className="practice-habit-list">{group.items.map(habit => {
          const Icon = habit.icon;
          return <button type="button" key={habit.key} className={rows[habit.key] ? "practice-habit is-done" : "practice-habit"} onClick={() => void toggle(habit)} disabled={!!busyKey || loading} aria-pressed={!!rows[habit.key]}>
            <span className="practice-check">{rows[habit.key] ? <Check size={15}/> : <Icon size={15}/>}</span><span className="practice-habit-copy"><b>{habit.label}</b><small>{habit.detail}</small></span><span className="practice-toggle-label">{rows[habit.key] ? "Done" : "Mark done"}</span>
          </button>;
        })}</div>
        <button className="practice-open-link" onClick={() => onNavigate(group.action)}>Open {group.action === "Azkar" ? "Adhkar" : group.action} <span>→</span></button>
      </article>)}
    </div>
    <div className="practice-kindness"><div><span className="eyebrow">A KIND REMINDER</span><b>Progress, not perfection.</b><p>A missed day is not failure. Begin again with the next prayer, the next choice, the next small good deed.</p></div><span className="kindness-mark">سَبِيل</span></div>
    {loading && <p className="practice-status" role="status">Loading today's check-ins…</p>}
    {error && <p className="practice-error" role="alert">{error}</p>}
  </section>;
}
