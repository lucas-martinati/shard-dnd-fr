"""Version de publication : package.json est l'unique source de vérité."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_version(root=ROOT):
    version = json.loads((root / 'package.json').read_text())['version']
    if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('La version doit respecter le format MAJEURE.MINEURE.CORRECTIF.')
    return version


def sync_lock(root=ROOT):
    version = read_version(root)
    path = root / 'package-lock.json'
    lock = json.loads(path.read_text())
    if lock['version'] != version or lock['packages']['']['version'] != version:
        lock['version'] = lock['packages']['']['version'] = version
        path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n')
    return version


def set_version(version, root=ROOT):
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('La version doit respecter le format MAJEURE.MINEURE.CORRECTIF.')
    path = root / 'package.json'
    package = json.loads(path.read_text())
    package['version'] = version
    path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n')
    return sync_lock(root)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['patch', 'set', 'sync'])
    parser.add_argument('version', nargs='?')
    args = parser.parse_args()
    if args.action == 'set':
        if args.version is None:
            parser.error('set attend une version, par exemple 1.18.0')
        result = set_version(args.version)
    elif args.action == 'patch':
        major, minor, patch = map(int, read_version().split('.'))
        result = set_version(f'{major}.{minor}.{patch + 1}')
    else:
        result = sync_lock()
    print(f'Version : {result}')
