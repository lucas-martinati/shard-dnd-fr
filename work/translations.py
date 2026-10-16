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
    BLOCK_TAGS = {'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'div'}

    def __init__(self, include_labels=False):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.blocks = []
        self.include_labels = include_labels

    def is_block(self, tag):
        # Un lien à l’intérieur d’une phrase reste un fragment du paragraphe.
        standalone_link = tag == 'a' and not any(frame['tag'] in self.BLOCK_TAGS - {'div'} | {'button', 'label'} for frame in self.stack)
        return tag in self.BLOCK_TAGS or (self.include_labels and (tag in {'button', 'label', 'option'} or standalone_link))

    def flush(self, frame):
        text = re.sub(r'\s+', ' ', ''.join(frame['text'])).strip()
        if text and not frame['ignored']:
            self.blocks.append(text)
        frame['text'] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        inherited = bool(self.stack and self.stack[-1]['ignored'])
        classes = set(attrs.get('class', '').split())
        ignored = inherited or tag in ['script', 'style', 'textarea', 'code', 'pre', 'svg', 'iframe', 'template', 'noscript', 'kbd', 'samp', 'canvas'] or 'data-shard-fr-ignore' in attrs or 'hidden' in attrs or attrs.get('aria-hidden') == 'true' or ('contenteditable' in attrs and attrs['contenteditable'] != 'false') or attrs.get('role') == 'textbox' or bool(classes & {'ql-editor', 'ProseMirror', 'CodeMirror', 'monaco-editor'}) or (tag == 'option' and 'value' not in attrs)
        # Les attributs d'affichage sont traduisibles ; jamais la valeur d'un champ.
        if self.include_labels and not ignored:
            self.blocks.extend(attrs[attr] for attr in ['title', 'aria-label', 'placeholder', 'alt'] if attrs.get(attr))
        if tag in ['br', 'hr']:
            self.handle_data(' ')
            return
        if tag in ['input', 'img', 'meta', 'link', 'wbr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track']:
            return
        if self.is_block(tag) and self.stack and not ignored:
            self.flush(self.stack[-1])
        self.stack.append({'tag': tag, 'attrs': attrs, 'text': [], 'ignored': ignored})

    def handle_data(self, data):
        if self.stack and not self.stack[-1]['ignored']:
            self.stack[-1]['text'].append(data)

    def handle_endtag(self, tag):
        if not any(frame['tag'] == tag for frame in self.stack):
            return
        while self.stack[-1]['tag'] != tag:
            self.handle_endtag(self.stack[-1]['tag'])
        frame = self.stack.pop()
        if frame['ignored']:
            return
        text = re.sub(r'\s+', ' ', ''.join(frame['text'])).strip()
        if self.is_block(tag):
            self.flush(frame)
        elif self.stack:
            self.stack[-1]['text'].append(''.join(frame['text']))


def audit(path, include_labels=False, all_unknown=False):
    known = set()
    for filename in ['complete-texts.json', 'feat-texts.json']:
        for row in json.loads(translation_source(filename).read_text()):
            known.update([key(row['en']), key(row['fr'])])
    for row in load_packs():
        known.update([key(row['en']), key(row['fr'])])
    for row in json.loads((ROOT/'sources-generation/catalogues/aidedd-2024.json').read_text()):
        known.update([key(row['en']), key(row['fr'])])
    parser = Blocks(include_labels)
    parser.feed(Path(path).read_text(encoding='utf-8'))
    parser.close()
    while parser.stack:
        parser.handle_endtag(parser.stack[-1]['tag'])
    missing, seen = [], set()
    for text in parser.blocks:
        normalized = key(text)
        if normalized in seen or normalized in known:
            continue
        seen.add(normalized)
        # Candidats seulement : un nom propre ou une phrase maison n’est pas
        # nécessairement une règle à traduire. Aucun rapprochement approximatif.
        if ((include_labels or all_unknown) and re.search(r'[a-zA-Z]', text)) or re.search(r'\b(?:the|this|these|those|you|your|when|whenever|choose|gain|spell|damage|saving|proficiency|prerequisite|enemies|enemy|target|creature|within|must|cannot|while|during|until|against|each|once|twice|unknown|missing)\b', text, re.I):
            missing.append({'en': text, 'kind': 'description' if len(text) >= 35 else 'term'})
    return {'blocks': len(parser.blocks), 'missingCount': len(missing), 'missing': missing}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('check', help='Valider les packs de traductions détectés récursivement')
    scan = commands.add_parser('audit', help='Lister les passages anglais inconnus dans un HTML local')
    scan.add_argument('html', type=Path)
    scan.add_argument('--output', type=Path, help='Enregistrer le rapport JSON localement')
    scan.add_argument('--labels', action='store_true', help='Inclure les libellés et attributs inconnus, à trier manuellement')
    scan.add_argument('--all', action='store_true', help='Lister tous les blocs inconnus, sans filtre de langue (noms propres et français compris)')
    args = parser.parse_args()
    rows = load_packs()
    if args.command == 'check':
        from phb_corpus import class_texts, option_texts
        classes = class_texts()
        options, option_index = option_texts()
        descriptions = sum(row['kind'] == 'description' for row in rows)
        print(f'{len(rows)} correspondances valides : {descriptions} descriptions, {len(rows)-descriptions} libellés.')
        print(f'Corpus PHB structuré valide : {len(classes)} aptitudes, {len(option_index)} options et {len(options)} blocs.')
    else:
        report = audit(args.html, include_labels=args.labels, all_unknown=args.all)
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
