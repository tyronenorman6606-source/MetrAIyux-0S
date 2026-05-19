import { mkdir, writeFile } from 'node:fs/promises';
import { executeLocalWorkflow } from '../packages/providers/dist/index.js';

const workflow = {
  workflowId: 'smoke-workflow-dryrun',
  input: { email: 'client@example.com', name: 'Client' },
  steps: [
    {
      id: 'draft',
      capability: 'ai.generate_text',
      input: { prompt: 'Write a one sentence welcome note for {{input.name}}.' }
    },
    {
      id: 'send',
      capability: 'email.send',
      input: {
        to: '{{input.email}}',
        subject: 'Welcome from SkyeAPI',
        body: '{{steps.draft.data.text}}'
      }
    }
  ]
};

const result = await executeLocalWorkflow(workflow, {}, { dryRun: true });
if (!result.ok) throw new Error(`Workflow dry run failed: ${JSON.stringify(result)}`);
if (result.capability !== 'workflow.run') throw new Error('Expected workflow.run capability result.');
if (result.data.stepCount !== 2) throw new Error(`Expected 2 workflow steps, got ${result.data.stepCount}`);
if (!result.data.steps.every((step) => step.dryRun === true)) throw new Error('Expected every workflow step to be dry-run marked.');
const serialized = JSON.stringify(result);
if (serialized.includes('RESEND_API_KEY') || serialized.includes('OPENAI_API_KEY')) throw new Error('Workflow proof leaked provider key names unexpectedly.');

await mkdir('.proof', { recursive: true });
await writeFile('.proof/workflow-smoke-result.json', JSON.stringify({ ok: true, result, secrets_exposed: false }, null, 2));
console.log(JSON.stringify({ ok: true, proof: '.proof/workflow-smoke-result.json', workflow: result.data.workflowId }, null, 2));
