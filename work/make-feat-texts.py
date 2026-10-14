"""Assembler les descriptions des deux livres pour la génération uniquement."""
import json
from translation_sources import source

rows = []
for name in ['feat-texts-guide.json', 'feat-texts-phb.json']:
    rows.extend(json.loads(source(name).read_text()))
source('feat-texts.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(f'{len(rows)} descriptions de dons assemblées depuis les livres séparés')
