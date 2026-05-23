import crypto from 'node:crypto';
import { assertConfiguredProvider, isProduction } from './config.mjs';

export async function createExternalSigningEnvelope({ title, signers=[], documentKey=null, metadata={} }){
  if(!title) throw Object.assign(new Error('Envelope title is required.'), { status:400 });
  if(!Array.isArray(signers) || !signers.length) throw Object.assign(new Error('At least one signer is required.'), { status:400 });
  if(process.env.DROPBOX_SIGN_API_KEY){
    return { ok:false, provider:'dropbox-sign-configured-needs-live-mapping', message:'Dropbox Sign key is present. Map document files and signer fields before enabling live sends.', envelopeId:null };
  }
  if(process.env.DOCUSIGN_INTEGRATION_KEY){
    return { ok:false, provider:'docusign-configured-needs-live-mapping', message:'DocuSign env is present. Map OAuth, templates, and signer tabs before enabling live sends.', envelopeId:null };
  }
  if(isProduction()) assertConfiguredProvider(['DROPBOX_SIGN_API_KEY or DOCUSIGN_INTEGRATION_KEY'], 'External e-sign');
  return { ok:true, provider:'signature-packet-dev', envelopeId:crypto.randomUUID(), status:'draft_signature_packet_created', title, signers, documentKey, metadata, message:'Development signature packet only. Not an external e-sign send.' };
}
