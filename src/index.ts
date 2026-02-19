/**
 * @affectively/capacitor — Top-level barrel export
 *
 * The Embedding Editor: where text is a derivative of the vector space.
 */

// Embedding Core
export * from './core';

// Document Model & CRDT Surface
export * from './document';

// Revisions
export * from './revisions';

// Editor UI
export * from './editor';

// ESI
export { ESIRegistry, type ESITagDefinition, type ESIInvocation, type ESIConfig } from './esi/ESIRegistry';

// Voice Engine
export { VoiceEngine, type VoiceModel, type VoiceFeatures, type VoiceTrainingConfig } from './voice/VoiceEngine';

// Design Tokens
export * as tokens from './ui/tokens';

// Code Runtime
export { CodeRuntime, type CodeSymbol, type ImaginedResult, type CodeBlockMeta, type CodeAction } from './code/CodeRuntime';

// DevMode
export { DevModeController, DevModeIndicator, useDevMode, type DevModeConfig, type SaveResult, type PageDataObject } from './devmode/DevMode';

// Projections
export { AudioProjection, type AudioProjectionConfig, type BlockVoicing, type MusicalScale } from './projections/AudioProjection';
export { SpatialProjection, type SpatialProjectionConfig, type SpatialNode, type SpatialEdge, type NodeShape } from './projections/SpatialProjection';
export { ReadingProjection, type ReadingConfig, type ReadingMetrics, type Footnote, type TableOfContentsEntry, type ReadingEvent } from './projections/ReadingProjection';

// Collaboration
export { CollaborationPresence, type Collaborator, type CursorPosition, type CollaboratorActivity, type PresenceConfig } from './collaboration/CollaborationPresence';
export { CommentManager, type InlineComment, type SuggestedEdit, type CommentState, type CommentThreadConfig } from './collaboration/InlineComments';

// Publishing
export { PublishingPipeline, type PublishRecord, type PublishState, type PublishProjection, type SEOMetadata, type SocialCards } from './publishing/PublishingPipeline';

// Intelligence
export { SemanticBacklinks, type Backlink, type BacklinkType, type BacklinkConfig } from './intelligence/SemanticBacklinks';
export { DocumentSearch, type SearchResult, type SearchConfig, type SearchScope } from './intelligence/DocumentSearch';

// Provenance
export { ContentProvenance, type ProvenanceRecord, type ProvenanceChain, type ProvenanceConfig } from './provenance/ContentProvenance';

// Analytics
export { ReadingAnalytics, type ReadingSession, type DocumentAnalytics, type BlockEngagement } from './analytics/ReadingAnalytics';
