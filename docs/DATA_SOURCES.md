# Data sources

The machine-readable register, including limitations for each source, is `data/curated/sources.csv`. It is also shown on the site's **Data Sources** page and available at `/api/sources`. All sources were accessed on 7 November 2026.

| Dataset | Organisation | Report | Table / page | Data years | Status |
|---|---|---|---|---|---|
| Cases by State/UT | NCRB | Crime in India, 2016-2022 editions | Table 9A.1 | 2016-2022 | Official |
| Cases by State/UT | NCRB | Crime in India 2023 and 2024, Vol. II | Table 9A.1 | 2021-2024 | Official report, via public mirror |
| Crime heads | NCRB | Crime in India, 2017-2024 editions | Table 9A.2 | 2017-2024 | Official (2023-24 via mirror) |
| Motives | NCRB | Crime in India, 2016-2024 editions | Table 9A.3 (9A.5 in 2016) | 2016-2024 | Official (2023-24 via mirror) |
| Population | NCRB, citing RGI and the Technical Group on Population Projections | Crime in India | Table 9A.1 | 2016-2024 | Official |
| Validation | Lok Sabha / MHA | USQ 251, 21 Jul 2026 | Annexures I and II | 2020-2024 | Official |
| Validation | Lok Sabha / MeitY | USQ 2895, 11 Mar 2020 | Annexure I | 2016-2018 | Third-party transcription |
| NCRP complaints and amount | PIB / MHA | Release 2226441, 11 Feb 2026 | Year-wise table | 2021-2025 | Official |
| NCRP by State/UT | PIB / MHA | Release 2003158, 6 Feb 2024 | Annexure | 2023 | Official |
| CERT-In incidents | PIB / MeitY | Release 2244504, 24 Mar 2026 | Year-wise table | 2021-2025 | Official |
| CERT-In incidents | The Tribune; Deccan Herald | Reports of parliamentary replies | Article text | 2016-2020 | Press reports |
| Bank frauds | RBI | Annual Report 2024-25, Chapter VI | Table VI.3 | 2022-23 to 2024-25 | Official |
| State/UT contacts | NCRP / MHA | Contact Us page | Table | Current | Official |
| Boundaries | DataMeet | India State Boundaries | `States/Admin2` | Current | Community, CC BY 2.5 IN |

URLs for NCRB tables downloaded for each year are in `data/raw/ncrb_tables/manifest.csv`. Reproduce those downloads with `scripts/download_ncrb_tables.ps1`.

## Definitions

- **Cyber crime case (NCRB):** a case registered under the IT Act, or under IPC/BNS or Special and Local Laws involving a communication device as medium or target.
- **Financial fraud complaint (NCRP):** a complaint lodged on the portal or through helpline 1930, with the amount as reported by the complainant.
- **Lien amount:** money marked and held in the receiving account. It is not necessarily money returned to the victim.
- **Cyber security incident (CERT-In):** an incident reported to and tracked by CERT-In.
- **Bank fraud (RBI):** a fraud of Rs 1 lakh or more reported by a bank, dated by reporting year.

## Reuse

Government of India publications are used here with attribution for education and research. The derived tables should be cited to their original publishers. Check each publisher's terms for other uses.
