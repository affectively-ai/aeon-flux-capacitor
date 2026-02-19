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
- **Publishing is a projection**: Text, audio, 3D space, email, PDF — each is a projection surface of the same embedding space.
- **Content provenance**: Every block is UCAN-signed. Cryptographic chain of custody. AI contribution tracked per block.
- **Reading is the other half**: Medium-quality reading experience with focus mode, Tufte sidenotes, progressive disclosure, engagement analytics.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  EditorRoot (React)                                     │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │   Edit   │ Markdown │  Read    │  Spatial │ Audio  │ │
│  └──────────┴──────────┴──────────┴──────────┴────────┘ │
│  ┌───────────────────────────────────────────────────┐  │
│  │  CommandPalette (Cmd+K)  │  GhostSuggest (Tab)    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  BlockRenderer → WordActionMenu                   │  │
│  │  ContentEditable + Entity overlays + Comments     │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  CollaborationPresence (multiplayer cursors)      │  │
│  │  InlineComments (threaded · suggested edits)      │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  AeonDocument (Yjs XmlFragment — CRDT surface)          │
│  ↕ bidirectional sync                                   │
│  EmbeddingDocument (vector space)                       │
│  ┌──────────┬──────────┬──────────┬───────────┐         │
│  │Pipeline  │ Semantic │  Entity  │   Voice   │         │
│  │(embed,   │  Graph   │  Layer   │  Engine   │         │
│  │ NER,     │(cluster, │(registry,│(train,    │         │
│  │ classify)│ edges)   │ PII)     │ score)    │         │
│  └──────────┴──────────┴──────────┴───────────┘         │
├─────────────────────────────────────────────────────────┤
│  Projections                                            │
│  ┌─────────┬──────────┬──────────┬──────────┐           │
│  │  Text   │  Audio   │  Spatial │ Reading  │           │
│  │(default)│(Web Audio│(Three.js)│(Tufte,   │           │
│  │         │ synth)   │          │ focus)   │           │
│  └─────────┴──────────┴──────────┴──────────┘           │
├─────────────────────────────────────────────────────────┤
│  Intelligence                                           │
│  ┌──────────────────┬────────────────────────┐          │
│  │SemanticBacklinks  │DocumentSearch          │          │
│  │(auto wiki-links)  │(semantic + fuzzy)      │          │
│  └──────────────────┴────────────────────────┘          │
├─────────────────────────────────────────────────────────┤
│  Publishing · Provenance · Analytics                    │
│  ┌──────────┬──────────┬──────────────────┐             │
│  │Pipeline  │Content   │Reading           │             │
│  │(draft→   │Provenance│Analytics         │             │
│  │ publish) │(UCAN sig)│(engagement heat) │             │
│  └──────────┴──────────┴──────────────────┘             │
├─────────────────────────────────────────────────────────┤
│  CodeRuntime │ ESI Registry │ RevisionManager           │
│  DevMode     │ XPath Engine │ UCAN Permissions          │
└─────────────────────────────────────────────────────────┘
```

## Modules

| Module | Entry | Purpose |
|--------|-------|---------||
| `core/` | `EmbeddingDocument`, `EmbeddingPipeline`, `SemanticGraph`, `EntityLayer` | The embedding space |
| `document/` | `AeonDocument`, `XPathEngine`, `MarkdownIO` | CRDT surface & addressing |
| `revisions/` | `RevisionManager` | Better-than-git revision system |
| `editor/` | `EditorRoot`, `BlockRenderer`, `WordActionMenu`, `CommandPalette`, `GhostSuggest` | React editor UI |
| `code/` | `CodeRuntime` | Inference-based imagined execution |
| `esi/` | `ESIRegistry` | On-demand inference tags |
| `voice/` | `VoiceEngine` | Embed → train voice → generate in-voice |
| `projections/` | `AudioProjection`, `SpatialProjection`, `ReadingProjection` | Embedding projection surfaces |
| `collaboration/` | `CollaborationPresence`, `CommentManager` | Multiplayer cursors, comments, suggested edits |
| `publishing/` | `PublishingPipeline` | Draft→review→publish, SEO, social cards, multi-format export |
| `intelligence/` | `SemanticBacklinks`, `DocumentSearch` | Auto wiki-links, semantic + text search |
| `provenance/` | `ContentProvenance` | UCAN-signed authorship attestation, AI contribution tracking |
| `analytics/` | `ReadingAnalytics` | Privacy-preserving engagement tracking |
| `devmode/` | `DevModeController` | Page-as-editor (filesystem-free) |
| `ui/` | `tokens`, `editor.css` | Horizon UI design system |

## Quick Start

```typescript
import {
  // Core
  EmbeddingDocument, AeonDocument, EmbeddingPipeline,
  // Editor
  EditorRoot, CommandPalette, GhostSuggest,
  // Projections
  AudioProjection, SpatialProjection, ReadingProjection,
  // Collaboration
  CollaborationPresence, CommentManager,
  // Intelligence
  SemanticBacklinks, DocumentSearch,
  // Publishing
  PublishingPipeline,
  // Provenance
  ContentProvenance,
  // Analytics
  ReadingAnalytics,
} from '@affectively/capacitor';
```

## License

MIT
