# Limitations and future improvements

## Data limitations

- **Registered cases are not total crime.** They reflect reporting and police registration. A rise can mean more crime, more reporting, or both.
- **Crime heads vary by State.** Karnataka, for example, books most fraud-type cases as IT Act computer related offences, so its IPC 'Fraud' count is near zero. Use the motive table to compare fraud between States.
- **'Other' categories are large.** About 15% of 2024 cases have the motive 'Others', which limits interpretation.
- **Population basis changes** across editions, so rates from distant years are not strictly comparable.
- **The time series is short.** Nine annual NCRB points cannot support strong conclusions or forecasts.
- **The IPC-to-BNS change in 2024** may affect comparisons of crime heads with earlier years.
- **NCRP amounts are unverified** and the system is dynamic, so replies differ slightly. For 2024, one reply gives Rs 22,848 crore and another Rs 22,845.73 crore.
- **State-wise NCRP data covers 2023 only.** It is an early-2024 snapshot and does not exactly match the later yearly figure.
- **No financial loss by crime type** is published, so the site shows none.
- **2025 and 2026.** NCRB's latest edition covers 2024. NCRP and CERT-In reach 2025. No complete official 2026 figure exists.
- **Some sources are secondary.** CERT-In 2016-2020 values come from press reports of parliamentary replies, and the 2023 and 2024 NCRB volumes from a public mirror. All are labelled on the Data Sources page.
- **State-level crime heads start in 2017.** 2016 tables exist in PDF but were not extracted, because their layout and categories differ. Motives for 2016 are partial for the same reason.

## Technical limitations

- SQLite suits a read-only prototype, not concurrent writing.
- The API has no rate limiting or authentication, which is acceptable for public read-only data but should be reviewed before heavy use.
- Boundaries are simplified community data, and simplification can leave small gaps between States.
- Educational content is available in English only.

## Future improvements

- Add each new NCRB edition, and more NCRP State tables if published.
- Extract the 2016 crime heads from the PDF tables.
- Add city-level analysis from NCRB's metropolitan tables (Chapter 9B, already in `data/raw`).
- Add chargesheeting and conviction analysis (NCRB Tables 9A.4 to 9A.9).
- Compare with internet and UPI usage from TRAI and NPCI, to study exposure rather than population alone.
- Use Survey of India boundaries if licensing allows.
- Add Hindi and regional-language safety content.
- Run a formal accessibility audit and test on physical devices.
