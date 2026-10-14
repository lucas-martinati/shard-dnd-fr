"""Assembler les descriptions des corpus 2014 et PHB 2024 pour la génération uniquement."""
import json
from translation_sources import source

rows = []
for name in ['feat-texts-2014.json', 'feat-texts-phb.json']:
    rows.extend(json.loads(source(name).read_text()))
source('feat-texts.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(f'{len(rows)} descriptions de dons assemblées depuis les corpus 2014 et PHB 2024')
