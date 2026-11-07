import { Link } from "react-router-dom";
import { type Forecast, type NationalTrend, type Trends, useApi } from "../api";
import { ColumnChart, ForecastChart, LineSeries, RankedBars } from "../components/charts";
import { Async, Card, ChartCard, DataTable, Notice, PageHeader, SectionTitle, SourceLine } from "../components/ui";
import { crore, num, pct } from "../format";

export default function TrendsPage() {
  const trends = useApi<Trends>("/api/trends");
  const forecast = useApi<Forecast>("/api/forecast");
  const national = useApi<NationalTrend>("/api/national/trend");
  return (
    <div className="fade-in">
      <PageHeader eyebrow="Trends and predictions" title="What has changed, and what might come next">
        Growth is shown as an annual compound rate over 2021–2024, leaving out very small bases where percentages mislead. Reported cases also reflect reporting behaviour and police registration, not only underlying crime.
      </PageHeader>
      <Async state={trends} height={360}>{(t) => <TrendSection t={t} />}</Async>

      <SectionTitle title="Other official series">These come from separate reporting systems and are charted separately.</SectionTitle>
      <Async state={national} height={280}>
        {(n) => (
          <ChartCard
            title="Cyber security incidents handled by CERT-In"
            subtitle="Technical incidents, including those affecting organisations. Not crimes and not comparable with NCRB cases."
            source={{ source_id: "pib_2244504", organization: "Press Information Bureau / MeitY", report_title: "Assistance to States to Tackle Cyber Incidents (2021-2025)", original_url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244504&reg=3&lang=1", page_reference: "Year-wise table", verification: "primary" }}
            sourceExtra="2016-2020 values are from press reports of parliamentary replies, listed on the Data Sources page. The steep rises may partly reflect changes in detection and reporting."
            table={{ rows: n.cert_in, columns: [
              { label: "Year", align: "left", render: (r) => r.year },
              { label: "Incidents", render: (r) => num(r.incidents) },
              { label: "Growth", render: (r) => pct(r.yoy_pct, 1, true) },
              { label: "Source type", align: "left", render: (r) => (r.verification === "primary" ? "Official" : "Press report of official reply") },
            ] }}
          >
            <ColumnChart data={n.cert_in as never} x="year" y="incidents" name="Incidents" fmt={num} color="#8B5CF6" />
          </ChartCard>
        )}
      </Async>

      <SectionTitle title="Forecast of registered cases">A simple statistical estimate produced in R, with its weaknesses shown alongside.</SectionTitle>
      <Async state={forecast} height={380}>{(f) => <ForecastSection f={f} />}</Async>
    </div>
  );
}

function TrendSection({ t }: { t: Trends }) {
  const headData = t.growing_heads.slice(0, 8);
  const period = `${t.window[0]}–${t.window[1]}`;
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={`Fastest-growing crime heads, ${period}`} subtitle="Compound annual growth. At least 50 cases in 2021." source={t.source}
          table={{ rows: t.growing_heads, columns: [
            { label: "Crime head", align: "left", render: (r) => r.label },
            { label: "2021", render: (r) => num(r.start_cases) },
            { label: "2024", render: (r) => num(r.end_cases) },
            { label: "A year", render: (r) => pct(r.cagr_pct, 1, true) },
          ] }}>
          <RankedBars data={headData as never} label="label" value="cagr_pct" name="Annual growth" fmt={(v) => pct(v, 1, true)} labelWidth={160} color="#E0479E" />
        </ChartCard>
        <Card>
          <h3 className="mb-3 text-[15px] font-semibold">Declining crime heads, {period}</h3>
          <DataTable caption="Declining crime heads" rows={t.declining_heads} maxHeight="280px" columns={[
            { label: "Crime head", align: "left", render: (r) => r.label },
            { label: "2021", render: (r) => num(r.start_cases) },
            { label: "2024", render: (r) => num(r.end_cases) },
            { label: "A year", render: (r) => pct(r.cagr_pct, 1, true) },
          ]} />
          <SourceLine source={t.source} extra="A falling head may reflect reclassification, particularly with the IPC-to-BNS change in 2024." />
        </Card>
        <ChartCard title={`States with the fastest rise, ${period}`} subtitle="At least 100 cases in 2021." source={t.source}
          table={{ rows: t.growing_states, columns: [
            { label: "State/UT", align: "left", render: (r) => r.state_name },
            { label: "2021", render: (r) => num(r.start_cases) },
            { label: "2024", render: (r) => num(r.end_cases) },
            { label: "A year", render: (r) => pct(r.cagr_pct, 1, true) },
          ] }}>
          <RankedBars data={t.growing_states as never} label="state_name" value="cagr_pct" name="Annual growth" fmt={(v) => pct(v, 1, true)} color="#0B9FCC" />
        </ChartCard>
        <Card>
          <h3 className="mb-3 text-[15px] font-semibold">States with falling counts, {period}</h3>
          <DataTable caption="States with falling counts" rows={t.declining_states} maxHeight="320px" columns={[
            { label: "State/UT", align: "left", render: (r) => <Link className="font-sans hover:text-accent" to={`/states/${r.state_code}`}>{r.state_name}</Link> },
            { label: "2021", render: (r) => num(r.start_cases) },
            { label: "2024", render: (r) => num(r.end_cases) },
            { label: "A year", render: (r) => pct(r.cagr_pct, 1, true) },
          ]} />
          <SourceLine source={t.source} />
        </Card>
        <ChartCard title="Share of cases with a fraud motive" subtitle="Fraud as a percentage of all cases with a recorded motive, NCRB Table 9A.3." source={t.source}
          table={{ rows: t.fraud_motive_share, columns: [
            { label: "Year", align: "left", render: (r) => r.year },
            { label: "Fraud", render: (r) => num(r.fraud) },
            { label: "Total", render: (r) => num(r.total) },
            { label: "Share", render: (r) => pct(r.share) },
          ] }}>
          <LineSeries data={t.fraud_motive_share as never} x="year" series={[{ key: "share", name: "Fraud share" }]} fmt={(v) => pct(v)} axisFmt={(v) => `${v}%`} />
        </ChartCard>
        <Card>
          <h3 className="mb-3 text-[15px] font-semibold">Significant year-to-year changes</h3>
          <p className="mb-2 text-xs text-ink-2">Moves of 25% or more.</p>
          <DataTable caption="Significant changes in registered cases" rows={t.significant_national_changes} columns={[
            { label: "NCRB cases", align: "left", render: (r) => r.year },
            { label: "From", render: (r) => num(r.from) },
            { label: "To", render: (r) => num(r.to) },
            { label: "Change", render: (r) => pct(r.pct, 1, true) },
          ]} />
          <div className="mt-3">
            <DataTable caption="Significant changes in NCRP amount" rows={t.significant_financial_changes} columns={[
              { label: "NCRP amount", align: "left", render: (r) => r.year },
              { label: "From", render: (r) => crore(r.from) },
              { label: "To", render: (r) => crore(r.to) },
              { label: "Change", render: (r) => pct(r.pct, 1, true) },
            ]} />
          </div>
          <SourceLine source={t.source} />
        </Card>
      </div>
    </>
  );
}

function ForecastSection({ f }: { f: Forecast }) {
  const lastYear = f.history[f.history.length - 1].year;
  const rows = [
    ...f.history.map((h) => ({
      year: h.year,
      actual: h.cases,
      // Joins the dashed estimate to the last reported value.
      predicted: h.year === lastYear ? h.cases : null,
      band: null,
      lower_95: null,
      upper_95: null,
    })),
    ...f.forecast.map((p) => ({
      year: p.year, actual: null, predicted: p.predicted, band: [p.lower_95, p.upper_95], lower_95: p.lower_95, upper_95: p.upper_95,
    })),
  ];
  return (
    <>
      <Notice tone="warn" title={f.label}>
        The dashed line and shaded band are model outputs, not official or reported figures. They should not be quoted as statistics.
      </Notice>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ChartCard
          title={`Registered cases with estimates for ${f.forecast[0].year}–${f.forecast[f.forecast.length - 1].year}`}
          subtitle={`Model: ${f.selected_model.model}, chosen because it had the lowest error on years it had not seen.`}
          sourceExtra="Produced by analysis/R/analysis.R from NCRB annual totals, 2016-2024."
          table={{ rows: f.forecast, columns: [
            { label: "Year", align: "left", render: (r) => `${r.year} (estimate)` },
            { label: "Estimate", render: (r) => num(r.predicted) },
            { label: "95% low", render: (r) => num(r.lower_95) },
            { label: "95% high", render: (r) => num(r.upper_95) },
          ] }}
        >
          <ForecastChart data={rows} boundary={lastYear} fmt={num} />
        </ChartCard>
        <Card>
          <h3 className="mb-2 text-[15px] font-semibold">How the model was chosen</h3>
          <p className="mb-3 text-xs leading-relaxed text-ink-2">
            Each model was refitted using only data up to 2020, 2021, 2022 and 2023, then scored on the following years. Lower MAPE (mean absolute percentage error) is better.
          </p>
          <DataTable caption="Model comparison" rows={f.models} columns={[
            { label: "Model", align: "left", render: (m) => <span className={m.selected ? "font-sans font-semibold text-accent" : "font-sans"}>{m.model}{m.selected ? " (selected)" : ""}</span> },
            { label: "MAPE", render: (m) => pct(m.mape) },
            { label: "95% hit", render: (m) => pct(m.interval_coverage_pct, 0) },
          ]} />
          <h3 className="mb-2 mt-4 text-sm font-semibold">Test: forecast made using data to 2021</h3>
          <DataTable caption="Backtest" rows={f.backtest} columns={[
            { label: "Year", align: "left", render: (b) => b.year },
            { label: "Actual", render: (b) => num(b.actual) },
            { label: "Predicted", render: (b) => num(b.predicted) },
            { label: "Error", render: (b) => pct(b.error_pct, 1, true) },
          ]} />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-[15px] font-semibold">Limitations</h3>
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">
            {f.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-2 text-[15px] font-semibold">Deliberately not forecast</h3>
          <dl className="space-y-2 text-sm leading-relaxed">
            {f.not_forecast.map((n) => (
              <div key={n.dataset}><dt className="font-medium">{n.dataset}</dt><dd className="text-ink-2">{n.reason}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
