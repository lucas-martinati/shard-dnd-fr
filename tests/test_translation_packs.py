import json
import sys
import tempfile
import unittest
from pathlib import Path

# Les modules de génération restent dans work/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "work"))

from translation_packs import key, load_packs, check_existing
from translations import audit


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

    def test_variant_conflict_and_negation(self):
        self.write([self.entry(en="You can't use this power.", fr='Vous ne pouvez pas utiliser ce pouvoir.'), self.entry(id='test.other', en='You cannot use this power.', fr='Autre règle.')])
        with self.assertRaisesRegex(ValueError, 'contradictoire'):
            load_packs(self.root)
        self.assertNotEqual(key('You can use this power.'), key("You can't use this power."))

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


if __name__ == '__main__':
    unittest.main()
