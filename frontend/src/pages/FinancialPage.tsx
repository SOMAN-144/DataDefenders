import { useMemo, useState } from "react";
import { type Financial, useApi } from "../api";
import { ColumnChart, RankedBars } from "../components/charts";
import { Async, Card, ChartCard, DataTable, Notice, PageHeader, Select, SectionTitle, SourceLine, StatCard } from "../components/ui";
import { compact, crore, dec, inr, num, pct } from "../format";

export default function FinancialPage() {
  const state = useApi<Financial>("/api/financial");
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Financial impact" title="How much money is reported lost to cyber fraud">
        Figures come from two separate official systems, the National Cyber Crime Reporting Portal and RBI's bank fraud returns. They measure different things and are never added together.
      </PageHeader>
      <Async state={state} height={420}>{(f) => <Content f={f} />}</Async>
    </div>
  );
}

const SORTS = {
  amount_crore: "Amount reported",
  complaints: "Complaints",
  average_reported_inr: "Average per complaint",
  complaints_per_100k: "Complaints per 100,000",
  lien_pct: "Share marked as lien",
} as const;
type SortKey = keyof typeof SORTS;

function Content({ f }: { f: Financial }) {
  const [sort, setSort] = useState<SortKey>("amount_crore");
  const latest = f.national[f.national.length - 1];
  const total = f.national.reduce((sum, n) => sum + n.amount_crore, 0);
  const peak = f.national.reduce((best, n) => (n.amount_crore > best.amount_crore ? n : best));
  const sorted = useMemo(() => [...f.states].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1)), [f.states, sort]);
  const card = f.bank_fraud.filter((b) => b.area === "Card/Internet");
  const bankTotal = f.bank_fraud.filter((b) => b.area === "Total");
  const fys = bankTotal.map((b) => b.financial_year);
  const areas = [...new Set(f.bank_fraud.map((b) => b.area))];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Reported, ${f.national[0].year}–${latest.year}`} value={crore(total)} tone="warn" detail={`${num(f.national.reduce((s, n) => s + n.complaints, 0))} complaints`} tip="Sum of the yearly NCRP table. Amounts are as reported by complainants." />
        <StatCard label={`Reported in ${latest.year}`} value={crore(latest.amount_crore)} tone="warn" detail={`${pct(latest.amount_yoy_pct, 1, true)} on ${latest.year - 1}`} />
        <StatCard label="Highest year" value={peak.year} tone="bad" detail={crore(peak.amount_crore)} />
        <StatCard label={`Average per complaint, ${latest.year}`} value={inr(latest.average_reported_inr)} tone="violet" detail="Amount ÷ complaints in the same table" />
      </div>

      <div className="mt-4">
        <Notice title="What 'reported' means">
          These are amounts complainants entered on NCRP. They are not audited losses, and the system is updated continuously, so replies given at different times differ slightly. {f.cumulative_note.text}
        </Notice>
      </div>

      <SectionTitle title="Year-wise trend (NCRP)" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Amount reported" subtitle="₹ crore, 2021–2025" source={f.sources.national}
          table={{ rows: f.national, columns: [
            { label: "Year", align: "left", render: (r) => r.year },
            { label: "Amount", render: (r) => crore(r.amount_crore) },
            { label: "Growth", render: (r) => pct(r.amount_yoy_pct, 1, true) },
          ] }}>
          <ColumnChart data={f.national as never} x="year" y="amount_crore" name="Amount reported" fmt={(v) => crore(v)} axisFmt={(v) => `₹${compact(v)}`} color="#F59E0B" />
        </ChartCard>
        <ChartCard title="Financial-fraud complaints" subtitle="Number of complaints, 2021–2025" source={f.sources.national}
          table={{ rows: f.national, columns: [
            { label: "Year", align: "left", render: (r) => r.year },
            { label: "Complaints", render: (r) => num(r.complaints) },
            { label: "Growth", render: (r) => pct(r.complaints_yoy_pct, 1, true) },
            { label: "Average", render: (r) => inr(r.average_reported_inr) },
          ] }}>
          <ColumnChart data={f.national as never} x="year" y="complaints" name="Complaints" fmt={num} />
        </ChartCard>
      </div>

      <SectionTitle title="State-wise impact, 2023">
        The only complete State/UT table we could verify. Other years show as Data unavailable. Its national sum differs slightly from the later yearly figure because it was an earlier snapshot.
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ChartCard title="Top 12 States/UTs" subtitle={SORTS[sort]} source={f.sources.states}
          actions={<div className="w-44"><Select label="Measure" value={sort} onChange={(v) => setSort(v as SortKey)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></div>}>
          <RankedBars
            data={sorted.slice(0, 12) as never} label="state_name" value={sort} name={SORTS[sort]} color="#F59E0B"
            fmt={(v) => (sort === "amount_crore" ? crore(v, 1) : sort === "average_reported_inr" ? inr(v) : sort === "complaints" ? num(v) : sort === "lien_pct" ? pct(v) : dec(v))}
          />
        </ChartCard>
        <Card>
          <h3 className="mb-3 text-[15px] font-semibold">All States and UTs, 2023</h3>
          <DataTable
            caption="State-wise NCRP data for 2023" rows={sorted} maxHeight="440px"
            columns={[
              { label: "State/UT", align: "left", render: (r) => r.state_name },
              { label: "Amount", render: (r) => crore(r.amount_crore, 1) },
              { label: "Complaints", render: (r) => num(r.complaints) },
              { label: "Average", render: (r) => inr(r.average_reported_inr) },
              { label: "Lien", render: (r) => pct(r.lien_pct) },
            ]}
          />
          <SourceLine source={f.sources.states} extra="Lien is money marked and held in the receiving account, not necessarily money returned to the victim." />
        </Card>
      </div>

      <SectionTitle title="Bank-reported fraud (RBI)">
        A separate system: frauds of ₹1 lakh and above reported by banks, by financial year. Only 'Card/Internet' relates closely to cybercrime. Most of the value is in loan fraud.
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ChartCard title="Card/Internet frauds reported by banks" subtitle="Number of frauds" source={f.sources.bank_fraud}
          sourceExtra="Based on the reporting date. Frauds may have occurred in earlier years.">
          <ColumnChart data={card as never} x="financial_year" y="frauds" name="Frauds" fmt={num} height={250} color="#8B5CF6" />
        </ChartCard>
        <Card>
          <h3 className="mb-3 text-[15px] font-semibold">Frauds by area of operation</h3>
          <DataTable
            caption="RBI bank frauds by area of operation" rows={areas} maxHeight="300px"
            columns={[
              { label: "Area", align: "left", render: (a) => a },
              ...fys.flatMap((fy) => [
                { label: `${fy} no.`, render: (a: string) => num(f.bank_fraud.find((b) => b.area === a && b.financial_year === fy)?.frauds) },
                { label: `${fy} ₹ cr`, render: (a: string) => num(f.bank_fraud.find((b) => b.area === a && b.financial_year === fy)?.amount_crore) },
              ]),
            ]}
          />
          <SourceLine source={f.sources.bank_fraud} />
        </Card>
      </div>

      <SectionTitle title="What is not available" />
      <Card>
        <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">
          {f.unavailable.map((u) => <li key={u}>{u}</li>)}
        </ul>
      </Card>
    </>
  );
}
