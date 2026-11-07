import { Download, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { apiUrl, type DownloadFile, type Meta, type Source, useApi } from "../api";
import { Async, Card, DataTable, inputClass, Notice, PageHeader, SectionTitle } from "../components/ui";
import { CoverageMatrix } from "./Overview";

const SYSTEMS = [
  { name: "NCRB cases registered", counts: "Cases registered by police under cyber crime heads (FIRs)", who: "State/UT police, compiled by NCRB", scope: "State/UT and national, 2016-2024", caveat: "Excludes complaints that do not become cases." },
  { name: "NCRP financial-fraud complaints", counts: "Complaints from the public, with the amount they report", who: "I4C, Ministry of Home Affairs", scope: "National 2021-2025; State/UT 2023", caveat: "Amounts are unverified and the data is dynamic. Only a small fraction become FIRs." },
  { name: "CERT-In incidents", counts: "Cyber security incidents reported to and tracked by CERT-In", who: "CERT-In, MeitY", scope: "National, 2016-2025", caveat: "Technical incidents, not crimes. No financial loss data." },
  { name: "RBI bank frauds", counts: "Frauds of ₹1 lakh and above reported by banks", who: "Reserve Bank of India", scope: "National, financial years 2022-23 to 2024-25", caveat: "Dated by reporting, and mostly loan fraud by value." },
];

const VERIFY: Record<string, string> = {
  primary: "Official source",
  primary_mirror: "Official report, public mirror",
  secondary: "Press or third-party report",
  secondary_copy: "Copy of official report",
  community: "Community dataset",
};

export default function SourcesPage() {
  const sources = useApi<Source[]>("/api/sources");
  const meta = useApi<Meta>("/api/meta");
  const revisions = useApi<{ scope: string; year: number; published_values: string }[]>("/api/sources/revisions");
  const downloads = useApi<DownloadFile[]>("/api/downloads");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sources.data ?? []).filter((s) => !q || `${s.organization} ${s.report_title} ${s.data_year}`.toLowerCase().includes(q));
  }, [sources.data, query]);

  return (
    <div className="fade-in">
      <PageHeader eyebrow="Data sources and transparency" title="Where every figure comes from">
        Every dataset, what it measures, and its limits. No figure on this site is invented or estimated unless it is clearly labelled as a forecast.
      </PageHeader>

      <SectionTitle title="Four reporting systems, four different things">These are stored and shown separately and are never added together.</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SYSTEMS.map((s) => (
          <Card key={s.name}>
            <h3 className="text-sm font-semibold">{s.name}</h3>
            <dl className="mt-2 space-y-1.5 text-xs leading-relaxed">
              <div><dt className="inline text-ink-3">Counts: </dt><dd className="inline text-ink-2">{s.counts}</dd></div>
              <div><dt className="inline text-ink-3">Compiled by: </dt><dd className="inline text-ink-2">{s.who}</dd></div>
              <div><dt className="inline text-ink-3">Coverage: </dt><dd className="inline text-ink-2">{s.scope}</dd></div>
              <div><dt className="inline text-ink-3">Caveat: </dt><dd className="inline text-ink-2">{s.caveat}</dd></div>
            </dl>
          </Card>
        ))}
      </div>

      <SectionTitle title="Coverage by year" />
      <Card><Async state={meta} height={200}>{(m) => <CoverageMatrix rows={m.coverage} />}</Async></Card>

      <SectionTitle title="Source register" />
      <div className="mb-3 max-w-sm">
        <label htmlFor="source-search" className="mb-1 block text-xs font-medium text-ink-2">Search sources</label>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-3 text-ink-3" aria-hidden />
          <input id="source-search" className={`${inputClass} pl-8`} placeholder="e.g. RBI or 2023" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <Async state={sources} height={320}>
        {() => (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((s) => (
              <Card key={s.source_id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-semibold">{s.report_title}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${s.verification.startsWith("primary") ? "border-good/50 text-good" : "border-warn/50 text-warn"}`}>
                    {VERIFY[s.verification] ?? s.verification}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">{s.organization}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-ink-3">Data year</dt><dd>{s.data_year}</dd>
                  <dt className="text-ink-3">Published</dt><dd>{s.publication_date}</dd>
                  <dt className="text-ink-3">Accessed</dt><dd>{s.access_date}</dd>
                  <dt className="text-ink-3">Table / page</dt><dd>{s.page_reference}</dd>
                  <dt className="text-ink-3">Coverage</dt><dd>{s.coverage}</dd>
                  <dt className="text-ink-3">Units</dt><dd>{s.units}</dd>
                  <dt className="text-ink-3">Limitations</dt><dd className="leading-relaxed text-ink-2">{s.limitations}</dd>
                </dl>
                <a className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-xs text-accent hover:underline" href={s.original_url} target="_blank" rel="noreferrer">
                  {s.original_url} <ExternalLink size={11} className="shrink-0" aria-hidden />
                </a>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-sm text-ink-2">No source matches that search.</p>}
          </div>
        )}
      </Async>

      <SectionTitle title="Revisions between NCRB editions">Published values that later changed. This site uses the latest one.</SectionTitle>
      <Async state={revisions} height={100}>
        {(r) => (
          <DataTable caption="Revisions" rows={r} columns={[
            { label: "Scope", align: "left", render: (x) => (x.scope === "ALL_INDIA" ? "All India" : x.scope) },
            { label: "Year", align: "left", render: (x) => x.year },
            { label: "Published values", align: "left", render: (x) => x.published_values },
          ]} />
        )}
      </Async>

      <SectionTitle title="Download the data">The cleaned tables behind this site, as CSV.</SectionTitle>
      <div className="mb-3">
        <Notice>
          These tables are derived from Government of India publications and are shared for education and research. Cite the original source when you reuse them, and check that publisher's terms for any other use. Boundary data is CC BY 2.5 India, attributed to DataMeet.
        </Notice>
      </div>
      <Async state={downloads} height={200}>
        {(d) => (
          <div className="grid gap-2 md:grid-cols-2">
            {d.map((f) => (
              <a key={f.file} href={apiUrl(f.url)} download className="flex items-center gap-3 rounded-lg border border-line/70 bg-card p-3 text-sm transition-colors hover:border-accent/60">
                <Download size={16} className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0">
                  <span className="block break-all font-medium">{f.file}</span>
                  <span className="block text-xs text-ink-2">{f.description} · {(f.size_bytes / 1024).toFixed(0)} KB</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </Async>
    </div>
  );
}
