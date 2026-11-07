import { AlertTriangle, ExternalLink, FileText, Info, RefreshCw, Table2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import type { Loadable, SourceRef } from "../api";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">{children}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line/70 bg-card p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 mt-9">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{children}</p>}
    </div>
  );
}

const VERIFY_LABEL: Record<string, string> = {
  primary: "Official source",
  primary_mirror: "Official report, public mirror",
  secondary: "Press report of an official reply",
  secondary_copy: "Copy of an official report",
  community: "Community dataset",
};

export function SourceLine({ source, extra }: { source?: SourceRef | null; extra?: string }) {
  const [open, setOpen] = useState(false);
  if (!source) return <p className="mt-3 text-xs text-ink-3">{extra}</p>;
  return (
    <div className="mt-3 border-t border-line/50 pt-2 text-xs text-ink-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded text-left hover:text-ink"
      >
        <FileText size={12} aria-hidden className="shrink-0" />
        <span>Source: {source.organization}, {source.report_title}</span>
      </button>
      {extra && <p className="mt-1 text-ink-3">{extra}</p>}
      {open && (
        <dl className="fade-in mt-2 grid gap-x-3 gap-y-1 rounded-lg bg-surface p-3 sm:grid-cols-[auto_1fr]">
          <dt className="text-ink-3">Reference</dt>
          <dd>{source.page_reference ?? "n/a"}</dd>
          <dt className="text-ink-3">Status</dt>
          <dd>{VERIFY_LABEL[source.verification] ?? source.verification}</dd>
          <dt className="text-ink-3">Link</dt>
          <dd className="min-w-0 break-words">
            <a className="text-accent underline-offset-2 hover:underline" href={source.original_url} target="_blank" rel="noreferrer">
              {source.original_url} <ExternalLink size={10} className="inline" aria-hidden />
            </a>
          </dd>
        </dl>
      )}
    </div>
  );
}

export interface TableColumn<T> { label: string; render: (row: T) => ReactNode; align?: "left" | "right" }

export function DataTable<T>({ columns, rows, caption, maxHeight }: { columns: TableColumn<T>[]; rows: T[]; caption?: string; maxHeight?: string }) {
  return (
    <div className="relative overflow-auto rounded-lg border border-line/50" style={{ maxHeight }} tabIndex={0} role="region" aria-label={caption ?? "Data table"}>
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 z-10 bg-surface text-xs text-ink-2">
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium ${c.align === "left" ? "text-left" : "text-right"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line/40 hover:bg-card-hi/60">
              {columns.map((c) => (
                <td key={c.label} className={`px-3 py-1.5 ${c.align === "left" ? "text-left" : "num text-right"}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A chart with a title, a source panel, and a table view of the same numbers. */
export function ChartCard<T>({
  title, subtitle, source, sourceExtra, table, children, className = "", actions,
}: {
  title: string;
  subtitle?: string;
  source?: SourceRef | null;
  sourceExtra?: string;
  table?: { columns: TableColumn<T>[]; rows: T[] };
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card className={`flex min-w-0 flex-col ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {table && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-accent/60 hover:text-ink"
            >
              <Table2 size={12} aria-hidden /> {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        {showTable && table ? <DataTable columns={table.columns} rows={table.rows} caption={title} maxHeight="320px" /> : children}
      </div>
      <SourceLine source={source} extra={sourceExtra} />
    </Card>
  );
}

export function StatCard({ label, value, detail, tip, tone }: { label: string; value: ReactNode; detail?: ReactNode; tip?: string; tone?: "accent" | "violet" | "warn" | "bad" }) {
  const bar = { accent: "bg-accent", violet: "bg-accent-2", warn: "bg-warn", bad: "bg-bad" }[tone ?? "accent"];
  return (
    <Card className="relative overflow-hidden transition-colors hover:border-accent/40">
      <span className={`absolute left-0 top-4 h-8 w-[3px] rounded-r ${bar}`} aria-hidden />
      <p className="flex items-center gap-1 text-xs font-medium text-ink-2">
        {label} {tip && <Hint text={tip} />}
      </p>
      <p className="num mt-2 text-[22px] font-semibold leading-tight sm:text-2xl">{value}</p>
      {detail && <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{detail}</p>}
    </Card>
  );
}

export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={text}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="text-ink-3 hover:text-ink"
      >
        <Info size={12} aria-hidden />
      </button>
      {open && (
        <span role="tooltip" className="absolute left-1/2 top-5 z-30 w-52 -translate-x-1/2 rounded-lg border border-line bg-surface p-2 text-xs font-normal leading-relaxed text-ink shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">{label}</label>
      {children(id)}
    </div>
  );
}

export const inputClass =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-accent/50 focus:border-accent focus:outline-none";

export function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      <div role="group" aria-label={label} className="flex rounded-lg border border-line bg-surface p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${value === o.id ? "bg-accent/15 font-medium text-accent" : "text-ink-2 hover:text-ink"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Loading({ label = "Loading data", height = 220 }: { label?: string; height?: number }) {
  return (
    <div role="status" aria-label={label} className="flex animate-pulse flex-col justify-end gap-2 rounded-lg bg-surface/60 p-4" style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {[40, 55, 35, 70, 60, 85, 75, 95].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-line/50" style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-bad/40 bg-bad/10 p-4 text-sm">
      <AlertTriangle size={16} className="shrink-0 text-bad" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs hover:border-accent">
          <RefreshCw size={12} aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "Data unavailable", children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface/40 p-5 text-center text-sm">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-2">{children}</p>}
    </div>
  );
}

/** Standard loading and error handling around an API result. */
export function Async<T>({ state, children, height }: { state: Loadable<T>; children: (data: T) => ReactNode; height?: number }) {
  if (state.error) return <ErrorState message={state.error} onRetry={state.retry} />;
  if (state.loading || state.data == null) return <Loading height={height} />;
  return <>{children(state.data)}</>;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn"; title?: string; children: ReactNode }) {
  const style = tone === "warn" ? "border-warn/40 bg-warn/10" : "border-accent/30 bg-accent/5";
  const Icon = tone === "warn" ? AlertTriangle : Info;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${style}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone === "warn" ? "text-warn" : "text-accent"}`} aria-hidden />
      <div className="min-w-0">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="text-ink-2">{children}</div>
      </div>
    </div>
  );
}
