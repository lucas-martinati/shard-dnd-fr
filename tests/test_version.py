import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'work'))
from version import read_version, set_version, sync_lock


class VersionTests(unittest.TestCase):
    def test_single_edit_updates_only_root_lock_versions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'package.json').write_text(json.dumps({'version': '2.3.4'}))
            lock = {'version': '1.0.0', 'packages': {
                '': {'version': '1.0.0'}, 'node_modules/example': {'version': '9.8.7'}}}
            (root / 'package-lock.json').write_text(json.dumps(lock))
            self.assertEqual(sync_lock(root), '2.3.4')
            result = json.loads((root / 'package-lock.json').read_text())
            self.assertEqual(result['version'], '2.3.4')
            self.assertEqual(result['packages']['']['version'], '2.3.4')
            self.assertEqual(result['packages']['node_modules/example']['version'], '9.8.7')
            before = (root / 'package-lock.json').read_bytes()
            sync_lock(root)
            self.assertEqual((root / 'package-lock.json').read_bytes(), before)
            self.assertEqual(set_version('2.3.5', root), '2.3.5')
            self.assertEqual(read_version(root), '2.3.5')
            with self.assertRaises(ValueError):
                set_version('invalid', root)
            self.assertEqual(read_version(root), '2.3.5')
