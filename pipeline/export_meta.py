"""Write lookup CSVs that the R analysis and downstream tools share."""
from __future__ import annotations

import csv

from common import PROCESSED, STATES
from metadata import HEADS


def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED / "states.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["state_code", "state_name", "kind", "region"])
        writer.writerows(STATES)
    with open(PROCESSED / "crime_heads_meta.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["head_id", "label", "act", "level", "parent_id"])
        writer.writerows(HEADS)
    print("wrote states.csv, crime_heads_meta.csv")


if __name__ == "__main__":
    main()
