"""Convert the DataMeet state shapefile into a simplified GeoJSON keyed by state_code."""
from __future__ import annotations

import json

import shapefile
from shapely.geometry import mapping, shape

from common import GEO, RAW, STATES, state_code

SOURCE = RAW / "geo_datameet_states" / "Admin2.shp"
# Degrees. Small territories keep more detail so they remain visible and selectable.
TOLERANCE = 0.012
SMALL_UNITS = {"CH", "DL", "GA", "PY", "LD", "DN", "SK", "AN"}
SMALL_TOLERANCE = 0.002


def main() -> None:
    GEO.mkdir(parents=True, exist_ok=True)
    names = {code: name for code, name, _, _ in STATES}
    features = []
    reader = shapefile.Reader(str(SOURCE))
    for record in reader.shapeRecords():
        code = state_code(record.record["ST_NM"])
        if code is None or code.startswith("_"):
            raise ValueError(f"Unmapped boundary name: {record.record['ST_NM']!r}")
        geom = shape(record.shape.__geo_interface__)
        if not geom.is_valid:
            geom = geom.buffer(0)
        tolerance = SMALL_TOLERANCE if code in SMALL_UNITS else TOLERANCE
        simple = geom.simplify(tolerance, preserve_topology=True)
        point = simple.representative_point()
        geojson = json.loads(json.dumps(mapping(simple)))
        features.append({
            "type": "Feature",
            "properties": {
                "state_code": code, "state_name": names[code],
                "label_lng": round(point.x, 3), "label_lat": round(point.y, 3),
            },
            "geometry": _round(geojson),
        })
    missing = set(names) - {f["properties"]["state_code"] for f in features}
    if missing:
        raise ValueError(f"Boundaries missing for {sorted(missing)}")
    out = {
        "type": "FeatureCollection",
        "attribution": "State boundaries: DataMeet Community Maps (CC BY 2.5 India). Indicative only.",
        "features": sorted(features, key=lambda f: f["properties"]["state_code"]),
    }
    path = GEO / "india_states.geojson"
    path.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"{len(features)} features, {path.stat().st_size / 1e6:.2f} MB")


def _round(node):
    if isinstance(node, dict):
        return {k: _round(v) for k, v in node.items()}
    if isinstance(node, (list, tuple)):
        if node and isinstance(node[0], float):
            return [round(node[0], 4), round(node[1], 4)]
        return [_round(v) for v in node]
    return node


if __name__ == "__main__":
    main()
