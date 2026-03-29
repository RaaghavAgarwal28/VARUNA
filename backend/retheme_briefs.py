"""
Batch-regenerate all HTML brief files with the new VARUNA theme.
Run from the backend directory: python retheme_briefs.py
"""
import json
from pathlib import Path
import sys

# Add parent to path so we can import the briefing module
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.services.briefing import generate_brief

REPORTS_DIR = Path(__file__).resolve().parent / "reports"

count = 0
errors = 0

for json_file in sorted(REPORTS_DIR.glob("case-varuna-*-brief.json")):
    try:
        payload = json.loads(json_file.read_text(encoding="utf-8"))
        generate_brief(payload)
        count += 1
        if count % 50 == 0:
            print(f"  Regenerated {count} briefs...")
    except Exception as e:
        errors += 1
        print(f"  SKIP {json_file.name}: {e}")

print(f"\nDone. Regenerated {count} HTML briefs. Errors: {errors}")
