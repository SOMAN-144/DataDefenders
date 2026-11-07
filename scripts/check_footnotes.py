"""Research helper: print the population footnote from each NCRB Table 9A.1 spreadsheet."""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent / "data" / "raw" / "ncrb_tables"
FILES = ["2017/table-9A.1_1-2017.xlsx", "2018/table-9A.1_0-2018.xlsx", "2019/table-9A.1-2019.xlsx", "2020/table-9A.1-2020.xlsx"]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    for name in FILES:
        frame = pd.read_excel(ROOT / name, header=None, dtype=str)
        for value in frame.values.ravel():
            if isinstance(value, str) and "Population Source" in value:
                print(name, "::", " ".join(value.split()))


if __name__ == "__main__":
    main()
