from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
public_html=list(root.glob('index.html'))+list((root/'clients').glob('*/*.html'))+list((root/'arrival').glob('*.html'))+list((root/'northstar').glob('index.html'))
banned=[
 'public-surface fact','source receipt','official-source','operator-facing','build rationale','fake logo','fake data','placeholder copy','template copy','lorem ipsum','app integration slot','mount target','ready for app connection','public listing','official media','source-safe','dev note','implementation note','only missing','todo:'
]
errors=[]
for path in public_html:
    text=path.read_text(errors='ignore').lower()
    for term in banned:
        if term in text:
            errors.append(f'{path.relative_to(root)} contains banned public phrase: {term}')
# Route checks
for cfg in (root/'clients').glob('*/campaign.config.json'):
    slug=cfg.parent.name
    for name in ['index.html','blog.html']:
        html=(cfg.parent/name).read_text(errors='ignore')
        expected=f'../../northstar/index.html?workspace={slug}'
        if expected not in html:
            errors.append(f'{cfg.parent.relative_to(root)}/{name} does not route to central workspace {expected}')
if not (root/'northstar/index.html').exists(): errors.append('central northstar app missing')
if not list((root/'netlify/functions').glob('*.mjs')): errors.append('root Netlify functions missing')
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('PASS final public copy + central NorthStar workspace audit')
