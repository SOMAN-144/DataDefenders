"""Research helper: show header rows of the state tables and motive tables for every year."""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent / "data" / "raw" / "ncrb_tables"


def show(path: Path, rows: int = 7) -> None:
    frame = pd.read_excel(path, header=None, dtype=object)
    print("=====", path.parent.name, path.name, frame.shape)
    for i in range(rows):
        print(i, [str(v)[:30] for v in frame.iloc[i].tolist() if not pd.isna(v)])
    for i in range(frame.shape[0] - 7, frame.shape[0]):
        print(i, [str(v)[:90] for v in frame.iloc[i].tolist() if not pd.isna(v)])


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    for rel in [
        "2017/table-9A.1_1-2017.xlsx",
        "2019/table-9A.1-2019.xlsx",
        "2020/table-9A.1-2020.xlsx",
        "2022/1702030584TABLE9A1.xlsx",
        "2017/1682412642Table9B31.xlsx",
        "2017/table-9A.14_1-2017.xlsx",
        "2018/1681982492Table9A30.xlsx",
        "2019/1681725747Table9A3.xlsx",
        "2020/1680861996TABLE9A3.xlsx",
        "2022/1702030805TABLE9A3.xlsx",
    ]:
        try:
            show(ROOT / rel)
        except Exception as exc:  # research helper: report and continue
            print("FAIL", rel, exc)


if __name__ == "__main__":
    main()
