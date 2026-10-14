"""Préparer les métamagies et manifestations structurées du PHB, sans extraction PDF."""
import json
from phb_corpus import option_texts
from translation_packs import ROOT

rows, coverage = option_texts()
(ROOT/'work/generated/option-texts.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
(ROOT/'audit/generes/options-srd.json').write_text(json.dumps(coverage, ensure_ascii=False, indent=2)+'\n')
print(f'{len(coverage)} options et {len(rows)} blocs chargés depuis le PHB structuré')
