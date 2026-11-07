"""Compare extracted national crime heads against Lok Sabha USQ 251 Annexure-II, and
print the data-quality log, so a mis-ordered PDF column cannot pass unnoticed."""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"

# Transcribed from Lok Sabha Unstarred Question 251, 21 July 2026, Annexure-II.
ANNEX = {
    "tampering": [338, 55, 65, 71, 162], "computer_related_total": [21926, 19915, 23894, 35329, 36920],
    "cyber_terrorism": [26, 15, 12, 11, 18], "obscene_total": [6308, 6598, 6896, 7893, 6990],
    "interception": [7, 2, 1, 1, 4], "unauthorized_access": [2, 3, 1, 1, 2],
    "abetment_it": [1, 7, 4, 0, 2], "attempt_it": [18, 5, 18, 11, 14], "other_it": [1017, 827, 1017, 920, 718],
    "total_it": [29643, 27427, 31908, 44237, 44872], "abetment_suicide": [10, 10, 24, 30, 12],
    "cyber_stalking": [872, 1176, 1471, 1305, 1240], "data_theft": [98, 170, 97, 113, 88],
    "fraud_total": [10395, 14007, 17470, 19466, 29758], "cheating": [4480, 6343, 10509, 16943, 19296],
    "forgery": [582, 198, 224, 444, 702], "defamation_morphing": [51, 31, 61, 36, 28],
    "fake_profile": [149, 123, 157, 225, 266], "counterfeit_total": [9, 2, 2, 0, 3],
    "blackmail": [303, 689, 696, 689, 601], "fake_news": [578, 179, 230, 209, 483],
    "other_ipc": [2674, 2456, 2857, 2389, 4109], "total_ipc": [20201, 25384, 33798, 41849, 56747],
    "online_gambling": [63, 27, 37, 87, 37], "online_lotteries": [26, 4, 6, 0, 0], "copyright": [49, 32, 27, 23, 30],
    "trademarks": [5, 1, 14, 1, 6], "other_sll": [48, 99, 103, 223, 236], "total_sll": [191, 163, 187, 334, 309],
    "total": [50035, 52974, 65893, 86420, 101928],
}


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    heads = pd.read_csv(PROCESSED / "ncrb_crime_heads.csv")
    nat = heads[heads.state_code == "IN"].set_index(["head_id", "year"]).cases
    bad = 0
    for head, values in ANNEX.items():
        for year, expected in zip(range(2020, 2025), values):
            got = nat.get((head, year))
            if got != expected:
                bad += 1
                print(f"MISMATCH {head} {year}: extracted {got} annexure {expected}")
    print(f"crime-head check: {len(ANNEX) * 5} comparisons, {bad} mismatches")

    print("\n2024 fraud sub-heads:", nat.loc[[(h, 2024) for h in ("fraud_card", "fraud_atm", "fraud_online_banking", "fraud_otp", "fraud_gaming", "fraud_investment", "fraud_vishing", "fraud_upi", "fraud_other")]].to_dict())

    motives = pd.read_csv(PROCESSED / "ncrb_motives.csv")
    table = motives[(motives.state_code == "IN") & motives.motive_id.isin(["fraud", "sexual_exploitation", "extortion", "total"])]
    print(table.pivot(index="year", columns="motive_id", values="cases").to_string())

    print("\nrevisions:")
    print(pd.read_csv(PROCESSED / "ncrb_revisions.csv").to_string())
    pop = pd.read_csv(PROCESSED / "ncrb_population.csv")
    cases = pd.read_csv(PROCESSED / "ncrb_state_cases.csv")
    merged = cases.merge(pop, on=["state_code", "year"])
    merged["rate"] = merged.cases / merged.population_lakh
    merged["diff"] = (merged.rate - merged.published_rate).abs()
    far = merged[merged["diff"] > 0.1]
    print(f"\nrate check: {len(merged)} rows; {len(far)} differ from NCRB's printed rate by >0.1")
    print(far[["state_code", "year", "cases", "population_lakh", "published_rate", "rate"]].round(2).to_string())
    print(pop[pop.state_code == "IN"][["year", "population_lakh"]].to_string())
    print((PROCESSED / "extract_ncrb.log").read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
