import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type CategoryDetail, type CategoryDist, type Meta, type MotiveDist, useApi } from "../api";
import { ColumnChart, RankedBars } from "../components/charts";
import { Async, Card, ChartCard, EmptyState, Loading, Notice, PageHeader, Select, SectionTitle, SourceLine } from "../components/ui";
import { TOPICS, type Topic } from "../content/education";
import { num, pct } from "../format";

export default function CategoriesPage() {
  const meta = useApi<Meta>("/api/meta");
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Cybercrime categories" title="What the official statistics count, and what each crime means">
        The first part uses NCRB's own statistical classification. The second is a plain-language guide, and it says clearly when no official figure exists for a topic.
      </PageHeader>
      <Async state={meta} height={420}>{(m) => <OfficialSection meta={m} />}</Async>
      <SectionTitle title="Educational guide to common cybercrimes">
        Everyday names people use. These do not match official categories one to one, so each topic states which official head it relates to, if any.
      </SectionTitle>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {TOPICS.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
      </div>
    </div>
  );
}

function OfficialSection({ meta }: { meta: Meta }) {
  const [year, setYear] = useState(meta.latest_ncrb_year);
  const [state, setState] = useState("");
  const [head, setHead] = useState("computer_related_total");
  const suffix = state ? `&state=${state}` : "";
  const dist = useApi<CategoryDist>(`/api/categories?year=${year}&level=1${suffix}`);
  const sub = useApi<CategoryDist>(`/api/categories?year=${year}&level=2${suffix}`);
  const motives = useApi<MotiveDist>(`/api/motives?year=${year}${suffix}`);
  const years = meta.ncrb_years.filter((y) => y >= 2017).reverse();
  const fraudSubs = (sub.data?.heads ?? []).filter((h) => h.parent_id === "fraud_total" && h.cases);
  const computerSubs = (sub.data?.heads ?? []).filter((h) => h.parent_id === "computer_related_total" && h.cases);

  return (
    <>
      <SectionTitle title="Official statistical categories (NCRB)" />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Year" value={String(year)} onChange={(v) => setYear(Number(v))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select label="Coverage" value={state} onChange={setState}>
            <option value="">All India</option>
            {meta.states.map((s) => <option key={s.state_code} value={s.state_code}>{s.state_name}</option>)}
          </Select>
          <Select label="Explore one crime head" value={head} onChange={setHead}>
            {meta.crime_heads.filter((h) => h.level >= 1 && h.first_year).map((h) => <option key={h.head_id} value={h.head_id}>{h.level > 1 ? "· " : ""}{h.label}</option>)}
          </Select>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={`Crime head distribution, ${year}`} subtitle="Mutually exclusive heads. Together they make up the total."
          source={dist.data?.source}
          table={dist.data ? { rows: dist.data.heads.filter((h) => h.cases != null), columns: [
            { label: "Crime head", align: "left", render: (r) => r.label },
            { label: "Law", align: "left", render: (r) => r.act },
            { label: "Cases", render: (r) => num(r.cases) },
            { label: "Share", render: (r) => pct(r.share) },
          ] } : undefined}
        >
          {dist.data ? (dist.data.heads.some((h) => h.cases) ? (
            <RankedBars data={dist.data.heads.filter((h) => h.cases).slice(0, 10) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={160} />
          ) : <EmptyState />) : <Loading />}
        </ChartCard>
        <ChartCard
          title={`Recorded motives, ${year}`} subtitle="The reason police recorded for the crime. This reads across crime heads."
          source={motives.data?.source}
          table={motives.data ? { rows: motives.data.motives, columns: [
            { label: "Motive", align: "left", render: (r) => r.label },
            { label: "Cases", render: (r) => num(r.cases) },
            { label: "Share", render: (r) => pct(r.share) },
          ] } : undefined}
        >
          {motives.data ? (motives.data.motives.some((m) => m.cases) ? (
            <RankedBars data={motives.data.motives.filter((m) => m.cases).slice(0, 10) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={160} color="#8B5CF6" />
          ) : <EmptyState />) : <Loading />}
        </ChartCard>
        <ChartCard title={`Inside the 'Fraud' head, ${year}`} subtitle="Sub-heads. Gaming, investment, vishing and UPI begin in 2024." source={sub.data?.source}>
          {sub.data ? (fraudSubs.length ? <RankedBars data={fraudSubs as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={160} /> : <EmptyState>No fraud sub-heads recorded for this selection.</EmptyState>) : <Loading />}
        </ChartCard>
        <ChartCard title={`Inside 'Computer related offences', ${year}`} subtitle="IT Act sub-heads. These overlap in everyday meaning with fraud, because many fraud cases are booked here." source={sub.data?.source}>
          {sub.data ? (computerSubs.length ? <RankedBars data={computerSubs as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={160} /> : <EmptyState>No sub-heads recorded for this selection.</EmptyState>) : <Loading />}
        </ChartCard>
      </div>

      <div className="mt-4"><HeadDetail headId={head} /></div>

      <div className="mt-4">
        <Notice tone="warn" title="Read crime heads with care">
          Police in different States book similar crimes under different heads. Karnataka, for example, records most fraud-type cases under IT Act 'Computer related offences', so its figure under the IPC 'Fraud' head is low. The motive table is usually a better comparison for fraud between States.
        </Notice>
      </div>
    </>
  );
}

function HeadDetail({ headId }: { headId: string }) {
  const detail = useApi<CategoryDetail>(`/api/categories/${headId}`);
  return (
    <Async state={detail} height={280}>
      {(d) => (
        <Card>
          <h3 className="text-[15px] font-semibold">{d.label}</h3>
          <p className="text-xs text-ink-2">{d.act}. National trend and States most affected in {d.latest_year}.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <ColumnChart data={d.series as never} x="year" y="cases" name="Cases" fmt={num} height={240} />
            {d.top_states.length ? (
              <RankedBars data={d.top_states.slice(0, 8) as never} label="state_name" value="cases" name="Cases" fmt={num} labelWidth={132} height={240} />
            ) : <EmptyState>No State reported a case in the latest year.</EmptyState>}
          </div>
          <p className="mt-2 text-xs text-ink-2">Financial impact: <strong className="text-ink">Data unavailable.</strong> {d.financial_note}</p>
          <SourceLine source={d.source} />
        </Card>
      )}
    </Async>
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);
  const panel = useMemo(() => `topic-${topic.id}`, [topic.id]);
  return (
    <Card>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{topic.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-2">{topic.what}</span>
        </span>
        <ChevronDown size={18} className={`mt-0.5 shrink-0 text-ink-2 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div id={panel} className="fade-in mt-3 border-t border-line/50 pt-3">
          <TopicStats topic={topic} />
          <List title="How it happens" items={topic.how} />
          <List title="Warning signs" items={topic.signs} />
          <List title="How to prevent it" items={topic.prevent} />
          <p className="mt-3 text-xs text-ink-2">
            Been affected? <Link className="text-accent hover:underline" to="/emergency">See what to do now</Link>.
          </p>
        </div>
      )}
    </Card>
  );
}

function TopicStats({ topic }: { topic: Topic }) {
  const detail = useApi<CategoryDetail>(topic.headId ? `/api/categories/${topic.headId}` : null);
  if (!topic.headId) {
    return (
      <div className="mb-3 rounded-lg border border-dashed border-line p-3 text-xs leading-relaxed text-ink-2">
        <strong className="text-ink">No official statistic.</strong> {topic.headNote}
      </div>
    );
  }
  return (
    <div className="mb-3 rounded-lg bg-surface p-3">
      <Async state={detail} height={150}>
        {(d) => {
          const latest = d.series[d.series.length - 1];
          return (
            <>
              <p className="text-xs text-ink-2">Official head: <strong className="text-ink">{d.label}</strong></p>
              {topic.headNote && <p className="mt-1 text-xs leading-relaxed text-ink-2">{topic.headNote}</p>}
              <p className="num mt-2 text-xl font-semibold">{num(latest?.cases)} <span className="font-sans text-xs font-normal text-ink-2">cases in {d.latest_year}{latest?.yoy_pct != null ? `, ${pct(latest.yoy_pct, 1, true)} on the year before` : ""}</span></p>
              {d.series.length > 1 && <ColumnChart data={d.series as never} x="year" y="cases" name="Cases" fmt={num} height={130} />}
              {d.top_states.length > 0 && (
                <p className="mt-2 text-xs leading-relaxed text-ink-2">
                  Most affected: {d.top_states.slice(0, 3).map((s) => `${s.state_name} (${num(s.cases)})`).join(", ")}.
                </p>
              )}
              <p className="mt-1 text-xs text-ink-2">Financial impact: Data unavailable.</p>
              <SourceLine source={d.source} />
            </>
          );
        }}
      </Async>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-relaxed">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
