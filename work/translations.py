"""Valider les packs et auditer un extrait HTML local, sans réseau."""
import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from translation_packs import ROOT, key, load_packs
from translation_sources import source as translation_source


class Blocks(HTMLParser):
    def __init__(self, include_labels=False):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.blocks = []
        self.include_labels = include_labels

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        inherited = bool(self.stack and self.stack[-1]['ignored'])
        classes = set(attrs.get('class', '').split())
        ignored = inherited or tag in ['script', 'style', 'textarea', 'code', 'pre', 'svg', 'iframe', 'template', 'noscript', 'kbd', 'samp', 'canvas'] or 'data-shard-fr-ignore' in attrs or ('contenteditable' in attrs and attrs['contenteditable'] != 'false') or attrs.get('role') == 'textbox' or bool(classes & {'ql-editor', 'ProseMirror', 'CodeMirror', 'monaco-editor'}) or (tag == 'option' and 'value' not in attrs)
        # Les attributs d'affichage sont traduisibles ; jamais la valeur d'un champ.
        if self.include_labels and not inherited and tag not in ['script', 'style', 'iframe', 'svg'] and 'data-shard-fr-ignore' not in attrs:
            self.blocks.extend(attrs[attr] for attr in ['title', 'aria-label', 'placeholder', 'alt'] if attrs.get(attr))
        if tag in ['br', 'hr']:
            self.handle_data(' ')
            return
        if tag in ['input', 'img', 'meta', 'link', 'wbr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track']:
            return
        self.stack.append({'tag': tag, 'attrs': attrs, 'text': [], 'blocks': False, 'ignored': ignored})

    def handle_data(self, data):
        if self.stack and not self.stack[-1]['ignored']:
            self.stack[-1]['text'].append(data)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1]['tag'] != tag:
            return
        frame = self.stack.pop()
        if frame['ignored']:
            return
        text = re.sub(r'\s+', ' ', ''.join(frame['text'])).strip()
        block = tag in ['p', 'li', 'h1', 'h2', 'h3', 'td', 'th', 'div'] or (self.include_labels and tag in ['button', 'label', 'a', 'option'])
        if block and not frame['blocks'] and text:
            self.blocks.append(text)
        if self.stack:
            self.stack[-1]['text'].append(text + (' ' if block else ''))
            self.stack[-1]['blocks'] |= block or frame['blocks']


def audit(path, include_labels=False):
    known = set()
    for filename in (ROOT / 'translations').rglob('*.tsv'):
        for line in filename.read_text().splitlines():
            if '|' in line:
                en, fr = line.split('|', 1)
                known.update([key(en), key(fr)])
    for filename in ['complete-texts.json', 'feature-texts.json', 'feat-texts.json']:
        for row in json.loads(translation_source(filename).read_text()):
            known.update([key(row['en']), key(row['fr'])])
    for row in load_packs():
        known.update([key(row['en']), key(row['fr'])])
    for row in json.loads((ROOT/'work/aidedd-catalog.json').read_text()):
        known.update([key(row['en']), key(row['fr'])])
    parser = Blocks(include_labels)
    parser.feed(Path(path).read_text(encoding='utf-8'))
    missing, seen = [], set()
    for text in parser.blocks:
        normalized = key(text)
        if normalized in seen or normalized in known:
            continue
        seen.add(normalized)
        # Candidats seulement : un nom propre ou une phrase maison n’est pas
        # nécessairement une règle à traduire. Aucun rapprochement approximatif.
        if (include_labels and re.search(r'[a-zA-Z]', text)) or re.search(r'\b(?:you|your|when|whenever|choose|gain|spell|damage|saving|proficiency|prerequisite)\b', text, re.I):
            missing.append({'en': text, 'kind': 'description' if len(text) >= 35 else 'term'})
    return {'blocks': len(parser.blocks), 'missingCount': len(missing), 'missing': missing}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('check', help='Valider les fichiers translations/*.json')
    scan = commands.add_parser('audit', help='Lister les passages anglais inconnus dans un HTML local')
    scan.add_argument('html', type=Path)
    scan.add_argument('--output', type=Path, help='Enregistrer le rapport JSON localement')
    scan.add_argument('--labels', action='store_true', help='Inclure les libellés et attributs inconnus, à trier manuellement')
    args = parser.parse_args()
    rows = load_packs()
    if args.command == 'check':
        descriptions = sum(row['kind'] == 'description' for row in rows)
        print(f'{len(rows)} correspondances valides : {descriptions} descriptions, {len(rows)-descriptions} libellés.')
    else:
        report = audit(args.html, include_labels=args.labels)
        text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
        if args.output:
            args.output.write_text(text, encoding='utf-8')
            print(f'{report["missingCount"]} candidats dans {report["blocks"]} blocs ; rapport : {args.output}')
        else:
            print(text, end='')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as exc:
        print(f'Erreur : {exc}', file=sys.stderr)
        sys.exit(1)
