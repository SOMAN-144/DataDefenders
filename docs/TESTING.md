# Testing

Run the automated tests from the project root:

```bash
.venv\Scripts\python.exe -m pytest -q
```

## Automated tests

| File | Covers |
|---|---|
| `tests/test_analytics.py` | Formulas, zero and missing inputs, the J&K/Ladakh growth rule, ranking |
| `tests/test_data_integrity.py` | National totals against publications, States summing to national, crime heads summing to totals, computed rates against NCRB's printed rates, source references, GeoJSON keys |
| `tests/test_api.py` | Every endpoint, all 36 State profiles, filters, invalid input, null handling, labelled forecasts, whitelisted downloads |
| `tests/test_r_crosscheck.py` | R outputs against API results for growth, rates, shares, regions, averages and forecasts |

## Validation against sources

- **State sums.** For every year 2016-2024, State values sum exactly to the published national total.
- **Crime heads.** 150 of 150 values for 2020-2024 match Lok Sabha USQ 251 Annexure-II (`scripts/verify_heads.py`).
- **Rates.** 316 of 320 computed rates are within 0.1 of NCRB's printed rate. The exceptions are explained: Lakshadweep 2018-2020 (population printed as a rounded 0.7 lakh) and West Bengal 2019 (cases revised after the rate was printed).

## Browser checks

Carried out in a real browser against the production build on 7 November 2026.

| Requirement | Result |
|---|---|
| Every State on the map is selectable | Pass: a scripted click on every polygon selected all 36 |
| State names match data | Pass: GeoJSON and database codes match, and tooltips show the right State |
| National totals correct | Pass: automated |
| State statistics match sources | Pass: spot values and full-table checks |
| Graphs update with filters | Pass: changing year and category changed the cards and chart contents |
| Missing data handled | Pass: Ladakh 2018 is grey and "Data unavailable", with no rank |
| No double counting | Pass: automated |
| Rates use correct denominators | Pass: automated against printed rates |
| Official links work | Pass, after rechecking the Emergency page links in a browser. One dead link was found and replaced |
| Mobile and desktop | Pass: no horizontal page overflow on any page at 375 px, after fixing four pages. Also checked at 1300-1400 px |
| Unknown route | Pass: shows a not-found page |

## Known limits of this testing

- Touch gestures were not tested on a physical phone. Mobile checks used browser emulation.
- Only Chromium was used. Firefox and Safari were not tested.
- No formal screen-reader audit was done, although charts have table views and the site uses labels and landmarks.
- Links are correct as of the access date and may change.
- Online deployment was not performed, so the Vercel and Render configuration is untested.
