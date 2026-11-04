import { useMemo, useState } from "react";
import { Bug, Clipboard, ExternalLink, FileDown, ShieldCheck } from "lucide-react";

type FeedbackKind = "Bug" | "Usability" | "Content" | "Accessibility" | "Performance";
type Severity = "Blocker" | "High" | "Normal" | "Low";

const checklist = [
  ["account", "Sign in, sign out and session restore"],
  ["onboarding", "Complete onboarding and edit profile"],
  ["language", "Change language and verify RTL for Arabic / Urdu"],
  ["prayer", "Load prayer times and change calculation method"],
  ["tracker", "Mark prayers complete and verify persistence"],
  ["quran", "Open a surah, change text size and play recitation"],
  ["qibla", "Grant location permission and check Qibla bearing"],
  ["discover", "Open Discover, filter content and use save / like / share"],
  ["community", "Create or join a community, publish a post and comment"],
  ["events", "Browse events and verify event details"],
  ["profile", "Update profile, interests and personal preferences"],
  ["admin", "Verify admin-only workspace and role restrictions"],
] as const;

export default function BetaFeedback({ page, onToast }: { page: string; onToast: (message: string) => void }) {
  const [kind, setKind] = useState<FeedbackKind>("Bug");
  const [severity, setSeverity] = useState<Severity>("Normal");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("sabily-beta-checklist-v1") || "{}"); }
    catch { return {}; }
  });

  const completed = useMemo(() => checklist.filter(([id]) => checks[id]).length, [checks]);
  const report = useMemo(() => [
    "[Sabily V2 Beta] " + kind + ": " + (actual.trim().slice(0, 70) || "Describe the issue"),
    "",
    "## Test context",
    "- App: Sabily V2 team beta",
    "- Current page: " + page,
    "- Browser: " + (typeof navigator !== "undefined" ? navigator.userAgent : "Unknown"),
    "- Screen: " + (typeof window !== "undefined" ? window.innerWidth + " × " + window.innerHeight : "Unknown"),
    "- Severity: " + severity,
    "- Category: " + kind,
    "",
    "## Steps to reproduce",
    steps.trim() || "Not provided",
    "",
    "## Expected result",
    expected.trim() || "Not provided",
    "",
    "## Actual result",
    actual.trim() || "Not provided",
    "",
    "## Additional notes",
    notes.trim() || "None",
    "",
    "## QA checklist",
    completed + "/" + checklist.length + " checks completed",
  ].join("\n"), [kind, severity, page, steps, expected, actual, notes, completed]);

  function toggleCheck(id: string, value: boolean) {
    setChecks(old => {
      const next = { ...old, [id]: value };
      try { localStorage.setItem("sabily-beta-checklist-v1", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      onToast("Feedback report copied. Paste it into your team issue tracker.");
    } catch {
      onToast("Clipboard access is unavailable. Use Download report instead.");
    }
  }

  function downloadReport() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sabily-v2-beta-feedback.md";
    anchor.click();
    URL.revokeObjectURL(url);
    onToast("Feedback report downloaded.");
  }

  function openGitHubIssue() {
    const title = "[Sabily V2 Beta] " + kind + ": " + (actual.trim().slice(0, 70) || "New feedback");
    const url = "https://github.com/abdelhamidanachad-wq/Sabily/issues/new?title=" +
      encodeURIComponent(title) + "&body=" + encodeURIComponent(report);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return <div className="beta-page">
    <section className="page-intro beta-intro">
      <span className="eyebrow">SABILY V2 · TEAM TESTING</span>
      <h1>Help us make Sabily better.</h1>
      <p>Test the main journeys, record what feels confusing or broken, and send reproducible feedback to the product team.</p>
      <div className="beta-status"><ShieldCheck size={16}/> Team beta · Feedback is not sent until you choose an action below</div>
    </section>

    <section className="beta-progress-card">
      <div><span className="eyebrow">TEST COVERAGE</span><h2>{completed} of {checklist.length} journeys checked</h2><p>Your checklist is saved locally in this browser.</p></div>
      <div className="beta-progress"><span style={{ width: (completed / checklist.length * 100) + "%" }}/></div>
    </section>

    <div className="beta-grid">
      <section className="beta-panel">
        <div className="beta-panel-heading"><div><span className="eyebrow">TEST PLAN</span><h2>Member & admin journeys</h2></div><span className="beta-count">{completed}/{checklist.length}</span></div>
        <div className="beta-checklist">{checklist.map(([id, label]) => <label key={id} className={checks[id] ? "beta-check done" : "beta-check"}><input type="checkbox" checked={!!checks[id]} onChange={event => toggleCheck(id, event.target.checked)}/><span>{label}</span></label>)}</div>
        <button className="beta-reset" onClick={() => { setChecks({}); try { localStorage.removeItem("sabily-beta-checklist-v1"); } catch {} }}>Reset my checklist</button>
      </section>

      <section className="beta-panel beta-report-panel">
        <div className="beta-panel-heading"><div><span className="eyebrow">PRODUCT FEEDBACK</span><h2>Report an issue or idea</h2></div><Bug size={20}/></div>
        <label>Feedback type<select value={kind} onChange={event => setKind(event.target.value as FeedbackKind)}><option>Bug</option><option>Usability</option><option>Content</option><option>Accessibility</option><option>Performance</option></select></label>
        <label>Severity<select value={severity} onChange={event => setSeverity(event.target.value as Severity)}><option>Blocker</option><option>High</option><option>Normal</option><option>Low</option></select></label>
        <label>Steps to reproduce<textarea rows={3} value={steps} onChange={event => setSteps(event.target.value)} placeholder="1. Open… 2. Select… 3. Notice…"/></label>
        <label>What did you expect?<textarea rows={2} value={expected} onChange={event => setExpected(event.target.value)} placeholder="Describe the expected behaviour."/></label>
        <label>What actually happened?<textarea rows={3} value={actual} onChange={event => setActual(event.target.value)} placeholder="Describe what happened, including any error message."/></label>
        <label>Additional notes<textarea rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Device, account role, screenshots or other context."/></label>
        <div className="beta-report-actions">
          <button className="primary-btn" onClick={openGitHubIssue}><ExternalLink size={15}/> Open GitHub issue</button>
          <button className="secondary-btn" onClick={()=>void copyReport()}><Clipboard size={15}/> Copy report</button>
          <button className="secondary-btn" onClick={downloadReport}><FileDown size={15}/> Download</button>
        </div>
        <p className="beta-privacy-note">Opening GitHub requires team repository access. Copy or download the report if you cannot access GitHub. No feedback is silently uploaded.</p>
      </section>
    </div>
  </div>;
}
