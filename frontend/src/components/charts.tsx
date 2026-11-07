import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact } from "../format";

// Validated against the #172033 card surface with the dataviz palette checker.
export const SERIES = ["#0B9FCC", "#8B5CF6", "#C77F00", "#E0479E"];
export const SINGLE = "#00D4FF";
const GRID = "#2a3650";
const AXIS = { fill: "#94A3B8", fontSize: 11 };

export type Row = Record<string, unknown>;
export type Fmt = (value: number) => string;

function ChartTooltip({ active, payload, label, fmt, labels }: {
  active?: boolean;
  payload?: { dataKey?: unknown; value?: unknown; color?: string; stroke?: string; fill?: string; name?: unknown }[];
  label?: unknown;
  fmt: Fmt;
  labels?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const shown = payload.filter((p) => p.value != null && !Array.isArray(p.value));
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-ink">{String(label)}</p>
      {shown.length === 0 && <p className="text-ink-2">Data unavailable</p>}
      {shown.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.stroke ?? p.color ?? p.fill }} aria-hidden />
          {labels?.[String(p.dataKey)] ?? String(p.name)}
          <span className="num ml-auto pl-3 text-ink">{fmt(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

/** Vertical bars for one series over time. Negative values stay on the same axis. */
export function ColumnChart({ data, x, y, name, fmt, axisFmt = compact, height = 260, color = SINGLE, zeroLine = false }: {
  data: Row[]; x: string; y: string; name: string; fmt: Fmt; axisFmt?: Fmt; height?: number; color?: string; zeroLine?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={x} tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={46} tickFormatter={axisFmt} />
        {zeroLine && <ReferenceLine y={0} stroke="#94A3B8" />}
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} content={<ChartTooltip fmt={fmt} />} />
        <Bar dataKey={y} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal ranked bars, for comparing many named items. */
export function RankedBars({ data, label, value, name, fmt, height, color = SINGLE, labelWidth = 128 }: {
  data: Row[]; label: string; value: string; name: string; fmt: Fmt; height?: number; color?: string; labelWidth?: number;
}) {
  const h = height ?? Math.max(160, data.length * 30 + 28);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compact} />
        <YAxis type="category" dataKey={label} tick={{ ...AXIS, fontSize: 11 }} width={labelWidth} axisLine={{ stroke: GRID }} tickLine={false} interval={0} />
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} content={<ChartTooltip fmt={fmt} />} />
        <Bar dataKey={value} name={name} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** One or more lines on one axis. Dash patterns keep series distinct without colour. */
export function LineSeries({ data, x, series, fmt, axisFmt = compact, height = 260 }: {
  data: Row[]; x: string; series: { key: string; name: string; color?: string; dash?: string }[]; fmt: Fmt; axisFmt?: Fmt; height?: number;
}) {
  const labels = Object.fromEntries(series.map((s) => [s.key, s.name]));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={x} tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={46} tickFormatter={axisFmt} />
        <Tooltip content={<ChartTooltip fmt={fmt} labels={labels} />} cursor={{ stroke: "#94A3B8", strokeDasharray: "3 3" }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} iconType="plainline" />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="linear"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? (series.length === 1 ? SINGLE : SERIES[i % SERIES.length])}
            strokeWidth={2}
            strokeDasharray={s.dash}
            dot={{ r: 3, strokeWidth: 0, fill: s.color ?? (series.length === 1 ? SINGLE : SERIES[i % SERIES.length]) }}
            activeDot={{ r: 5, stroke: "#172033", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** History plus a clearly separated, dashed estimate with its interval band. */
export function ForecastChart({ data, boundary, fmt }: { data: Row[]; boundary: number; fmt: Fmt }) {
  const labels = { actual: "Reported", predicted: "Estimate", lower_95: "95% interval, low", upper_95: "95% interval, high" };
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 16, right: 12, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={46} tickFormatter={compact} />
        <Tooltip content={<ForecastTooltip fmt={fmt} labels={labels} />} cursor={{ stroke: "#94A3B8", strokeDasharray: "3 3" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
        <ReferenceLine x={boundary} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: "Estimates begin", fill: "#94A3B8", fontSize: 11, position: "insideTopLeft" }} />
        <Area dataKey="band" name="95% interval" stroke="none" fill="#F59E0B" fillOpacity={0.18} isAnimationActive={false} />
        <Line dataKey="actual" name="Reported (NCRB)" stroke={SINGLE} strokeWidth={2} dot={{ r: 3, fill: SINGLE, strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
        <Line dataKey="predicted" name="Estimate" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 5" dot={{ r: 3, fill: "#F59E0B", strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ForecastTooltip({ active, payload, label, fmt, labels }: {
  active?: boolean; payload?: { payload?: Row }[]; label?: unknown; fmt: Fmt; labels: Record<string, string>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const items = (["actual", "predicted", "lower_95", "upper_95"] as const).filter((k) => row[k] != null);
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold">{String(label)}</p>
      {items.map((k) => (
        <p key={k} className="flex justify-between gap-4 text-ink-2">{labels[k]} <span className="num text-ink">{fmt(Number(row[k]))}</span></p>
      ))}
    </div>
  );
}
