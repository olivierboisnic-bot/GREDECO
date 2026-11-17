# Project memory

## Product intent & audience

- French-language quoting/estimation software ("logiciel de devis"), referred to as "outil d'ardech".
- Target users manage a price/service list and generate quotes (devis) for clients.
- Core features: service/prestation catalog with prices and VAT (TVA), quote creation, quote history, Excel price-list import.

## Brand personality & voice

- Communicates in French; UI and assistant responses are French.
- Tone: clear, direct, safety-conscious around data.

## Visual design & UX direction

- Built with Vite + React, JSX, Tailwind CSS, Lucide React icons.
- Follow `.bolt/prompt` for global UI constraints (beautiful, production-worthy, no extra UI/icon packages unless necessary).

## Decisions, constraints & rationale

- Quote data model: quotes snapshot their own name, price, and TVA per line, rather than linking live to the catalog.
  - Rationale: editing an existing prestation's price should not alter historical quotes.
- Current Excel import is destructive: after confirmation it deletes existing prestations, quote lines, and quotes.
  - Identified as dangerous; needs replacement with non-destructive update mode.
- Deleting a prestation individually cascades into historical quote lines (also destructive).
- Proposed safe patterns:
  - Add "Archiver" action: prestation hidden from new-quote selection but retained in historical quotes.
  - Replace import with "Mettre à jour les prix sans supprimer l'historique" mode.

## Open questions & assumptions

- Assumption: archiving should keep old quote lines intact even if the catalog entry is no longer active.
- Unresolved: exact import semantics for matching existing prestations (by name/id?) during non-destructive price update.
- Unresolved: whether archived prestations should remain visible in an archive view vs fully hidden.
- Unresolved: whether individual prestation deletion should also become non-destructive (archive) or keep cascade behavior with stronger confirmation.