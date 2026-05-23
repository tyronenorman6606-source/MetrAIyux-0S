from pathlib import Path
import re, json
root = Path(__file__).resolve().parents[1]
public = []
public += list((root/'clients').glob('*/index.html'))
public += list((root/'clients').glob('*/blog.html'))
public += [root/'index.html', root/'arrival/index.html', root/'assets/ui.js', root/'assets/data/clients.json']
blocked = [
 'public-surface fact','the page is the advertisement','arrival system','this landing is designed',
 'official media','official visuals','official-source','official-asset','source receipt','public listing',
 'public page','public homepage','public site','public surface','public copy','preview pack','preview directory',
 'preview only','no fake','fake logo','generated media','template copy','app integration','app handoff',
 'client slug','operator-facing','build rationale','use assets n shit','rollout','the page is written around',
 'does this compete','this is a focused start point','launch real app here','localStorage.setItem','public information','built from the public experience','arrival page speaks','official-link'
]
fail=[]
for p in public:
    s=p.read_text(errors='ignore').lower()
    for b in blocked:
        if b.lower() in s:
            fail.append((str(p.relative_to(root)), b))
if fail:
    print('FAIL')
    for f,b in fail: print(f'{f}: {b}')
    raise SystemExit(1)
print('PASS client-facing pages are clean; app shell contains no fake check-in persistence')
