# @affectively/capacitor

**The Embedding Editor** — where text is a derivative of the vector space.

An embedding-first collaborative WYSIWYG editor. Every block is a vector embedding first, with text as the human-readable projection. Entities, classifications, positional encodings, and semantic relationships are all first-party primitives. CRDT-based, mobile-first, with AI native throughout.

## Core Principles

- **Embedding-first**: The document's primary representation is a vector space. Text is a projection.
- **Voice = Tone**: Embed content → train voice model → generate in-voice. Writing style is a fingerprint in embedding space.
- **Horizon UI**: Single surface, infinite depth. Everything is latent, ready to summon, instant when called. Cmd+K for Spotlight-style omnisearch.
- **Code as first-class citizen**: When embeddings project as code, the editor adapts — line numbers, symbol detection, and inference-based "imagined execution" that predicts outputs inline.
- **Agents write in embeddings**: Language-agnostic. Any language, made-up languages, binary. The embedding understands meaning, not syntax.
- **Better than git**: CRDT-native revision management with rollback, rollforward, branching, merge (conflict-free), cherry-pick, time-travel, and blame.
- **Perfect typography**: Source Serif for body, Inter for UI, JetBrains Mono for code. OpenType ligatures, old-style numerals, smart quotes, hanging punctuation.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  EditorRoot (React)                                 │
│  ┌──────────┬──────────┬──────────┬───────────┐     │
│  │   Edit   │ Markdown │ Preview  │  Spatial  │     │
│  └──────────┴──────────┴──────────┴───────────┘     │
│  ┌─────────────────────────────────────────────┐    │
│  │  CommandPalette (Cmd+K)                     │    │
│  │  Search blocks, entities, tools, revisions  │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │  BlockRenderer → WordActionMenu             │    │
│  │  ContentEditable + Entity overlays          │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  AeonDocument (Yjs XmlFragment — CRDT surface)      │
│  ↕ bidirectional sync                               │
│  EmbeddingDocument (vector space)                   │
│  ┌──────────┬──────────┬──────────┬───────────┐     │
│  │Pipeline  │ Semantic │  Entity  │   Voice   │     │
│  │(embed,   │  Graph   │  Layer   │  Engine   │     │
│  │ NER,     │(cluster, │(registry,│(train,    │     │
│  │ classify)│ edges)   │ PII)     │ score)    │     │
│  └──────────┴──────────┴──────────┴───────────┘     │
├─────────────────────────────────────────────────────┤
│  CodeRuntime │ ESI Registry │ RevisionManager       │
│  (imagined   │ (inference   │ (rollback, branch,    │
│   execution) │  tags)       │  merge, blame)        │
├─────────────────────────────────────────────────────┤
│  XPath Engine (per-node UCAN permissions)           │
└─────────────────────────────────────────────────────┘
```

## Modules

| Module | Entry | Purpose |
|--------|-------|---------|
| `core/` | `EmbeddingDocument`, `EmbeddingPipeline`, `SemanticGraph`, `EntityLayer` | The embedding space |
| `document/` | `AeonDocument`, `XPathEngine`, `MarkdownIO` | CRDT surface & addressing |
| `revisions/` | `RevisionManager` | Better-than-git revision system |
| `editor/` | `EditorRoot`, `BlockRenderer`, `WordActionMenu`, `CommandPalette` | React editor UI |
| `code/` | `CodeRuntime` | Inference-based imagined execution |
| `esi/` | `ESIRegistry` | On-demand inference tags |
| `voice/` | `VoiceEngine` | Embed → train voice → generate in-voice |
| `ui/` | `tokens`, `editor.css` | Horizon UI design system |

## Quick Start

```typescript
import {
  EmbeddingDocument,
  AeonDocument,
  EmbeddingPipeline,
  VoiceEngine,
  EditorRoot,
} from '@affectively/capacitor';
```

## License

MIT
