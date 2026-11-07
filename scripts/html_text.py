"""Research helper: dump an HTML file as text, rows of tables on one line.

usage: html_text.py <file> [regex-filter-context]
"""
import re
import sys
from html.parser import HTMLParser


class Dump(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.out: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if tag in ("tr", "p", "br", "div", "li", "h1", "h2", "h3"):
            self.out.append("\n")
        if tag in ("td", "th"):
            self.out.append(" | ")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.out.append(re.sub(r"\s+", " ", data))


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    with open(sys.argv[1], encoding="utf-8", errors="replace") as handle:
        raw = handle.read()
    parser = Dump()
    parser.feed(raw)
    text = re.sub(r"\n\s*\n+", "\n", "".join(parser.out))
    if len(sys.argv) > 2:
        lines = text.split("\n")
        for i, line in enumerate(lines):
            if re.search(sys.argv[2], line, re.I):
                print(i, line[:400])
    else:
        print(text)


if __name__ == "__main__":
    main()
