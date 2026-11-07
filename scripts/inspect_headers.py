"""Research helper: print, for each NCRB xlsx table, its segments' leaf column labels."""
import glob
import re
import sys

import pandas as pd


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    for path in sys.argv[1:]:
        print("=====", path)
        frame = pd.read_excel(path, header=None, dtype=object)
        sl_row = None
        for i in range(12):
            vals = [str(v).strip() for v in frame.iloc[i].tolist()]
            if any(re.fullmatch(r"(SL|S\. ?No\.?|Sl\.? ?No\.?)", v, re.I) for v in vals):
                sl_row = i
                break
        num_row = None
        for i in range(sl_row + 1, sl_row + 8):
            vals = [str(v).strip() for v in frame.iloc[i].tolist() if not pd.isna(v)]
            if vals and all(re.fullmatch(r"\[?\(?\d+\)?\]?", v) for v in vals):
                num_row = i
                break
        print("shape", frame.shape, "sl_row", sl_row, "num_row", num_row)
        for col in range(frame.shape[1]):
            label = None
            for i in range(num_row - 1, sl_row - 1, -1):
                v = frame.iat[i, col]
                if not pd.isna(v):
                    label = re.sub(r"\s+", " ", str(v)).strip()
                    break
            print(col, label)


if __name__ == "__main__":
    main()
