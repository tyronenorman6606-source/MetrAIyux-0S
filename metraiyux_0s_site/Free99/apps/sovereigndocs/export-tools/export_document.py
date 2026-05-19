#!/usr/bin/env python3
import argparse, json, re, html, zipfile, pathlib, datetime

def render_template(text, data):
    def cond(m):
        key=m.group(1).strip(); body=m.group(2)
        return body if data.get(key) else ''
    text=re.sub(r'\{\{#if\s+([^}]+)\}\}(.*?)\{\{/if\}\}', cond, text, flags=re.S)
    def var(m):
        key=m.group(1).strip()
        return str(data.get(key, ''))
    return re.sub(r'\{\{\s*([^#/{][^}]*)\}\}', var, text)

def md_to_html(md):
    lines=[]
    for line in md.splitlines():
        if line.startswith('# '): lines.append(f'<h1>{html.escape(line[2:])}</h1>')
        elif line.startswith('## '): lines.append(f'<h2>{html.escape(line[3:])}</h2>')
        elif not line.strip(): lines.append('')
        else: lines.append(f'<p>{html.escape(line)}</p>')
    return '<!doctype html><html><head><meta charset="utf-8"><title>SovereignDocs Export</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;line-height:1.55}h1,h2{page-break-after:avoid}.sig{margin-top:32px}</style></head><body>'+"\n".join(lines)+'</body></html>'

def write_docx(path, title, paragraphs):
    def esc(s): return html.escape(s)
    document_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    for p in paragraphs:
        style=''
        if p.startswith('# '):
            p=p[2:]; style='<w:pPr><w:pStyle w:val="Title"/></w:pPr>'
        elif p.startswith('## '):
            p=p[3:]; style='<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
        document_xml += f'<w:p>{style}<w:r><w:t xml:space="preserve">{esc(p)}</w:t></w:r></w:p>'
    document_xml += '<w:sectPr/></w:body></w:document>'
    content_types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/document.xml', document_xml)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--template', required=True)
    ap.add_argument('--data', required=True)
    ap.add_argument('--out', required=True)
    args=ap.parse_args()
    tpl=json.load(open(args.template))
    data=json.load(open(args.data))
    md=render_template(tpl.get('render_markdown') or '\n\n'.join(['# '+tpl.get('title','Document')]+[f"## {s.get('heading')}\n{s.get('body','')}" for s in tpl.get('sections',[])]), data)
    out=pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
    slug=tpl.get('slug','document')
    (out/f'{slug}.md').write_text(md)
    (out/f'{slug}.html').write_text(md_to_html(md))
    write_docx(out/f'{slug}.docx', tpl.get('title','Document'), md.splitlines())
    print(json.dumps({'ok':True,'outputs':[str(out/f'{slug}.md'),str(out/f'{slug}.html'),str(out/f'{slug}.docx')]}))
if __name__=='__main__': main()
