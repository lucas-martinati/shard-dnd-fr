"""Registre des traductions, sources de génération et fichiers intermédiaires."""
import json
from pathlib import Path

WORK = Path(__file__).resolve().parent
ROOT = WORK.parent
CONFIG = json.loads((ROOT / 'sources-generation/chemins.json').read_text())
PATHS = CONFIG['chemins']


def source(name):
    return ROOT / PATHS[name] if name in PATHS else WORK / 'generated' / name


def tsv_sources():
    """Garder l’ordre des correspondances indépendamment de leur classement."""
    return [source(name) for name in CONFIG['ordreLectureTSV']]

# Ordre historique des dictionnaires, partagé par la génération et les segments.
DICTIONARIES = [('MONSTERS', 'monsters'), ('SPELLS', 'spells'), ('TERMS', 'terms'), ('EQUIPMENT', 'equipment'), ('INTERFACE', 'interface'), ('RULES2024', '2024'), ('MAGICITEMS', 'magic-items'), ('GM', 'gm'), ('EXPANSION', 'expansion'), ('DESCRIPTIONS', 'descriptions'), ('DRUID', 'druid-descriptions'), ('CREATION', 'creation-2024'), ('CANONICAL_SPELLS', 'canonical-spells'), ('CANONICAL_FEATURES', 'canonical-features'), ('CANONICAL_COMBAT', 'canonical-combat'), ('COMBAT_DESCRIPTIONS', 'combat-descriptions'), ('FEATURE_TERMS', 'feature-terms')]
