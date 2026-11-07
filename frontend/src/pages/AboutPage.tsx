import { Card, PageHeader, SectionTitle } from "../components/ui";

const QUESTIONS = [
  "How has cybercrime changed in India over the last decade?",
  "Which States have the highest reported cases?",
  "Which types of cybercrime are increasing?",
  "How does cybercrime affect different States?",
  "What is the financial impact?",
  "Which categories are most common?",
  "How might trends develop?",
  "How can citizens protect themselves?",
  "Where can victims report and get help?",
];

const FLOW = [
  { title: "Official sources", text: "NCRB, Parliament, PIB, RBI, DataMeet", x: 8 },
  { title: "Raw data", text: "Original files, never overwritten", x: 170 },
  { title: "Python pipeline", text: "Extract, standardise, reconcile", x: 332 },
  { title: "R analysis", text: "Statistics, forecast, figures", x: 494 },
  { title: "SQLite", text: "Separate table per system", x: 656 },
  { title: "FastAPI", text: "Read-only REST API", x: 818 },
  { title: "React site", text: "Leaflet map, Recharts", x: 980 },
];

const METHODS = [
  ["Latest published value", "NCRB revises some figures. Each State and year uses the newest edition that printed it, and every change between editions is logged."],
  ["Reconciliation", "The build checks that States add up to the national total for every year, and that crime heads add up to act totals. Values for 2020-2024 were also compared against a Lok Sabha annexure."],
  ["Rates", "Cases ÷ NCRB's printed mid-year population × 100,000. Computed rates were checked against NCRB's own printed rates."],
  ["Reorganised units", "Today's 36 units are used. D&N Haveli and Daman & Diu are summed before their 2020 merger. J&K before 2020 includes Ladakh, so growth for those two in 2020 is withheld."],
  ["Missing data", "Blank stays blank. A reported zero is shown as zero, and a missing value is grey or 'Data unavailable'."],
  ["Growth", "Annual compound growth over 2021-2024, excluding small starting values so that a change from 2 to 8 cases is not presented as a dramatic trend."],
  ["Forecast", "Five simple models were compared by rolling-origin backtest, and the lowest-error model was selected. NCRP, CERT-In and State series are not forecast."],
];

const LIMITS = [
  "Registered cases measure police recording, not all crime. Rising numbers can reflect more reporting, and many complaints never become cases.",
  "Crime heads depend on how each State's police classify a case, which limits comparison between States.",
  "Population denominators change basis across editions: a 2001 Census-based estimate for 2016-2017, and projections from 2018. Compare distant years' rates with care.",
  "The 2023 and 2024 NCRB volumes were read from a public mirror, because NCRB's table index did not list them. Their totals were cross-checked against Parliament answers.",
  "CERT-In figures for 2016-2020 come from press reports of parliamentary replies, because the archives were not reachable.",
  "State-wise financial data is available only for 2023. No official source gives loss by crime type.",
  "NCRB's latest edition covers 2024. No complete official 2026 figure exists, and 2025 is available only for NCRP and CERT-In.",
  "Boundaries are simplified community data and are not an authoritative depiction of India's external boundaries.",
];

const FUTURE = [
  "Add the 2025 NCRB edition when it is published.",
  "Add State-wise financial data if I4C publishes more years.",
  "Add district and city analysis from NCRB's metropolitan tables.",
  "Replace community boundaries with Survey of India data, if licensing allows it.",
  "Add Hindi and regional-language safety content.",
];

export default function AboutPage() {
  return (
    <div className="fade-in">
      <PageHeader eyebrow="About the project" title="The Decade of Digital Threats">
        Analysing the rise of cybercrimes in India, 2016–2026. A college project combining data science, cybersecurity, geographic information systems and full-stack web development.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <h2 className="text-[15px] font-semibold">Team DataDefenders</h2>
          <ul className="mt-2 space-y-1 text-sm"><li>Adone</li><li>Sanjay</li><li>Abhiraj</li></ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-2">This is an independent academic project. It is not affiliated with or endorsed by any government agency.</p>
        </Card>
        <Card>
          <h2 className="text-[15px] font-semibold">Why this project</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            India's digital growth through UPI, smartphones, internet banking and digital government services has made cybercrime and online financial fraud important security challenges. This portal brings the official records together in one place, while keeping each reporting system's definitions intact.
          </p>
          <h3 className="mt-3 text-sm font-semibold">Questions it answers</h3>
          <ul className="mt-1 grid list-disc gap-x-6 gap-y-0.5 pl-4 text-sm text-ink-2 sm:grid-cols-2">{QUESTIONS.map((q) => <li key={q}>{q}</li>)}</ul>
        </Card>
      </div>

      <SectionTitle title="Architecture">Data moves one way, from source files to the browser. The website never alters the data.</SectionTitle>
      <Card>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Architecture diagram">
          <svg viewBox="0 0 1136 118" className="min-w-[860px]" role="img" aria-label="Official sources flow to raw data, Python pipeline, R analysis, SQLite, FastAPI and the React website">
            <defs>
              <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0 0 8 4 0 8z" fill="#94A3B8" />
              </marker>
            </defs>
            {FLOW.map((node, i) => (
              <g key={node.title}>
                <rect x={node.x} y={12} width={148} height={92} rx={10} fill="#111827" stroke="#2a3650" />
                <text x={node.x + 74} y={46} textAnchor="middle" fill="#F8FAFC" fontSize="14" fontWeight="600">{node.title}</text>
                {wrap(node.text).map((line, n) => (
                  <text key={line} x={node.x + 74} y={68 + n * 16} textAnchor="middle" fill="#94A3B8" fontSize="12">{line}</text>
                ))}
                {i < FLOW.length - 1 && <line x1={node.x + 150} y1={58} x2={node.x + 160} y2={58} stroke="#94A3B8" strokeWidth="1.5" markerEnd="url(#arrow)" />}
              </g>
            ))}
          </svg>
        </div>
      </Card>

      <SectionTitle title="Methodology" />
      <div className="grid gap-3 md:grid-cols-2">
        {METHODS.map(([title, text]) => (
          <Card key={title}><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p></Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-[15px] font-semibold">Limitations</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="text-[15px] font-semibold">Future improvements</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-2">{FUTURE.map((l) => <li key={l}>{l}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}

function wrap(text: string): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > 21) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
