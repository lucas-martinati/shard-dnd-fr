import json
import sys
import tempfile
import unittest
from pathlib import Path

# Les modules de génération restent dans work/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "work"))

from translation_packs import key, load_packs, check_existing, deduplicate_descriptions
from translations import audit
from translation_coverage import book_report


class PacksTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def write(self, entries, name='pack.json'):
        pack = {'schemaVersion': 1, 'edition': '2024', 'source': 'Test fixture', 'entries': entries}
        (self.root / name).write_text(json.dumps(pack))

    def entry(self, **values):
        return {'id': 'test.power', 'en': 'You regain 1d10 Hit Points.', 'fr': 'Vous récupérez 1d10 points de vie.', **values}

    def test_entry_provenance_survives_grouping(self):
        self.write([self.entry(source='SRD français', edition='2014')])
        row = load_packs(self.root)[0]
        self.assertEqual(row['source'], 'SRD français')
        self.assertEqual(row['edition'], '2014')
        self.write([self.entry(edition='2025')])
        with self.assertRaisesRegex(ValueError, 'source ou édition invalide'):
            load_packs(self.root)

    def test_simplified_pack_keeps_provenance_and_defaults(self):
        pack = {'edition': '2024', 'entries': [self.entry(source='Texte fourni')]}
        (self.root / 'pack.json').write_text(json.dumps(pack))
        row = load_packs(self.root)[0]
        self.assertEqual((row['source'], row['edition']), ('Texte fourni', '2024'))
        pack.pop('edition')
        pack['source'] = 'Source commune'
        pack['entries'][0].pop('source')
        (self.root / 'pack.json').write_text(json.dumps(pack))
        row = load_packs(self.root)[0]
        self.assertEqual((row['source'], row['edition']), ('Source commune', 'any'))
        pack.pop('source')
        (self.root / 'pack.json').write_text(json.dumps(pack))
        with self.assertRaisesRegex(ValueError, 'source ou édition invalide'):
            load_packs(self.root)

    def test_explicit_schema_version_still_rejects_unknown_formats(self):
        for version in [2, True, '1']:
            pack = {'schemaVersion': version, 'source': 'Test', 'entries': [self.entry()]}
            (self.root / 'pack.json').write_text(json.dumps(pack))
            with self.assertRaisesRegex(ValueError, 'schemaVersion'):
                load_packs(self.root)

    def test_numbers_and_dice_are_preserved(self):
        self.write([self.entry(fr='Vous récupérez 1d8 points de vie.')])
        with self.assertRaisesRegex(ValueError, 'nombres ou dés'):
            load_packs(self.root)
        self.write([self.entry(en='Roll 1d10.', fr='Lancez 10d1.')])
        with self.assertRaisesRegex(ValueError, 'dés différents'):
            load_packs(self.root)

    def test_plural_dice_keep_the_same_die(self):
        self.write([self.entry(en='Roll d6s.', fr='Lancez des d6.')])
        self.assertEqual(len(load_packs(self.root)), 1)

    def test_summoner_formulas_are_preserved_exactly(self):
        self.write([self.entry(en='Add {summoner wis}+{summoner proficiency}.', fr='Ajoutez {summoner wis}+{summoner proficiency}.')])
        self.assertEqual(len(load_packs(self.root)), 1)
        for fr in ['Ajoutez {sagesse}+{summoner proficiency}.', 'Ajoutez {summoner wis}.', 'Ajoutez {summoner wis}+{summoner wis}.']:
            self.write([self.entry(en='Add {summoner wis}+{summoner proficiency}.', fr=fr)])
            with self.assertRaisesRegex(ValueError, 'formules entre accolades'):
                load_packs(self.root)

    def test_dice_attached_to_shard_text_are_still_checked(self):
        self.write([self.entry(en='The creature takes1d10 damage.', fr='La créature subit 1d10 dégâts.')])
        self.assertEqual(len(load_packs(self.root)), 1)
        self.write([self.entry(en='The creature takes1d10 damage.', fr='La créature subit 10d1 dégâts.')])
        with self.assertRaisesRegex(ValueError, 'dés différents'):
            load_packs(self.root)

    def test_search_aliases_are_preserved_without_becoming_english_variants(self):
        self.write([self.entry(kind='term', en='Wand of Scowls', fr='Baguette du grincheux', aliases=['Baguette des grimaces'])])
        rows = load_packs(self.root)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['aliases'], ['Baguette des grimaces'])
        for aliases in ['Old name', [''], [3]]:
            self.write([self.entry(kind='term', aliases=aliases)])
            with self.assertRaisesRegex(ValueError, 'aliases'):
                load_packs(self.root)
        self.write([self.entry(aliases=['Old name'])])
        with self.assertRaisesRegex(ValueError, 'aliases'):
            load_packs(self.root)

    def test_variant_conflict_and_negation(self):
        self.write([self.entry(en="You can't use this power.", fr='Vous ne pouvez pas utiliser ce pouvoir.'), self.entry(id='test.other', en='You cannot use this power.', fr='Autre règle.')])
        with self.assertRaisesRegex(ValueError, 'contradictoire'):
            load_packs(self.root)
        self.assertNotEqual(key('You can use this power.'), key("You can't use this power."))

    def test_migrated_usages_and_aliases_survive_deduplication(self):
        self.write([self.entry(usage=['inline', 'name'], aliases=['Ancien libellé'], labelCategory='aptitude de classe')], 'a.json')
        self.write([self.entry(id='test.copy', usage=['search', 'inline'], aliases=['Autre nom'])], 'b.json')
        row, = load_packs(self.root)
        self.assertEqual(row['usage'], ['inline', 'name', 'search'])
        self.assertEqual(row['aliases'], ['Ancien libellé', 'Autre nom'])
        self.assertEqual(row['labelCategory'], 'aptitude de classe')
        for usage in ['name', ['unknown'], ['name', 'name']]:
            self.write([self.entry(usage=usage)], 'a.json')
            with self.assertRaisesRegex(ValueError, 'usage'):
                load_packs(self.root)

    def test_description_deduplication_preserves_priority_and_provenance(self):
        rows = [dict(en='A rule.', fr=fr, source=source) for fr, source in [
            ('Première règle.', 'SRD'), ('Ancienne variante.', 'Ancien corpus'),
            ('Règle corrigée.', 'Traduction de l’extrait fourni'),
            ('Autre variante.', 'Autre corpus'),
            ('Dernière correction.', 'Traduction proposée à partir du relevé')]]
        unique, = deduplicate_descriptions(rows)
        self.assertEqual(unique['fr'], 'Dernière correction.')
        self.assertEqual(unique['sources'], [row['source'] for row in rows])
        self.assertEqual(deduplicate_descriptions(rows[:2])[0]['fr'], 'Première règle.')
        other = dict(en='Another rule.', fr='Autre règle.', source='SRD')
        self.assertEqual(len(deduplicate_descriptions(rows + [other])), 2)
        unit_variants = [dict(en=en, fr='La même portée.', source='SRD') for en in [
            'A 10-foot range.', 'A 10 feet range.', 'A 10 ft. range.']]
        self.assertEqual(len(deduplicate_descriptions(unit_variants)), 1)

    def test_book_counts_include_nested_guide_packs(self):
        root = Path(__file__).resolve().parents[1]
        paths = ['translations/2014/objets/traductions.json',
                 'translations/2014/shard-players-guide-v1/objets/traductions.json']
        expected = sum(len(json.loads((root / path).read_text())['entries']) for path in paths)
        book = next(book for book in book_report()['livres'] if book['id'] == 'dnd-2014')
        self.assertEqual(book['packsRattachesParCategorie']['objets']['entreesRattachees'], expected)

    def test_weapon_headings_do_not_split_feminine_endings(self):
        for row in load_packs():
            if row['en'].startswith(('Special.', 'Versatile.')):
                self.assertNotRegex(row['fr'], r'^(?:Spécial|Polyvalent)\.\s+e\.\s', row['id'])
            if row['en'].startswith(('You have disadvantage when you use a lance',
                                     'A Large or smaller creature hit by a net',
                                     'A Versatile weapon can be used')):
                self.assertFalse(row['fr'].startswith('e. '), row['id'])

    def test_duplicate_ids_and_typo_fail(self):
        self.write([self.entry(), self.entry(en='Another text.')])
        with self.assertRaisesRegex(ValueError, 'id manquant ou dupliqué'):
            load_packs(self.root)
        self.write([self.entry(varaints=['Other'])])
        with self.assertRaisesRegex(ValueError, 'champs inconnus'):
            load_packs(self.root)

    def test_deterministic_files_and_variants(self):
        self.write([self.entry(id='test.z')], 'z.json')
        self.write([self.entry(id='test.a', en='You have learned this power.', fr='Vous avez appris ce pouvoir.', variants=["You've learned this power.", 'You learned this power.'])], 'a.json')
        rows = load_packs(self.root)
        self.assertEqual([r['id'] for r in rows], ['test.a', 'test.a', 'test.z'])

    def test_existing_description_cannot_be_silently_overridden(self):
        self.write([self.entry()])
        with self.assertRaisesRegex(ValueError, 'description existante'):
            check_existing(load_packs(self.root), [{'en': 'You regain 1d10 Hit Points.', 'fr': 'Une autre règle.'}])
        check_existing(load_packs(self.root), [{'en': 'You regain 1d10 Hit Points.', 'fr': 'Vous récupérez 1d10 points de vie.'}])

    def test_html_audit_skips_known_french_and_editor(self):
        path = self.root / 'page.html'
        path.write_text('<div><p>You have a limited well of physical and mental stamina that you can draw on. As a Bonus Action, you can use it to regain Hit Points equal to <b class="dodieroll">1d10</b> plus your Fighter level.</p><p>Vous récupérez vos points de vie.</p><p>You gain an unknown power.</p><textarea>You gain secret personal notes.</textarea><script>You gain hidden code.</script><div data-shard-fr-ignore>You gain hidden UI.</div></div>')
        report = audit(path)
        self.assertEqual(report['missing'], [{'en': 'You gain an unknown power.', 'kind': 'term'}])

    def test_ui_audit_labels_and_private_fields(self):
        path = self.root / 'ui.html'
        path.write_text('<button>Campaigns</button><button>Mystery category</button><input placeholder="search" value="You gain secret notes"><div contenteditable>You gain private content.</div><div contenteditable="plaintext-only">You gain private content.</div><div role="textbox">You gain private content.</div><div class="ProseMirror">You gain private content.</div><select><option>Secret value</option><option value="id">Unknown filter</option></select><button title="Unknown hint">Library</button>')
        report = audit(path, include_labels=True)
        self.assertEqual([r['en'] for r in report['missing']], ['Mystery category', 'Unknown filter', 'Unknown hint'])
        self.assertEqual(audit(path)['missing'], [])

    def test_audit_knows_catalogue_names(self):
        path = self.root / 'names.html'
        path.write_text('<button>Spell Sniper</button><button>Harm</button>')
        self.assertEqual(audit(path, include_labels=True)['missing'], [])

    def test_audit_finds_english_without_you_or_damage(self):
        path = self.root / 'enemies.html'
        path.write_text('<p>Enemies immediately vanish forever.</p><h4>The target falls.</h4>')
        self.assertEqual([row['en'] for row in audit(path)['missing']],
                         ['Enemies immediately vanish forever.', 'The target falls.'])

    def test_all_unknown_does_not_guess_language(self):
        path = self.root / 'unknown.html'
        path.write_text('<p>Silver sparks shimmer.</p><p>Une phrase française nouvelle.</p>')
        self.assertEqual(audit(path)['missing'], [])
        self.assertEqual(audit(path, all_unknown=True)['missingCount'], 2)

    def test_audit_keeps_direct_text_around_nested_blocks(self):
        path = self.root / 'mixed.html'
        path.write_text('<div>The target disappears.<p>You gain an unknown power.</p>Enemies return.</div>')
        self.assertEqual([row['en'] for row in audit(path)['missing']],
                         ['The target disappears.', 'You gain an unknown power.', 'Enemies return.'])

    def test_audit_preserves_inline_word_boundaries(self):
        path = self.root / 'inline.html'
        path.write_text('<p>The target is <b>in</b>visible.</p>')
        self.assertEqual(audit(path)['missing'][0]['en'], 'The target is invisible.')
        path.write_text('<p>The target is <a href="#condition">invisible</a>.</p>')
        self.assertEqual(audit(path, include_labels=True)['missing'][0]['en'], 'The target is invisible.')

    def test_audit_skips_hidden_and_private_attributes(self):
        path = self.root / 'private.html'
        path.write_text('<div hidden title="Private hint"><p>You gain secret power.</p></div>'
                        '<div contenteditable title="Private title">Private notes.</div>'
                        '<div role="textbox" aria-label="Private name">Private notes.</div>'
                        '<textarea placeholder="Private journal">Private notes.</textarea>'
                        '<input value="Private value" placeholder="Unknown filter">')
        self.assertEqual([row['en'] for row in audit(path, include_labels=True)['missing']], ['Unknown filter'])


if __name__ == '__main__':
    unittest.main()
