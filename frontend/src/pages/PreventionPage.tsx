import { CheckCircle2, ChevronDown, CircleAlert, PhoneCall, Search, ShieldCheck, Workflow } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, inputClass, PageHeader, SectionTitle } from "../components/ui";
import { GENERAL_TIPS, TOPICS, type Topic } from "../content/education";

export default function PreventionPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const topics = TOPICS.filter((t) => t.prevention && (!q || `${t.title} ${t.what}`.toLowerCase().includes(q)));
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Prevention and awareness" title="How to protect yourself from common cyber crimes">
        Practical steps for Indian internet users. This is general safety information, not legal advice.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {GENERAL_TIPS.map((tip) => (
          <Card key={tip.title}>
            <ShieldCheck size={18} className="text-accent" aria-hidden />
            <h2 className="mt-2 text-sm font-semibold">{tip.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{tip.text}</p>
          </Card>
        ))}
      </div>

      <SectionTitle title="Guides by type of crime" />
      <div className="mb-4 max-w-sm">
        <label htmlFor="topic-search" className="mb-1 block text-xs font-medium text-ink-2">Find a topic</label>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-3 text-ink-3" aria-hidden />
          <input id="topic-search" className={`${inputClass} pl-8`} placeholder="e.g. UPI" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {topics.length === 0 && <p className="text-sm text-ink-2">No topic matches that search.</p>}
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {topics.map((topic) => <Guide key={topic.id} topic={topic} />)}
      </div>

      <div className="mt-6 rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm leading-relaxed sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p><strong>Already lost money?</strong> Speed matters most. Call <a className="font-semibold underline" href="tel:1930">1930</a> now, then see the full steps.</p>
        <Link to="/emergency" className="mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-bad px-3 py-2 text-sm font-semibold text-white hover:bg-bad/85 sm:mt-0">
          <PhoneCall size={14} aria-hidden /> Emergency help
        </Link>
      </div>
    </div>
  );
}

function Guide({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(topic.id === "upi");
  return (
    <Card>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{topic.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-2">{topic.what}</span>
        </span>
        <ChevronDown size={18} className={`mt-0.5 shrink-0 text-ink-2 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="fade-in mt-3 space-y-3 border-t border-line/50 pt-3">
          {topic.example && (
            <p className="rounded-lg bg-surface p-3 text-sm leading-relaxed"><strong>Example: </strong><span className="text-ink-2">{topic.example}</span></p>
          )}
          <Block icon={<Workflow size={14} className="text-accent-2" aria-hidden />} title="How criminals operate" items={topic.how} />
          <Block icon={<CircleAlert size={14} className="text-warn" aria-hidden />} title="Warning signs" items={topic.signs} />
          <Block icon={<CheckCircle2 size={14} className="text-good" aria-hidden />} title="Prevention steps" items={topic.prevent} />
          <Block icon={<PhoneCall size={14} className="text-bad" aria-hidden />} title="If you are a victim, immediately" items={topic.victim} ordered />
        </div>
      )}
    </Card>
  );
}

function Block({ icon, title, items, ordered }: { icon: React.ReactNode; title: string; items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-2">{icon} {title}</h3>
      <ListTag className={`mt-1 space-y-1 pl-5 text-sm leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ListTag>
    </div>
  );
}
