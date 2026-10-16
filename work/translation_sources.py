"""Registre des traductions, sources de génération et fichiers intermédiaires."""
import json
from pathlib import Path

WORK = Path(__file__).resolve().parent
ROOT = WORK.parent
CONFIG = json.loads((ROOT / 'sources-generation/chemins.json').read_text())
PATHS = CONFIG['chemins']


def source(name):
    return ROOT / PATHS[name] if name in PATHS else WORK / 'generated' / name
