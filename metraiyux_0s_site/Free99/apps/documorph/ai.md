# DocuMorph — SKYESOVERLONDON

DocuMorph is an offline‑first Progressive Web App (PWA) that converts PDF documents into a structured study dashboard:
a reader view with detected sections, flashcard-style recall nodes, quiz checks, and simple analytics.

## What this app does
- Extracts text from uploaded PDFs in the browser
- Detects headings/sections and builds a clean reading surface
- Generates a short summary, flashcards, and quiz questions using SKYESOVERLONDON AI engines:
  - **SKYESOVERLONDON • SkyesFlash** (Gemini-backed)
  - **SKYESOVERLONDON • SkyesCrown** (OpenAI-backed)
- Saves results locally on-device by default (IndexedDB), with optional Neon Postgres cloud sync

## Key pages
- Landing: `/`
- App: `/app/`
- Privacy: `/privacy`
- Terms: `/terms`

## Data handling (high level)
- Default storage is local on-device.
- AI synthesis sends extracted text (or a portion) to the selected provider.
- Server Mode is supported to keep API keys off the client.
- Neon Cloud mode is optional for multi-device persistence.

## Intended audiences
Students, certification prep, internal training/onboarding, SOP/compliance learning, technical documentation study.

_Last updated: 2026-05-10_
