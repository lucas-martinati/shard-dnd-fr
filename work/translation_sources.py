"""Chemins des dictionnaires et références, rangés par catégorie générale."""
import json
from pathlib import Path

WORK = Path(__file__).resolve().parent
PATHS = json.loads((WORK / 'translation-paths.json').read_text())


def source(name):
    return (WORK / PATHS[name]).resolve() if name in PATHS else WORK / name

# Ordre historique des dictionnaires, partagé par la génération et les segments.
DICTIONARIES = [('MONSTERS', 'monsters'), ('SPELLS', 'spells'), ('TERMS', 'terms'), ('EQUIPMENT', 'equipment'), ('INTERFACE', 'interface'), ('RULES2024', '2024'), ('MAGICITEMS', 'magic-items'), ('GM', 'gm'), ('EXPANSION', 'expansion'), ('DESCRIPTIONS', 'descriptions'), ('DRUID', 'druid-descriptions'), ('CREATION', 'creation-2024'), ('CANONICAL_SPELLS', 'canonical-spells'), ('CANONICAL_FEATURES', 'canonical-features'), ('CANONICAL_COMBAT', 'canonical-combat'), ('COMBAT_DESCRIPTIONS', 'combat-descriptions'), ('FEATURE_TERMS', 'feature-terms')]
