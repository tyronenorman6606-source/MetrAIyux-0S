export const name='templates.routes'; export const area='templates';
export const owns=['template search','template detail','source-truth records'];
export const routes=['GET /api/v17/templates/search','GET /api/v17/templates/:id/metadata'];
export async function handle(ctx){
  const { method, url, sendJSON, loadManifest, loadTemplateBundle } = ctx;
  if(method==='GET' && url.pathname==='/api/v17/templates/search'){
    const manifest=await loadManifest(); let rows=manifest.records||[];
    const q=String(url.searchParams.get('q')||'').toLowerCase().trim(); const category=String(url.searchParams.get('category')||'').trim(); const risk=String(url.searchParams.get('risk')||'').trim(); const jurisdiction=String(url.searchParams.get('jurisdiction')||url.searchParams.get('state')||'').toUpperCase().trim();
    if(q) rows=rows.filter(r=>`${r.title} ${r.id} ${r.category_name} ${r.state_name}`.toLowerCase().includes(q));
    if(category) rows=rows.filter(r=>r.category_slug===category || r.category_name===category);
    if(risk) rows=rows.filter(r=>r.risk_level===risk);
    if(jurisdiction) rows=rows.filter(r=>r.jurisdiction_id===jurisdiction || r.state_code===jurisdiction.replace(/^US-/,''));
    const page=Math.max(1,Number(url.searchParams.get('page')||1)); const pageSize=Math.min(100,Math.max(1,Number(url.searchParams.get('pageSize')||25))); const start=(page-1)*pageSize;
    return sendJSON(200,{ok:true,version:'17.0.0',total:rows.length,page,pageSize,totalPages:Math.ceil(rows.length/pageSize),items:rows.slice(start,start+pageSize)});
  }
  const m=url.pathname.match(/^\/api\/v17\/templates\/([^/]+)\/metadata$/);
  if(method==='GET' && m){ const bundle=await loadTemplateBundle(decodeURIComponent(m[1])); return sendJSON(200,{ok:true,meta:bundle.meta,questionCount:bundle.questions.length,questions:bundle.questions,sourcePath:bundle.meta.sourcePath,appliedOverrides:bundle.meta.appliedOverrides||[]}); }
  return {handled:false};
}
