"""Research helper: print the first rows of NCRB spreadsheets given on the command line."""
import sys

import pandas as pd


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    rows = int(sys.argv[1])
    pd.set_option("display.width", 260, "display.max_columns", 40, "display.max_colwidth", 22)
    for path in sys.argv[2:]:
        print("=====", path)
        book = pd.read_excel(path, sheet_name=None, header=None)
        for name, frame in book.items():
            print("sheet", name, frame.shape)
            print(frame.head(rows).to_string())
            print(frame.tail(4).to_string())


if __name__ == "__main__":
    main()
