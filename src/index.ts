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
