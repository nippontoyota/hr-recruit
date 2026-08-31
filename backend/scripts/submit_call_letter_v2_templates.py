"""One-off: submit the new structured-touchpoint call letter templates to DoubleTick for Meta approval.

Run with: ./venv/Scripts/python.exe scripts/submit_call_letter_v2_templates.py
Safe to re-run: DoubleTick/Meta will just reject a duplicate name if already submitted.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.doubletick import DoubleTickError, create_template, template_status
from app.services.whatsapp_templates import CALL_LETTER_V2_ONE_TOUCHPOINT, CALL_LETTER_V2_TWO_TOUCHPOINTS


def submit(spec):
    existing = template_status(spec.name)
    if existing:
        print(f"[skip] '{spec.name}' already exists with status={existing}")
        return
    try:
        result = create_template(spec)
        print(f"[ok] submitted '{spec.name}': {result}")
    except DoubleTickError as e:
        print(f"[error] '{spec.name}': {e.user_message}\n  raw: {e.raw}")


if __name__ == "__main__":
    submit(CALL_LETTER_V2_ONE_TOUCHPOINT)
    submit(CALL_LETTER_V2_TWO_TOUCHPOINTS)
