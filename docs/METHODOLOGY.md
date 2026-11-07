# Methodology

## Four separate reporting systems

| System | Counts | Coverage used |
|---|---|---|
| NCRB *Crime in India* | Cases registered by police | State/UT and national, 2016-2024 |
| NCRP / CFCFRMS (I4C) | Public complaints and amount reported | National 2021-2025; State/UT 2023 |
| CERT-In | Cyber security incidents handled | National 2016-2025 |
| RBI | Frauds of Rs 1 lakh and above reported by banks | National, 2022-23 to 2024-25 |

They have different definitions and coverage. They are stored separately and never added together.

## Cleaning steps

1. **Duplicates.** Each state-year pair appears in up to three NCRB editions. One value is kept (below), enforced by a `UNIQUE` constraint.
2. **Missing values.** `-` and blanks become NULL, never zero. Reported zeros stay zero (Sikkim 2020 is 0; Ladakh 2018 is NULL).
3. **State names.** Every variant maps to one code in `pipeline/common.py`. An unknown name stops the build rather than silently losing a row.
4. **Years.** Integer calendar years. RBI's financial years stay as text such as `2023-24` and are never treated as calendar years.
5. **Inconsistent categories.** NCRB's crime heads are mapped by column position, then verified. 2024 adds new heads, which have no invented history. The 2016 motive classification differs, and its 'Illegal Gain' is shown as the closest match to Fraud, with a note.
6. **Validation against sources.** See `TESTING.md`.
7. **References.** Every row carries a `source_id`.
8. **Separation.** Each system has its own table.

## Choosing between editions

NCRB reprints the two previous years in each edition and sometimes revises them. This project uses the newest printed value and logs differences in `ncrb_revisions.csv`. Two revisions were found, both for 2019: West Bengal changed from 335 to 524, and all-India from 44,546 to 44,735. CII 2019 had carried forward West Bengal's 2018 data.

Crime head and motive tables are single-year tables, so their 2019 rows still reflect the original 44,546. This is noted on the site.

## Reorganised territories

The site uses today's 36 units.

- **D&N Haveli and Daman & Diu.** Earlier editions list them separately, so values and populations are summed.
- **Jammu & Kashmir and Ladakh.** Before 2020 they were reported as one unit, shown under J&K. Ladakh is 'Data unavailable' for those years, and 2020 growth is withheld for both because the reporting unit changed.

## Formulas

- **Year-over-year growth** = (current − previous) ÷ previous × 100. Undefined if previous is 0 or missing.
- **Rate per 100,000** = cases ÷ population × 100,000.
- **National share** = State cases ÷ national cases × 100, using the same table for both.
- **Compound annual growth** = (end ÷ start)^(1 ÷ years) − 1.
- **Average per complaint** = NCRP amount ÷ NCRP complaints, from the same table.

Map growth is suppressed where the previous year had fewer than 20 cases, and trend tables use minimum bases of 20 to 100, because percentages on tiny counts mislead. The R script applies the same formulas independently, and a test compares the results.

## Population denominators

The denominator is the mid-year figure NCRB printed in Table 9A.1 for that year:

- **2016-2017:** Registrar General estimates (2001 Census based, per NCRB's footnote).
- **2018-2019:** Technical Group on Population Projections, November 2019.
- **2020-2024:** Technical Group on Population Projections, July 2020.

All are projections, not census counts. The basis changes, so compare distant years with care.

## Map classes

Five quantile classes are computed from the available values, because counts are very skewed. Growth uses fixed breaks. Colours run from green (lowest) to dark red (highest), as the project brief requested. Red and green are hard for some readers to tell apart, so every value is also in the tooltip and the ranking table, and grey with a dashed outline marks missing data.

## Forecasting

Five candidates were compared in R: log-linear trend, linear trend, random walk with drift, the same on a log scale, and Holt's linear trend. Each was refitted at origins 2020-2023 and scored on later published years. The lowest mean absolute percentage error wins. ARIMA is reported only for comparison, because nine points cannot support it reliably.

NCRP amounts (five years), CERT-In incidents (large unexplained jumps) and State-level series are deliberately not forecast.

## Data access issues

| Issue | What was done |
|---|---|
| `eparlib.*`, `rsdebate.nic.in` and `mha.gov.in` PDFs unreachable or blocked from our network | Used `sansad.in`, PIB and NCRB directly |
| NCRB's table index has no 2023 or 2024 tables | Used the OpenCity mirror of the NCRB volumes, cross-checked against Lok Sabha USQ 251 |
| CERT-In figures for 2016-2020 not available from a primary source | Used press reports quoting parliamentary replies, labelled as secondary. Their 2021-2024 quotes match the primary release |
| Lok Sabha USQ 2895 unreachable directly | Read through a third-party transcription, used only to validate totals |
| Old NCRP contact URL returns "Page Not Found" while reporting HTTP 200 | Found the current page in a browser and rechecked links there |

## Statistics requested but not available

Financial loss by crime type, State-wise amounts outside 2023, separate national phishing and malware counts, and any complete 2026 figure. The site shows these as unavailable. Nothing was estimated to fill them.
