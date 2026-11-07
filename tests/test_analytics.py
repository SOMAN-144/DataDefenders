"""Unit tests for the statistical formulas."""
import pytest

from app import analytics as an


def test_growth_formula():
    assert an.growth_pct(120, 100) == 20
    assert an.growth_pct(101928, 86420) == pytest.approx(17.945, abs=0.01)


@pytest.mark.parametrize("current,previous", [(None, 10), (10, None), (10, 0)])
def test_growth_missing_or_zero_base_is_none(current, previous):
    assert an.growth_pct(current, previous) is None


def test_rate_formula():
    # Telangana 2024: NCRB prints 71.1 per 100,000.
    assert an.rate_per_100k(27230, 38_320_000) == pytest.approx(71.06, abs=0.01)


def test_missing_data_never_becomes_zero():
    assert an.rate_per_100k(None, 100) is None
    assert an.rate_per_100k(10, None) is None
    assert an.share_pct(None, 100) is None
    assert an.average_reported(None, 5) is None


def test_share_and_average():
    assert an.share_pct(25, 100) == 25
    # NCRP 2024: Rs 22,848 crore across 19,18,835 complaints.
    assert an.average_reported(22848, 1918835) == pytest.approx(119071, abs=5)


def test_cagr():
    assert an.cagr_pct(100, 121, 2) == pytest.approx(10)
    assert an.cagr_pct(0, 50, 2) is None


@pytest.mark.parametrize("code", ["JK", "LA"])
def test_split_units_have_no_2020_growth(code):
    assert an.state_growth(code, 2020, 100, 50) is None
    assert an.state_growth(code, 2021, 100, 50) == 100


def test_rank_ties_and_missing():
    ranks = an.rank_desc({"a": 10, "b": 30, "c": 10, "d": None})
    assert ranks == {"b": 1, "a": 2, "c": 2}


def test_significant_changes():
    moves = an.significant_changes([{"year": 1, "value": 100}, {"year": 2, "value": 110}, {"year": 3, "value": 220}])
    assert len(moves) == 1 and moves[0]["year"] == 3
