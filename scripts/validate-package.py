"""Validate the exact uploaded archive using the standard library."""
import json
import pathlib
import sys
import zipfile

archive = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(archive) as package:
    names = package.namelist()
    assert len(names) == len(set(names)), 'Duplicate ZIP entries'
    for name in names:
        assert not name.startswith(('/', './')) and '\\' not in name and '..' not in name.split('/'), f'Unsafe ZIP path: {name}'
        assert not name.startswith(('site/', 'site-dist/', 'feedback/', 'node_modules/', '.git/')), f'Unexpected package content: {name}'
    assert package.testzip() is None, 'ZIP integrity check failed'
    manifest = json.loads(package.read('manifest.json'))
    references = list(manifest.get('icons', {}).values())
    references += [manifest['action']['default_popup'], manifest['options_ui']['page']]
    if manifest.get('background'):
        references.append(manifest['background']['service_worker'])
    for entry in manifest['content_scripts']:
        references += entry.get('js', []) + entry.get('css', [])
    for name in references:
        assert name in names, f'Missing manifest asset: {name}'
    assert f"_locales/{manifest['default_locale']}/messages.json" in names
    for name in names:
        if name.startswith('_locales/') and name.endswith('/messages.json'):
            messages = json.loads(package.read(name))
            for key in ('extensionName', 'extensionDescription', 'extensionActionTitle'):
                assert messages.get(key, {}).get('message'), f'Missing {key}: {name}'
    assert len(json.loads(package.read('_locales/en/messages.json'))['extensionDescription']['message']) <= 132
print(f'Validated {archive.name}: {len(names)} entries, version {manifest["version"]}')
