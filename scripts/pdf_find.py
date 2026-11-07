"""Small research helper: print pages of a PDF, or search its pages for a regex.

usage:
  pdf_find.py <pdf> info
  pdf_find.py <pdf> find "<regex>" [max_hits]
  pdf_find.py <pdf> page <n|n-m>     (1-indexed)
"""
import re
import sys

from pypdf import PdfReader


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    path, mode = sys.argv[1], sys.argv[2]
    reader = PdfReader(path)
    if mode == "info":
        print("pages", len(reader.pages))
        print((reader.pages[0].extract_text() or "")[:600])
    elif mode == "find":
        rx = re.compile(sys.argv[3], re.I)
        limit = int(sys.argv[4]) if len(sys.argv) > 4 else 30
        hits = 0
        for i, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            match = rx.search(text)
            if match:
                start = max(match.start() - 60, 0)
                print(f"p{i}: {text[start:match.end() + 100]!r}")
                hits += 1
                if hits >= limit:
                    break
    elif mode == "page":
        spec = sys.argv[3]
        first, _, last = spec.partition("-")
        for i in range(int(first), int(last or first) + 1):
            print(f"===== PAGE {i} =====")
            print(reader.pages[i - 1].extract_text())


if __name__ == "__main__":
    main()
