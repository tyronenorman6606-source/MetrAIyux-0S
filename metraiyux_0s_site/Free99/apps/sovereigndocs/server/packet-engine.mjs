export function buildPacketManifest({ packetId = 'custom-packet', title = 'SovereignDocs Packet', templateIds = [], answersByTemplate = {}, session = {}, boundary = {} }){
  const now = new Date().toISOString();
  return { id:`packet_${Date.now()}_${Math.random().toString(16).slice(2)}`, packetId, title, templateIds:[...new Set(templateIds.map(String))], answersByTemplate, owner:session?.user ? { id:session.user.id, orgId:session.user.orgId || null } : null, boundary, status:'packet_draft_created', createdAt:now, updatedAt:now };
}
export function renderPacketMarkdown({ packet, renderedDocuments = [] }){
  const toc = renderedDocuments.map((doc, i) => `${i+1}. ${doc.title || doc.templateId}`).join('\n');
  const body = renderedDocuments.map((doc, i) => `\n\n---\n\n# Packet Document ${i+1}: ${doc.title || doc.templateId}\n\n${doc.markdown || doc.content || ''}`).join('');
  return `# ${packet.title}\n\nSovereignDocs packet export. This is self-help document automation only and is not legal advice.\n\n## Packet Contents\n\n${toc || 'No documents selected.'}${body}`;
}
