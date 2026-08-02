#!/usr/bin/env python3
import argparse
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

TARGETS = ('gateway', 'file-service', 'post-service', 'frontend')


def load(path: Path) -> dict:
    if not path.exists():
        return {'version': 1, 'targets': {}}
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('version') != 1 or not isinstance(data.get('targets'), dict):
        raise SystemExit('Deployment state has an unsupported format.')
    return data


def save(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f'.{path.name}.', dir=path.parent, text=True)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            json.dump(data, output, separators=(',', ':'), sort_keys=True)
            output.write('\n')
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


parser = argparse.ArgumentParser()
parser.add_argument('state_file', type=Path)
subparsers = parser.add_subparsers(dest='command', required=True)

get_parser = subparsers.add_parser('get')
get_parser.add_argument('target', choices=TARGETS)
get_parser.add_argument('field', choices=('current', 'previous', 'timestamp', 'source'))

promote_parser = subparsers.add_parser('promote')
promote_parser.add_argument('target', choices=TARGETS)
promote_parser.add_argument('sha')
promote_parser.add_argument('source')

rollback_parser = subparsers.add_parser('rollback')
rollback_parser.add_argument('target', choices=TARGETS)
rollback_parser.add_argument('source')

subparsers.add_parser('initialized')
args = parser.parse_args()
state = load(args.state_file)

if args.command == 'get':
    print(state['targets'].get(args.target, {}).get(args.field, ''))
elif args.command == 'initialized':
    raise SystemExit(0 if all(state['targets'].get(target, {}).get('current') for target in TARGETS) else 1)
elif args.command == 'promote':
    if not re.fullmatch(r'[0-9a-f]{40}', args.sha):
        raise SystemExit('Image tag must be a full Git SHA.')
    entry = state['targets'].setdefault(args.target, {})
    if entry.get('current') != args.sha:
        entry['previous'] = entry.get('current', '')
    entry.update(current=args.sha, timestamp=datetime.now(timezone.utc).isoformat(), source=args.source)
    save(args.state_file, state)
elif args.command == 'rollback':
    entry = state['targets'].get(args.target, {})
    if not entry.get('previous'):
        raise SystemExit(f'No previous successful image exists for {args.target}.')
    entry['current'], entry['previous'] = entry['previous'], entry.get('current', '')
    entry.update(timestamp=datetime.now(timezone.utc).isoformat(), source=args.source)
    save(args.state_file, state)
