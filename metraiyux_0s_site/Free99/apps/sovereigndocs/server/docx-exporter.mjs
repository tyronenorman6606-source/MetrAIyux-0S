const encoder = new TextEncoder();

function xmlEscape(value = ''){
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function safeFilename(value = 'sovereigndocs-document'){
  return String(value || 'sovereigndocs-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sovereigndocs-document';
}

function crc32Buffer(buffer){
  let crc = -1;
  for(let i = 0; i < buffer.length; i++){
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function writeUInt32LE(value){ const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0, 0); return b; }
function writeUInt16LE(value){ const b = Buffer.alloc(2); b.writeUInt16LE(value & 0xffff, 0); return b; }

function createZip(entries){
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for(const entry of entries){
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const dataBuffer = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8');
    const crc = crc32Buffer(dataBuffer);
    const localHeader = Buffer.concat([
      writeUInt32LE(0x04034b50), writeUInt16LE(20), writeUInt16LE(0), writeUInt16LE(0),
      writeUInt16LE(0), writeUInt16LE(0), writeUInt32LE(crc), writeUInt32LE(dataBuffer.length),
      writeUInt32LE(dataBuffer.length), writeUInt16LE(nameBuffer.length), writeUInt16LE(0), nameBuffer
    ]);
    localParts.push(localHeader, dataBuffer);
    const centralHeader = Buffer.concat([
      writeUInt32LE(0x02014b50), writeUInt16LE(20), writeUInt16LE(20), writeUInt16LE(0), writeUInt16LE(0),
      writeUInt16LE(0), writeUInt16LE(0), writeUInt32LE(crc), writeUInt32LE(dataBuffer.length),
      writeUInt32LE(dataBuffer.length), writeUInt16LE(nameBuffer.length), writeUInt16LE(0), writeUInt16LE(0),
      writeUInt16LE(0), writeUInt16LE(0), writeUInt32LE(0), writeUInt32LE(offset), nameBuffer
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBuffer.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    writeUInt32LE(0x06054b50), writeUInt16LE(0), writeUInt16LE(0), writeUInt16LE(entries.length), writeUInt16LE(entries.length),
    writeUInt32LE(central.length), writeUInt32LE(offset), writeUInt16LE(0)
  ]);
  return Buffer.concat([...localParts, central, end]);
}

function paragraph(text, style = ''){
  const escaped = xmlEscape(text);
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}

function markdownToWordXml(markdown){
  const lines = String(markdown || '').split(/\r?\n/);
  const body = [];
  for(const raw of lines){
    const line = raw.trimEnd();
    if(!line.trim()) { body.push('<w:p/>'); continue; }
    if(line.startsWith('### ')) body.push(paragraph(line.slice(4), 'Heading3'));
    else if(line.startsWith('## ')) body.push(paragraph(line.slice(3), 'Heading2'));
    else if(line.startsWith('# ')) body.push(paragraph(line.slice(2), 'Heading1'));
    else if(line.startsWith('- ')) body.push(paragraph(`• ${line.slice(2)}`));
    else body.push(paragraph(line));
  }
  return body.join('');
}

export function createDocxBuffer({ title = 'SovereignDocs Document', markdown = '', metadata = {} } = {}){
  const now = new Date().toISOString();
  const metaLines = [
    `Template ID: ${metadata.templateId || 'unknown'}`,
    `Template version: ${metadata.templateVersion || 'unknown'}`,
    `Risk level: ${metadata.riskLevel || 'unknown'}`,
    `Export class: ${metadata.exportClass || 'unknown'}`,
    `Audit ID: ${metadata.auditId || 'not-recorded'}`,
    `Audit hash: ${metadata.auditHash || 'not-recorded'}`,
    'SovereignDocs is not a law firm and does not provide legal advice.',
    'This output is not attorney-reviewed unless a separate attorney-review record is proven.'
  ];
  const boundaryBlock = `# ${title}\n\nDRAFT / SELF-HELP DOCUMENT AUTOMATION OUTPUT\n\n${metaLines.join('\n')}\n\n---\n\n`;
  const documentBody = markdownToWordXml(`${boundaryBlock}${markdown}`);
  const footerText = `SovereignDocs self-help document automation only • Not legal advice • Audit ${metadata.auditId || 'not-recorded'}`;
  const headerText = `${title} • ${metadata.exportClass || 'draft'} • ${metadata.riskLevel || 'unknown'} risk`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${documentBody}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/><w:footerReference w:type="default" r:id="rIdFooter1"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${paragraph(headerText)}</w:hdr>`;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${paragraph(footerText)}</w:ftr>`;
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>SovereignDocs</dc:creator><cp:keywords>self-help document automation;not legal advice;${xmlEscape(metadata.exportClass || '')};${xmlEscape(metadata.riskLevel || '')}</cp:keywords><cp:lastModifiedBy>SovereignDocs</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  const customXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="SovereignDocsTemplateId"><vt:lpwstr>${xmlEscape(metadata.templateId || '')}</vt:lpwstr></property><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="SovereignDocsAuditId"><vt:lpwstr>${xmlEscape(metadata.auditId || '')}</vt:lpwstr></property><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="4" name="NotLegalAdvice"><vt:bool>true</vt:bool></property><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="5" name="AttorneyReviewed"><vt:bool>false</vt:bool></property></Properties>`;
  return createZip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>` },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>` },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/header1.xml', data: headerXml },
    { name: 'word/footer1.xml', data: footerXml },
    { name: 'docProps/core.xml', data: coreXml },
    { name: 'docProps/custom.xml', data: customXml }
  ]);
}
