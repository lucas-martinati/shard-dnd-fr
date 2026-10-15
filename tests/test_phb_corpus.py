import copy
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'work'))
from phb_corpus import DIRECTORY, class_texts, option_texts


class PhbCorpusTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.classes = json.loads((DIRECTORY / 'descriptions-srd.json').read_text())
        self.options = json.loads((DIRECTORY / 'options-srd.json').read_text())

    def tearDown(self):
        self.temp.cleanup()

    def save(self):
        for name, data in [('descriptions-srd.json', self.classes), ('options-srd.json', self.options)]:
            (self.directory / name).write_text(json.dumps(data))

    def test_metadata_and_option_variants_survive(self):
        self.save()
        rows = class_texts(self.directory)
        self.assertEqual(len(rows), 232)
        self.assertEqual((rows[0]['class'], rows[0]['level'], rows[0]['name']), ('barbarian', 1, 'Rage'))
        self.assertTrue(rows[0]['source'].startswith('SRD 5.2.1 EN/FR'))
        blocks, index = option_texts(self.directory)
        self.assertEqual(len(blocks), 70)
        self.assertEqual(len(index), 38)
        self.assertEqual(sum(row['kind'] == 'metamagic' for row in index), 10)

    def test_known_pdf_spacing_errors_do_not_return(self):
        rows = {row['id']: row for row in class_texts()}
        expectations = {
            'srd.classes.barbarian.1': ['Vous pouvez vous animer d’une force primitive appelée', 'si vous ne portez pas d’armure lourde', 'Neutralisé. Si votre Rage est encore active'],
            'srd.classes.barbarian.8': ['le don Amélioration de caractéristique', 'cette aptitude aux niveaux de Barbare 8, 12 et 16'],
            'srd.classes.cleric.1': ['que le nombre de sorts de votre liste corresponde au', 'niveau 3'],
            'srd.classes.cleric.5': ['pour lequel', 'Vous recevez de nouveau'],
            'srd.classes.druid.1': ['Chaque fois que vous gagnez un niveau de Druide', 'Sorts préparés du 1er niveau et plus', 'Amitié avec les animaux, lueurs féeriques, soins et vague tonnante'],
            'srd.classes.monk.20': ['Au début de votre tour', 'pendant 1 minute', 'l’état Neutralisé', 'Durant cet intervalle'],
        }
        for ident, fragments in expectations.items():
            for fragment in fragments:
                with self.subTest(ident=ident, fragment=fragment):
                    self.assertIn(fragment, rows[ident]['fr'])
        options, _ = option_texts()
        careful = next(row['fr'] for row in options if row['en'].startswith('Cost: 1 Sorcery Point When you cast a spell that forces'))
        self.assertIn('1 point de Sorcellerie et désignez', careful)
        self.assertIn('leur jet de sauvegarde contre le sort et ne subissent', careful)
        # Ces textes français n’emploient pas de mots à capitales internes.
        for row in [*rows.values(), *options]:
            self.assertIsNone(re.search(r'[a-zà-öø-ÿ][A-ZÀ-ÖØ-Þ]', row['fr']), row['fr'])

    def test_edited_translation_is_authoritative(self):
        self.classes['entries'][0]['fr'] += ' Texte relu.'
        self.options['entries'][0]['blocks'][0]['fr'] += ' Texte relu.'
        self.save()
        self.assertTrue(class_texts(self.directory)[0]['fr'].endswith('Texte relu.'))
        self.assertTrue(option_texts(self.directory)[0][0]['fr'].endswith('Texte relu.'))

    def test_missing_classes_and_duplicate_ids_are_rejected(self):
        self.classes['entries'].append(copy.deepcopy(self.classes['entries'][0]))
        self.save()
        with self.assertRaisesRegex(ValueError, 'dupliqué'):
            class_texts(self.directory)
        self.classes['entries'] = self.classes['entries'][:1]
        self.save()
        with self.assertRaisesRegex(ValueError, '12 classes'):
            class_texts(self.directory)

    def test_invalid_level_and_unknown_fields_are_rejected(self):
        self.classes['entries'][0]['level'] = True
        self.save()
        with self.assertRaisesRegex(ValueError, 'niveau invalide'):
            class_texts(self.directory)
        self.options['entries'][0]['block'] = []
        self.save()
        with self.assertRaisesRegex(ValueError, 'champs d’option'):
            option_texts(self.directory)

    def test_values_and_dice_order_are_checked(self):
        block = self.options['entries'][0]['blocks'][0]
        block.update(en='Roll 1d6 then 1d8.', fr='Lancez 1d8 puis 1d6.')
        self.save()
        with self.assertRaisesRegex(ValueError, 'réordonnés'):
            option_texts(self.directory)
        block['fr'] = 'Lancez 2d6 puis 1d8.'
        self.save()
        with self.assertRaisesRegex(ValueError, 'nombres différents'):
            option_texts(self.directory)

    def test_source_and_empty_options_are_rejected(self):
        self.classes['source'] = ''
        self.save()
        with self.assertRaisesRegex(ValueError, 'source ou édition'):
            class_texts(self.directory)
        self.options['entries'][0]['blocks'] = []
        self.save()
        with self.assertRaisesRegex(ValueError, 'blocs de traduction'):
            option_texts(self.directory)


if __name__ == '__main__':
    unittest.main()
