# SOL Staffing Local Brain

## What it is
A local-first browser assistant for the staffing agency site.

## Current implementation
- `brain.html` provides the UI.
- `brain/brain-corpus.json` stores the knowledge.
- `brain/brain.js` runs the assistant.
- `brain/brain-config.json` describes mode and future hooks.
- `brain/brain-fallback.js` provides fallback corpus if fetch fails.
- Browser localStorage stores optional local memory.

## What it can do
- Answer common staffing questions.
- Route users to the correct page or form.
- Provide employer, candidate, AE, and government intake checklists.
- Provide safe-claim reminders.
- Save local notes in the user's browser.

## What it cannot do yet
- It is not a true LLM.
- It cannot securely store private data.
- It cannot verify live registrations or certifications.
- It cannot inspect uploads.
- It cannot access CRM/ATS records.

## Upgrade path
1. Keep local brain as fallback.
2. Add Netlify Function, Cloudflare Worker, or API route.
3. Connect to GPU/Ollama/vLLM endpoint.
4. Add vector search over the site files.
5. Add authenticated database memory.
6. Add role-based tools for AE, recruiter, owner, and gov pursuit workflows.
