import { quantileSorted } from "d3-array";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, GeoJSON, MapContainer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import type { MapData, MapState } from "../api";
import { crore, dec, num, pct } from "../format";

/** Dark red = highest, then orange, yellow, green = lowest. Grey = no data, never "low". */
export const CLASS_COLORS = ["#16A34A", "#EAB308", "#F97316", "#DC2626", "#7F1D1D"];
const MISSING = "#3B4659";
const SELECT_RING = "#00D4FF";

// Territories too small to click reliably get a round marker as well.
const SMALL_UNITS = new Set(["CH", "DL", "PY", "LD", "DN", "GA", "SK"]);
const FIXED_GROWTH_BREAKS = [0, 10, 25, 50];

export interface MapClass { color: string; label: string; min: number; max: number }

export function formatMetric(metric: string, value: number | null | undefined): string {
  if (value == null) return "Data unavailable";
  if (metric === "rate") return dec(value, 1);
  if (metric === "share") return pct(value, 1);
  if (metric === "growth") return pct(value, 1, true);
  if (metric === "financial") return crore(value, 1);
  return num(value);
}

function rangeLabel(metric: string, low: number, high: number): string {
  const f = (v: number) => (metric === "financial" ? `₹${dec(v, 0)} cr` : metric === "cases" || metric === "complaints" ? num(v) : dec(v, 1));
  return low === high ? f(low) : `${f(low)} – ${f(high)}`;
}

/** Five classes. Quantile breaks suit skewed counts; growth uses fixed, comparable ones. */
export function buildClasses(values: number[], metric: string): MapClass[] {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return [];
  if (metric === "growth") {
    const edges = [-Infinity, ...FIXED_GROWTH_BREAKS, Infinity];
    const labels = ["Falling (below 0%)", "0 – 10%", "10 – 25%", "25 – 50%", "Above 50%"];
    return CLASS_COLORS.map((color, i) => ({ color, label: labels[i], min: edges[i], max: edges[i + 1] }));
  }
  const cuts = [0.2, 0.4, 0.6, 0.8].map((q) => quantileSorted(sorted, q) as number);
  const edges = [sorted[0], ...cuts, sorted[sorted.length - 1]];
  const classes: MapClass[] = [];
  for (let i = 0; i < 5; i++) {
    const low = i === 0 ? edges[0] : edges[i];
    const high = edges[i + 1];
    if (i > 0 && high <= edges[i] && classes.length) continue; // Collapse duplicate breaks.
    classes.push({ color: CLASS_COLORS[i], label: rangeLabel(metric, low, high), min: low, max: high });
  }
  return classes;
}

export function classColor(value: number | null, classes: MapClass[]): string {
  if (value == null) return MISSING;
  for (let i = classes.length - 1; i >= 0; i--) {
    if (value >= classes[i].min) return classes[i].color;
  }
  return classes[0]?.color ?? MISSING;
}

function tooltipHtml(state: MapState, data: MapData): string {
  const element = document.createElement("div");
  const title = document.createElement("div");
  title.style.cssText = "font-weight:600;font-size:13px;margin-bottom:4px";
  title.textContent = state.state_name;
  element.append(title);
  const line = (label: string, value: string) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#94a3b8";
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("span");
    val.textContent = value;
    val.style.cssText = "color:#f8fafc;font-family:var(--font-mono);text-align:right";
    row.append(key, val);
    element.append(row);
  };
  line("Year", String(data.year));
  if (data.metric === "financial" || data.metric === "complaints") {
    line("Amount reported", formatMetric("financial", state.financial));
    line("Complaints", formatMetric("complaints", state.complaints));
  } else {
    line("Reported cases", formatMetric("cases", state.cases));
    if (data.metric !== "cases") line(data.metric_label, formatMetric(data.metric, state.value));
    if (state.rank) line("Rank", `#${state.rank}`);
  }
  if (state.notes.length && state.value == null) {
    const note = document.createElement("div");
    note.style.cssText = "margin-top:4px;font-size:11px;color:#94a3b8";
    note.textContent = state.notes[0];
    element.append(note);
  }
  return element.innerHTML;
}

function FitIndia({ geo }: { geo: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(geo);
    const fit = () => map.fitBounds(layer.getBounds(), { padding: [8, 8] });
    fit();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      fit();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [geo, map]);
  return null;
}

export function IndiaMap({ geo, data, classes, selected, onSelect }: {
  geo: FeatureCollection;
  data: MapData;
  classes: MapClass[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const layerRef = useRef<L.GeoJSON | null>(null);
  const byCode = useMemo(() => new Map(data.states.map((s) => [s.state_code, s])), [data]);

  // Leaflet handlers are bound once, so they read the latest values through refs.
  const latest = useRef({ byCode, data, classes, selected, onSelect });
  latest.current = { byCode, data, classes, selected, onSelect };

  const styleFor = (code: string, hover = false): L.PathOptions => {
    const { byCode: states, classes: cls, selected: sel } = latest.current;
    const value = states.get(code)?.value ?? null;
    const isSelected = sel === code;
    return {
      fillColor: classColor(value, cls),
      fillOpacity: hover ? 1 : value == null ? 0.55 : 0.9,
      color: isSelected ? SELECT_RING : hover ? "#F8FAFC" : "#0B1120",
      weight: isSelected ? 2.5 : hover ? 1.5 : 0.7,
      dashArray: value == null && !isSelected && !hover ? "2 3" : undefined,
    };
  };

  useEffect(() => {
    layerRef.current?.eachLayer((layer) => {
      const path = layer as L.Polygon & { feature?: Feature<Geometry, { state_code: string }> };
      const code = path.feature?.properties.state_code;
      if (!code) return;
      path.setStyle(styleFor(code));
      const state = byCode.get(code);
      if (state) path.setTooltipContent(tooltipHtml(state, data));
      if (selected === code) path.bringToFront();
    });
    // styleFor reads current values through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, classes, selected, byCode]);

  const smallUnits = useMemo(
    () => geo.features.filter((f) => SMALL_UNITS.has((f.properties as { state_code: string }).state_code)),
    [geo],
  );

  return (
    <MapContainer
      center={[22.5, 82]}
      zoom={4}
      minZoom={3}
      maxZoom={9}
      zoomSnap={0.25}
      scrollWheelZoom={false}
      // On phones, one-finger drags should scroll the page, not get stuck panning the map.
      dragging={!L.Browser.mobile}
      attributionControl
      style={{ height: "100%", width: "100%" }}
    >
      <FitIndia geo={geo} />
      <GeoJSON
        ref={(layer) => { layerRef.current = layer; }}
        data={geo}
        attribution='Boundaries: <a href="https://projects.datameet.org/maps/states" target="_blank" rel="noreferrer">DataMeet</a> CC BY 2.5 IN (indicative)'
        style={(feature) => styleFor((feature?.properties as { state_code: string }).state_code)}
        onEachFeature={(feature, layer) => {
          const code = (feature.properties as { state_code: string }).state_code;
          const state = latest.current.byCode.get(code);
          layer.bindTooltip(state ? tooltipHtml(state, latest.current.data) : code, { sticky: true, className: "state-tip", direction: "auto" });
          layer.on({
            mouseover: () => (layer as L.Path).setStyle(styleFor(code, true)),
            mouseout: () => (layer as L.Path).setStyle(styleFor(code)),
            click: () => latest.current.onSelect(code),
          });
        }}
      />
      {smallUnits.map((f) => {
        const p = f.properties as { state_code: string; state_name: string; label_lat: number; label_lng: number };
        const state = byCode.get(p.state_code);
        const value = state?.value ?? null;
        return (
          <CircleMarker
            key={`${p.state_code}-${data.metric}-${data.year}-${data.category}-${selected === p.state_code}`}
            center={[p.label_lat, p.label_lng]}
            radius={5}
            pathOptions={{
              fillColor: classColor(value, classes), fillOpacity: 1,
              color: selected === p.state_code ? SELECT_RING : "#F8FAFC", weight: selected === p.state_code ? 2.5 : 1,
            }}
            eventHandlers={{ click: () => onSelect(p.state_code) }}
          >
            <LeafletTooltip sticky className="state-tip">
              {state && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{state.state_name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{data.year}: {formatMetric(data.metric, state.value)}</div>
                </div>
              )}
            </LeafletTooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export function MapLegend({ classes, title }: { classes: MapClass[]; title: string }) {
  return (
    <div className="text-xs">
      <p className="mb-1.5 font-medium text-ink-2">{title}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {[...classes].reverse().map((c) => (
          <li key={c.color} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: c.color }} aria-hidden />
            <span className="num text-ink-2">{c.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-sm border border-dashed border-ink-3" style={{ background: MISSING }} aria-hidden />
          <span className="text-ink-2">Data unavailable</span>
        </li>
      </ul>
    </div>
  );
}
