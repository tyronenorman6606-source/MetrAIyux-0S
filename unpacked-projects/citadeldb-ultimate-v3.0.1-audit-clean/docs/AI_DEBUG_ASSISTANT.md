# AI Debug Assistant

CitadelDB v1.2 includes a dashboard AI Debug Assistant.

## Purpose

The assistant helps debug:

- app database connection issues
- DATABASE_URL confusion
- migration issues
- backup/restore issues
- readiness failures
- job queue failures
- dashboard/operator errors

## Providers

Supported:

- OpenAI through `OPENAI_API_KEY`
- Gemini through `GEMINI_API_KEY` or `GOOGLE_API_KEY`

Gemini docs support `GEMINI_API_KEY` / `GOOGLE_API_KEY`, and note that `GOOGLE_API_KEY` takes precedence if both are set. Gemini REST requests use `x-goog-api-key`. OpenAI API keys are managed through the OpenAI Platform API keys area. See the official docs cited in the chat response. 

## Required env

```env
AI_ASSISTANT_ENABLED=true

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

You can use either provider or both.

## Security rule

The browser never receives the API keys.

The dashboard sends the question to the CitadelDB Gateway. The Gateway calls OpenAI/Gemini server-side.

## Redaction

The gateway redacts common secrets before building AI context:

- `DATABASE_URL` passwords
- `POSTGRES_PASSWORD`
- `GATEWAY_ADMIN_TOKEN`
- `BACKUP_ENCRYPTION_PASSWORD`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- bearer tokens

## Honest boundary

The AI assistant can help debug. It should not be treated as proof that the database works. Proof still requires receipts.
