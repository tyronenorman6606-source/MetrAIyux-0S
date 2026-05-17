# Research Extraction Layer

This section is not vendor code. It is architecture extraction.

Purpose:

- study upstream systems,
- identify extractable patterns,
- mark what not to copy,
- convert the best patterns into CitadelDB-native modules.

Rules:

1. Do not paste upstream source code unless license review is complete.
2. Do not vendor giant upstream repos into the control plane.
3. Keep upstream systems behind engine/provider boundaries.
4. Make every borrowed pattern explicit.
5. Preserve a do-not-copy ledger.
