"""Chemins des dictionnaires et références, rangés par catégorie générale."""
import json
from pathlib import Path

WORK = Path(__file__).resolve().parent
PATHS = json.loads((WORK / 'translation-paths.json').read_text())


def source(name):
    return (WORK / PATHS[name]).resolve() if name in PATHS else WORK / name
