import { Map as MapIcon, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type HeadChange, type Meta, type StateInfo, type StateProfile, useApi } from "../api";
import { LineSeries, RankedBars, SERIES } from "../components/charts";
import { Async, Card, ChartCard, EmptyState, inputClass, Notice, PageHeader, Select, SectionTitle, SourceLine, StatCard } from "../components/ui";
import { crore, dec, inr, num, pct } from "../format";

const DEFAULT_STATE = "KA";

export default function StatesPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const meta = useApi<Meta>("/api/meta");
  const selected = (code ?? DEFAULT_STATE).toUpperCase();

  return (
    <div className="fade-in">
      <PageHeader eyebrow="State analysis" title="Every State and Union Territory, on the same structure" />
      <Async state={meta} height={500}>
        {(m) => (
          <>
            <StatePicker states={m.states} value={selected} onChange={(c) => navigate(`/states/${c}`)} />
            <StateReport code={selected} states={m.states} />
          </>
        )}
      </Async>
    </div>
  );
}

function StatePicker({ states, value, onChange }: { states: StateInfo[]; value: string; onChange: (code: string) => void }) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return states.filter((s) => s.state_name.toLowerCase().includes(q) || s.state_code === value);
  }, [filter, states, value]);
  return (
    <Card className="mb-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="state-filter" className="text-xs font-medium text-ink-2">Search</label>
          <input id="state-filter" className={inputClass} placeholder="Type a name to filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <Select label="State or Union Territory" value={value} onChange={onChange}>
          <optgroup label="States">{visible.filter((s) => s.kind === "State").map((s) => <option key={s.state_code} value={s.state_code}>{s.state_name}</option>)}</optgroup>
          <optgroup label="Union Territories">{visible.filter((s) => s.kind === "UT").map((s) => <option key={s.state_code} value={s.state_code}>{s.state_name}</option>)}</optgroup>
        </Select>
        <Link to={`/map?state=${value}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent/60">
          <MapIcon size={14} aria-hidden /> View on map
        </Link>
      </div>
    </Card>
  );
}

function StateReport({ code, states }: { code: string; states: StateInfo[] }) {
  const profile = useApi<StateProfile>(`/api/states/${code}`);
  return (
    <Async state={profile} height={500}>
      {(p) => (
        <div className="fade-in">
          <h2 className="text-2xl font-bold tracking-tight">{p.state_name}</h2>
          <p className="mb-4 text-sm text-ink-2">{p.kind === "UT" ? "Union Territory" : "State"} · {p.region} region</p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={`Reported cases, ${p.latest_year}`} value={num(p.overview.cases)} detail={p.overview.case_rank ? `Rank #${p.overview.case_rank} of ${p.overview.ranked_units} reporting units` : undefined} />
            <StatCard label="Rate per 100,000" tone="violet" value={p.overview.rate == null ? "Data unavailable" : dec(p.overview.rate)} detail={`National ${dec(p.overview.national_rate)}${p.overview.rate_rank ? `. Rank #${p.overview.rate_rank}` : ""}`} />
            <StatCard label="Share of national cases" tone="warn" value={pct(p.overview.share)} detail="State and national figures from the same table" />
            <StatCard label="Year-over-year growth" tone="bad" value={pct(p.overview.growth, 1, true)} detail={`${p.latest_year - 1} to ${p.latest_year}`} />
          </div>

          <SectionTitle title="Year-wise cases and national comparison" />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Reported cases by year" subtitle="NCRB, latest published value for each year." source={p.sources[p.sources.length - 1]}
              table={{ rows: p.series, columns: [
                { label: "Year", align: "left", render: (r) => r.year },
                { label: "Cases", render: (r) => num(r.cases) },
                { label: "Growth", render: (r) => pct(r.yoy_pct, 1, true) },
                { label: "Share", render: (r) => pct(r.share) },
              ] }}
            >
              <LineSeries data={p.series as never} x="year" series={[{ key: "cases", name: "Cases" }]} fmt={num} />
            </ChartCard>
            <ChartCard
              title="Rate per 100,000: State and India" subtitle="Both use NCRB's population for that year." source={p.sources[p.sources.length - 1]}
              sourceExtra="The population basis changes across editions, so compare distant years with care."
              table={{ rows: p.series, columns: [
                { label: "Year", align: "left", render: (r) => r.year },
                { label: p.state_name, render: (r) => dec(r.rate) },
                { label: "India", render: (r) => dec(r.national_rate) },
              ] }}
            >
              <LineSeries data={p.series as never} x="year" fmt={(v) => dec(v)} axisFmt={(v) => `${v}`}
                series={[{ key: "rate", name: p.state_name, color: SERIES[0] }, { key: "national_rate", name: "India", color: SERIES[2], dash: "5 4" }]} />
            </ChartCard>
          </div>

          <SectionTitle title="Crime categories">
            NCRB's classification. It depends on how police record a case, so large differences between States can reflect practice as well as crime.
          </SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={`Crime heads, ${p.latest_year}`} source={p.categories.source}
              table={{ rows: p.categories.heads.filter((h) => h.cases != null), columns: [
                { label: "Crime head", align: "left", render: (r) => r.label },
                { label: "Cases", render: (r) => num(r.cases) },
                { label: "Share", render: (r) => pct(r.share) },
              ] }}
            >
              {p.categories.heads.some((h) => h.cases) ? (
                <RankedBars data={p.categories.heads.filter((h) => h.cases).slice(0, 8) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={150} />
              ) : <EmptyState>No crime head data is reported for this year.</EmptyState>}
            </ChartCard>
            <ChartCard
              title={`Recorded motives, ${p.latest_year}`} source={p.motives.source}
              table={{ rows: p.motives.motives, columns: [
                { label: "Motive", align: "left", render: (r) => r.label },
                { label: "Cases", render: (r) => num(r.cases) },
                { label: "Share", render: (r) => pct(r.share) },
              ] }}
            >
              {p.motives.motives.some((m) => m.cases) ? (
                <RankedBars data={p.motives.motives.filter((m) => m.cases).slice(0, 8) as never} label="label" value="cases" name="Cases" fmt={num} labelWidth={150} color="#8B5CF6" />
              ) : <EmptyState>No motive data is reported for this year.</EmptyState>}
            </ChartCard>
          </div>

          <SectionTitle title="Financial impact">
            Complaints on the National Cyber Crime Reporting Portal. These are not the same incidents as NCRB cases, so no average per NCRB case is calculated.
          </SectionTitle>
          <Card>
            {p.financial ? (
              <>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Fin label={`Amount reported, ${p.financial.year}`} value={crore(p.financial.amount_crore, 2)} detail={p.financial_rank ? `Rank #${p.financial_rank} of 36` : undefined} />
                  <Fin label="Complaints" value={num(p.financial.complaints)} />
                  <Fin label="Average per complaint" value={inr(p.financial.average_reported_inr)} detail="Same table, so valid" />
                  <Fin label="Marked as lien" value={crore(p.financial.lien_crore, 2)} detail={`${pct((p.financial.lien_crore / p.financial.amount_crore) * 100)} of the amount`} />
                </dl>
                <p className="mt-3 text-xs text-ink-2">
                  Other years: <strong className="text-ink">Data unavailable</strong>. 2023 is the only complete State-wise table that could be verified. Amounts are as reported by complainants.
                </p>
              </>
            ) : <EmptyState />}
            <SourceLine source={p.financial_source} />
          </Card>

          <SectionTitle title="Regional comparison">{p.state_name} and the other {p.region} region States and UTs, {p.latest_year}.</SectionTitle>
          <ChartCard<StateProfile["regional_peers"][number]>
            title={`${p.region} region: reported cases`} source={p.categories.source}
            table={{ rows: p.regional_peers, columns: [
              { label: "State/UT", align: "left", render: (r) => r.state_name },
              { label: "Cases", render: (r) => num(r.cases) },
              { label: "Rate", render: (r) => dec(r.rate) },
            ] }}
          >
            <RankedBars data={p.regional_peers as never} label="state_name" value="cases" name="Cases" fmt={num} labelWidth={150} />
          </ChartCard>

          <SectionTitle title="Key observations">Generated from the data for this State. No text here is hand-written for a particular State.</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="mb-2 text-sm font-semibold">Observations</h3>
              <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">
                {p.insights.observations.map((o) => <li key={o}>{o}</li>)}
                {p.insights.peak && <li>Highest recorded year: {p.insights.peak.year} ({num(p.insights.peak.cases)} cases).</li>}
              </ul>
            </Card>
            <Changes title="Increasing categories" icon={<TrendingUp size={15} className="text-bad" aria-hidden />} rows={p.insights.increasing} empty="No category with at least 20 cases in 2021 increased." />
            <Changes title="Decreasing categories" icon={<TrendingDown size={15} className="text-good" aria-hidden />} rows={p.insights.decreasing} empty="No category with at least 20 cases in 2021 decreased." />
          </div>

          <SectionTitle title="Reporting and help">
            For new financial fraud, call <a className="text-accent hover:underline" href="tel:1930">1930</a> first. These State contacts are for following up a portal complaint.
          </SectionTitle>
          <Card>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-2">Cyber crime office email</dt>
                <dd className="break-all">{p.contact ? <a className="text-accent hover:underline" href={`mailto:${p.contact.email}`}>{p.contact.email}</a> : "Data unavailable"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">Published phone number</dt>
                <dd className="num">{p.contact?.phone ?? <span className="font-sans">Not listed by the portal</span>}</dd>
              </div>
            </dl>
            <SourceLine source={p.contact_source} />
          </Card>

          <SectionTitle title="Data sources and limitations" />
          <Card>
            {p.notes.length > 0 ? (
              <ul className="mb-3 space-y-1.5 text-sm leading-relaxed text-ink-2">
                {p.notes.map((n) => <li key={`${n.year}-${n.note}`}><strong className="text-ink">{n.year ?? "All years"}:</strong> {n.note}</li>)}
              </ul>
            ) : <p className="mb-3 text-sm text-ink-2">No State-specific data notes. General limitations are on the Data Sources page.</p>}
            <Notice>NCRB cautions that States and UTs may not be compared purely on crime figures. Higher counts can reflect better reporting and registration as well as more crime.</Notice>
            <ul className="mt-3 grid gap-1 text-xs text-ink-2 sm:grid-cols-2">
              {p.sources.map((s) => (
                <li key={s.source_id}><a className="text-accent hover:underline" href={s.original_url} target="_blank" rel="noreferrer">{s.report_title}</a></li>
              ))}
            </ul>
          </Card>
          <CompareBlock base={p} states={states} />
        </div>
      )}
    </Async>
  );
}

function Fin({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-2">{label}</dt>
      <dd className="num mt-1 text-lg font-semibold">{value}</dd>
      {detail && <dd className="mt-0.5 text-[11px] text-ink-3">{detail}</dd>}
    </div>
  );
}

function Changes({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: HeadChange[]; empty: string }) {
  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">{icon} {title}, 2021–2024</h3>
      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.head_id}>
              <span className="block leading-snug">{r.label}</span>
              <span className="num text-xs text-ink-2">{num(r.start_cases)} to {num(r.end_cases)} ({pct(r.cagr_pct, 1, true)} a year)</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-ink-2">{empty}</p>}
    </Card>
  );
}

interface CompareData { series: Record<string, { year: number; cases: number | null; rate: number | null }[]> }

function CompareBlock({ base, states }: { base: StateProfile; states: StateInfo[] }) {
  const [others, setOthers] = useState<string[]>(base.state_code === "TG" ? ["KA"] : ["TG"]);
  const [metric, setMetric] = useState<"cases" | "rate">("rate");
  useEffect(() => {
    setOthers((current) => current.filter((c) => c !== base.state_code));
  }, [base.state_code]);
  const codes = [base.state_code, ...others];
  const compare = useApi<CompareData>(`/api/comparison/states?codes=${codes.join(",")}`);
  const names = useMemo(() => new Map(states.map((s) => [s.state_code, s.state_name])), [states]);
  const rows = useMemo(() => {
    if (!compare.data) return [];
    const years = Object.values(compare.data.series).flat().map((p) => p.year);
    return [...new Set(years)].sort().map((year) => {
      const row: Record<string, number | null> = { year };
      for (const code of codes) row[code] = compare.data!.series[code]?.find((p) => p.year === year)?.[metric] ?? null;
      return row;
    });
    // codes is derived from others and the state code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compare.data, metric]);

  return (
    <>
      <SectionTitle title="Compare with other States">Add up to three more States or UTs.</SectionTitle>
      <ChartCard title={metric === "rate" ? "Rate per 100,000" : "Reported cases"} source={base.sources[base.sources.length - 1]}>
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_180px]">
          <div className="flex flex-col gap-1">
            <label htmlFor="add-state" className="text-xs font-medium text-ink-2">Add a State or UT</label>
            <select
              id="add-state" className={inputClass} value="" disabled={others.length >= 3}
              onChange={(e) => e.target.value && setOthers((c) => [...c, e.target.value])}
            >
              <option value="">{others.length >= 3 ? "Maximum reached" : "Choose..."}</option>
              {states.filter((s) => !codes.includes(s.state_code)).map((s) => <option key={s.state_code} value={s.state_code}>{s.state_name}</option>)}
            </select>
          </div>
          <Select label="Measure" value={metric} onChange={(v) => setMetric(v as "cases" | "rate")}>
            <option value="rate">Rate per 100,000</option>
            <option value="cases">Reported cases</option>
          </Select>
        </div>
        {others.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {others.map((c) => (
              <li key={c}>
                <button type="button" onClick={() => setOthers((list) => list.filter((x) => x !== c))} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2 hover:border-bad hover:text-ink" aria-label={`Remove ${names.get(c)}`}>
                  {names.get(c)} ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <LineSeries
          data={rows as never} x="year" fmt={(v) => (metric === "rate" ? dec(v) : num(v))} axisFmt={metric === "rate" ? (v) => `${v}` : undefined}
          series={codes.map((c, i) => ({ key: c, name: names.get(c) ?? c, color: SERIES[i], dash: ["", "6 3", "2 3", "8 3 2 3"][i] || undefined }))}
        />
      </ChartCard>
    </>
  );
}
