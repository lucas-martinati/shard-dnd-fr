"""Préparer les aptitudes structurées du PHB et leur inventaire, sans extraction PDF."""
import json
from phb_corpus import class_texts
from translation_packs import ROOT


def generate():
    rows = class_texts()
    coverage = [{'class': row['class'], 'level': row['level'], 'en': row['name'],
                 'fr': row['frName'], 'description': True, 'pending': None} for row in rows]
    (ROOT/'work/generated/class-texts.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'audit/generes/classes-srd.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=2)+'\n')
    print(f'{len(rows)} descriptions de classes chargées depuis le PHB structuré')


if __name__ == '__main__':
    generate()
