from types import SimpleNamespace
from unittest.mock import MagicMock

from app.core.offer_cc import offer_cc_emails


def _candidate(branch: str | None = "Thevara"):
    return SimpleNamespace(id="candidate-id", branch_location=branch)


def test_offer_cc_uses_local_hr_who_sent_candidate_to_head_office():
    db = MagicMock()
    db.scalar.return_value = "origin.hr@nippontoyota.com"

    assert offer_cc_emails(db, _candidate()) == [
        "jerry@nippontoyota.com",
        "naveen@nippontoyota.com",
        "origin.hr@nippontoyota.com",
    ]
    db.scalar.assert_called_once()


def test_offer_cc_uses_fixed_kalamassery_hr_address():
    db = MagicMock()

    assert offer_cc_emails(db, _candidate("  KALAMASSERY ")) == [
        "jerry@nippontoyota.com",
        "naveen@nippontoyota.com",
        "hrkly@nippontoyota.com",
    ]
    db.scalar.assert_not_called()


def test_offer_cc_falls_back_to_active_branch_hr():
    db = MagicMock()
    db.scalar.side_effect = [None, "branch.hr@nippontoyota.com"]

    assert offer_cc_emails(db, _candidate())[-1] == "branch.hr@nippontoyota.com"
    assert db.scalar.call_count == 2


def test_offer_cc_deduplicates_addresses_case_insensitively():
    db = MagicMock()
    db.scalar.return_value = " JERRY@NIPPONTOYOTA.COM "

    assert offer_cc_emails(db, _candidate()) == [
        "jerry@nippontoyota.com",
        "naveen@nippontoyota.com",
    ]
