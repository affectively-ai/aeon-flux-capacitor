/**
 * <Capacitor> — The Intelligent Container
 *
 * THE CHASSIS. Every engine we built plugs into this.
 *
 * A Capacitor wraps a document and makes it alive:
 *   - DualIndex (Amygdala + Hippocampus) indexes every block
 *   - ContentKnapsack solves the layout for the container
 *   - Projection surface renders the result (text, audio, spatial, reading)
 *   - ESI personalizes the layout per reader at the edge
 *   - Voice interface enables voice-first interaction
 *   - DocumentMetabolism tracks content freshness
 *   - KnowledgeFabric surfaces relevant corpus content
 *
 * Usage:
 *
 *   const cap = new Capacitor({
 *     document: doc,
 *     container: element,
 *     projection: 'text',
 *     esi: { enabled: true, baseUrl: 'https://edge.affectively.ai' },
 *   });
 *
 *   cap.mount();   // indexes, solves, renders
 *   cap.resize();  // re-solves knapsack for new container
 *   cap.personalize(readerContext); // ESI-personalized layout
 *   cap.project('audio'); // switch projection surface
 *   cap.unmount(); // cleanup
 *
 * The container self-organizes. The piece arranges itself to fit.
 */

import type {
    ContentItem,
    ContentValue,
    ContentWeight,
    ContainerConstraints,
    LayoutResult,
    PersonalizationContext,
    ESIKnapsackConfig,
    ESIValueOverride,
    LayoutManifest,
    RenderMode,
} from '../layout/ContentKnapsack';
import { ContentKnapsack } from '../layout/ContentKnapsack';

import type {
    AmygdalaEntry,
    HippocampusEntry,
    RenderSample,
    InterpolatedSample,
} from '../core/DualIndex';
import { DualIndex } from '../core/DualIndex';

// ── Types ───────────────────────────────────────────────────────────

export type ProjectionType = 'text' | 'audio' | 'spatial' | 'reading';

export interface CapacitorConfig {
    /** The container element (for measuring capacity) */
    readonly container: {
        offsetWidth: number;
        offsetHeight: number;
    };
    /** Active projection surface */
    readonly projection?: ProjectionType;
    /** ESI configuration for personalization */
    readonly esi?: ESIKnapsackConfig;
    /** DualIndex configuration */
    readonly dualIndex?: {
        /** Amygdala/Hippocampus blend ratio (0 = all context, 1 = all emotion) */
        blendRatio?: number;
    };
    /** ContentKnapsack value weights */
    readonly valueWeights?: {
        emotion: number;
        relevance: number;
        freshness: number;
        engagement: number;
    };
    /** Whether to auto-re-solve on block changes */
    readonly autoSolve?: boolean;
    /** Debounce interval for auto-solve (ms) */
    readonly solveDebounceMs?: number;
    /** Whether structural blocks (headings) must always be visible */
    readonly preserveStructure?: boolean;
    /** Minimum blocks to always show */
    readonly minBlocks?: number;
    /** Maximum cognitive load budget */
    readonly maxCognitiveLoad?: number;
    /** Transition animation duration (ms) */
    readonly transitionMs?: number;
    /** Inference function for intelligence modules */
    readonly inferFn?: (prompt: string) => Promise<string>;
    /** Embedding function */
    readonly embedFn?: (text: string) => Promise<number[]>;
}

/** A block registered with the Capacitor */
export interface CapacitorBlock {
    readonly id: string;
    readonly text: string;
    readonly type: 'heading' | 'paragraph' | 'code' | 'image' | 'list' | 'blockquote' | 'table';
    readonly structural?: boolean;
    /** Estimated render height (if known) */
    readonly heightPx?: number;
}

/** Lifecycle events emitted by the Capacitor */
export type CapacitorEvent =
    | { type: 'mounted' }
    | { type: 'layout-solved'; result: LayoutResult }
    | { type: 'projection-changed'; from: ProjectionType; to: ProjectionType }
    | { type: 'personalized'; readerDid: string }
    | { type: 'block-indexed'; blockId: string }
    | { type: 'esi-resolved'; overrides: ESIValueOverride[] }
    | { type: 'unmounted' };

/** The full state of a mounted Capacitor */
export interface CapacitorState {
    /** Whether the Capacitor is mounted */
    readonly mounted: boolean;
    /** Active projection surface */
    readonly projection: ProjectionType;
    /** Last layout result */
    readonly layout: LayoutResult | null;
    /** Whether layout is personalized */
    readonly personalized: boolean;
    /** Reader DID if personalized */
    readonly readerDid?: string;
    /** Number of indexed blocks */
    readonly blockCount: number;
    /** Container dimensions */
    readonly containerWidth: number;
    readonly containerHeight: number;
}

// ── Capacitor ───────────────────────────────────────────────────────

export class Capacitor {
    private config: CapacitorConfig;
    private knapsack: ContentKnapsack;
    private dualIndex: DualIndex;
    private projection: ProjectionType;
    private blocks: Map<string, CapacitorBlock> = new Map();
    private listeners: Set<(event: CapacitorEvent) => void> = new Set();
    private mounted = false;
    private solveTimer: ReturnType<typeof setTimeout> | null = null;
    private resizeObserver: { disconnect: () => void } | null = null;

    constructor(config: CapacitorConfig) {
        this.config = config;
        this.projection = config.projection ?? 'text';

        // Initialize the knapsack
        this.knapsack = new ContentKnapsack({
            valueWeights: config.valueWeights,
            animateTransitions: true,
            transitionMs: config.transitionMs ?? 300,
            esi: config.esi,
        });

        // Initialize the dual index
        this.dualIndex = new DualIndex({
            blendRatio: config.dualIndex?.blendRatio ?? 0.5,
        });

        // Wire knapsack layout changes to event emission
        this.knapsack.onChange((result) => {
            this.emit({ type: 'layout-solved', result });
        });
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    /**
     * Mount the Capacitor. Indexes all blocks and solves the initial layout.
     */
    mount(): void {
        if (this.mounted) return;
        this.mounted = true;

        // Initial solve
        this.solve();

        // Watch container for resize
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => this.debounceSolve());
            observer.observe(this.config.container as unknown as Element);
            this.resizeObserver = observer;
        }

        this.emit({ type: 'mounted' });
    }

    /**
     * Unmount the Capacitor. Cleans up observers and timers.
     */
    unmount(): void {
        if (!this.mounted) return;
        this.mounted = false;

        if (this.solveTimer) {
            clearTimeout(this.solveTimer);
            this.solveTimer = null;
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.emit({ type: 'unmounted' });
    }

    // ── Block Registration ────────────────────────────────────────

    /**
     * Register a block with the Capacitor.
     * The block is indexed in both DualIndex indexes and registered with the knapsack.
     */
    async addBlock(block: CapacitorBlock): Promise<void> {
        this.blocks.set(block.id, block);

        // Index in DualIndex (Amygdala: fast emotional tags)
        const amygdala: AmygdalaEntry = {
            blockId: block.id,
            sentiment: 0,      // populated by inference
            valence: 0,
            arousal: 0,
            dominance: 0,
            somaticMarkers: [],
            timestamp: Date.now(),
        };

        // Index in DualIndex (Hippocampus: rich context)
        const hippocampus: HippocampusEntry = {
            blockId: block.id,
            embedding: [],      // populated by embedFn
            entities: [],
            relationships: [],
            crossDocLinks: [],
            temporalMeta: { created: Date.now(), lastModified: Date.now() },
            claims: [],
        };

        // Run inference for emotional tagging if available
        if (this.config.inferFn && block.text.length > 0) {
            try {
                const emotionResult = await this.config.inferFn(
                    `Rate the emotional intensity of this text on a 0-1 scale for valence, arousal, dominance. ` +
                    `Return JSON: {"valence":0.5,"arousal":0.3,"dominance":0.4,"sentiment":0.6}\n\n"${block.text.slice(0, 500)}"`,
                );
                try {
                    const parsed = JSON.parse(emotionResult);
                    amygdala.valence = parsed.valence ?? 0;
                    amygdala.arousal = parsed.arousal ?? 0;
                    amygdala.dominance = parsed.dominance ?? 0;
                    amygdala.sentiment = parsed.sentiment ?? 0;
                } catch { /* use defaults */ }
            } catch { /* inference failed, use defaults */ }
        }

        // Run embedding if available
        if (this.config.embedFn && block.text.length > 0) {
            try {
                hippocampus.embedding = await this.config.embedFn(block.text);
            } catch { /* embedding failed, use empty */ }
        }

        this.dualIndex.index(amygdala, hippocampus);

        // Sample both indexes for knapsack value
        const sample = this.dualIndex.sample(block.id);

        // Estimate height
        const estimatedHeight = block.heightPx ?? this.estimateHeight(block);
        const compressedHeight = Math.round(estimatedHeight * 0.3);

        // Register with knapsack
        const item: ContentItem = {
            blockId: block.id,
            fullText: block.text,
            summary: block.text.slice(0, 120) + (block.text.length > 120 ? '…' : ''),
            blockType: block.type,
            structural: block.structural ?? (block.type === 'heading'),
        };

        const value: Omit<ContentValue, 'compositeValue'> = {
            blockId: block.id,
            emotionalIntensity: sample ? sample.emotionalBlend : amygdala.arousal,
            contextualRelevance: sample ? sample.contextualBlend : 0.5,
            freshness: 1.0, // brand new
            readerEngagement: 0.5, // neutral until reader data arrives
        };

        const weight: Omit<ContentWeight, 'compositeWeight' | 'minWeight'> = {
            blockId: block.id,
            fullHeightPx: estimatedHeight,
            compressedHeightPx: compressedHeight,
            readingTimeSec: this.estimateReadingTime(block.text),
            cognitiveLoad: this.estimateCognitiveLoad(block),
        };

        this.knapsack.registerItem(item, value, weight);
        this.emit({ type: 'block-indexed', blockId: block.id });

        // Auto-solve if configured
        if (this.config.autoSolve !== false && this.mounted) {
            this.debounceSolve();
        }
    }

    /**
     * Register multiple blocks at once.
     */
    async addBlocks(blocks: CapacitorBlock[]): Promise<void> {
        for (const block of blocks) {
            await this.addBlock(block);
        }
    }

    /**
     * Update a block's value signals (e.g., reader engagement changed).
     */
    updateBlockValue(blockId: string, partial: {
        emotionalIntensity?: number;
        contextualRelevance?: number;
        freshness?: number;
        readerEngagement?: number;
    }): void {
        this.knapsack.updateValue(blockId, partial);

        if (this.config.autoSolve !== false && this.mounted) {
            this.debounceSolve();
        }
    }

    // ── Layout ────────────────────────────────────────────────────

    /**
     * Solve the knapsack for the current container.
     */
    solve(): LayoutResult {
        const constraints = this.getConstraints();
        return this.knapsack.solve(constraints);
    }

    /**
     * Solve with personalization for a specific reader.
     */
    personalize(context: PersonalizationContext): LayoutResult {
        const constraints = this.getConstraints();
        const result = this.knapsack.personalizedSolve(constraints, context);
        this.emit({ type: 'personalized', readerDid: context.readerDid });
        return result;
    }

    /**
     * Apply ESI-resolved value overrides from the edge.
     */
    applyESIOverrides(overrides: ESIValueOverride[]): void {
        this.knapsack.applyESIOverrides(overrides);
        this.emit({ type: 'esi-resolved', overrides });

        if (this.mounted) {
            this.solve();
        }
    }

    /**
     * Force a specific render mode on a block (user override).
     */
    forceRenderMode(blockId: string, mode: RenderMode): void {
        this.knapsack.applyESIOverrides([{
            blockId,
            forceRenderMode: mode,
        }]);

        if (this.mounted) {
            this.solve();
        }
    }

    /**
     * Resize handler — re-solves for new container dimensions.
     */
    resize(): void {
        if (this.mounted) {
            this.solve();
        }
    }

    // ── Projection ────────────────────────────────────────────────

    /**
     * Switch the active projection surface.
     */
    project(projection: ProjectionType): void {
        const from = this.projection;
        this.projection = projection;
        this.emit({ type: 'projection-changed', from, to: projection });

        // Re-solve because different projections may have different weight semantics
        if (this.mounted) {
            this.solve();
        }
    }

    /**
     * Get the active projection.
     */
    getProjection(): ProjectionType {
        return this.projection;
    }

    // ── DualIndex Access ──────────────────────────────────────────

    /**
     * Sample both indexes for a specific block.
     */
    sampleBlock(blockId: string): RenderSample | null {
        return this.dualIndex.sample(blockId);
    }

    /**
     * Interpolate both indexes for a range of blocks.
     */
    interpolateBlocks(blockIds: string[]): InterpolatedSample[] {
        return this.dualIndex.interpolate(blockIds);
    }

    /**
     * Get the raw DualIndex for direct access.
     */
    getDualIndex(): DualIndex {
        return this.dualIndex;
    }

    /**
     * Get the raw ContentKnapsack for direct access.
     */
    getKnapsack(): ContentKnapsack {
        return this.knapsack;
    }

    // ── ESI ───────────────────────────────────────────────────────

    /**
     * Generate ESI include tags for embedding in server-rendered HTML.
     */
    generateESITags(documentId: string): string[] {
        return this.knapsack.generateESITags(documentId);
    }

    /**
     * Generate a complete layout manifest for SSR.
     */
    generateManifest(documentId: string): LayoutManifest {
        return this.knapsack.generateLayoutManifest(documentId);
    }

    // ── State ─────────────────────────────────────────────────────

    /**
     * Get the current state of the Capacitor.
     */
    getState(): CapacitorState {
        const lastLayout = this.knapsack.getLastResult();
        return {
            mounted: this.mounted,
            projection: this.projection,
            layout: lastLayout,
            personalized: lastLayout?.personalized ?? false,
            readerDid: lastLayout?.readerDid,
            blockCount: this.blocks.size,
            containerWidth: this.config.container.offsetWidth,
            containerHeight: this.config.container.offsetHeight,
        };
    }

    // ── Events ────────────────────────────────────────────────────

    /**
     * Listen for Capacitor lifecycle and layout events.
     */
    on(listener: (event: CapacitorEvent) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // ── Private ───────────────────────────────────────────────────

    private getConstraints(): ContainerConstraints {
        return {
            heightPx: this.config.container.offsetHeight,
            widthPx: this.config.container.offsetWidth,
            maxCognitiveLoad: this.config.maxCognitiveLoad,
            minBlocks: this.config.minBlocks,
            preserveStructure: this.config.preserveStructure ?? true,
        };
    }

    private debounceSolve(): void {
        if (this.solveTimer) clearTimeout(this.solveTimer);
        const delay = this.config.solveDebounceMs ?? 150;
        this.solveTimer = setTimeout(() => {
            if (this.mounted) this.solve();
        }, delay);
    }

    private estimateHeight(block: CapacitorBlock): number {
        // Rough estimation based on content length and type
        const baseLineHeight = 24;
        const charsPerLine = 80;
        const lines = Math.ceil(block.text.length / charsPerLine);

        switch (block.type) {
            case 'heading': return baseLineHeight * 2;
            case 'code': return Math.max(baseLineHeight * 3, lines * 20);
            case 'image': return 300; // placeholder
            case 'table': return Math.max(100, lines * baseLineHeight);
            default: return Math.max(baseLineHeight, lines * baseLineHeight);
        }
    }

    private estimateReadingTime(text: string): number {
        const wordsPerMinute = 200;
        const words = text.split(/\s+/).length;
        return (words / wordsPerMinute) * 60;
    }

    private estimateCognitiveLoad(block: CapacitorBlock): number {
        // Heuristic: code and tables are harder to parse
        const typeLoad: Record<string, number> = {
            heading: 0.1,
            paragraph: 0.3,
            list: 0.25,
            blockquote: 0.35,
            code: 0.8,
            table: 0.7,
            image: 0.15,
        };

        const base = typeLoad[block.type] ?? 0.3;

        // Longer content = more cognitive load
        const lengthFactor = Math.min(1.0, block.text.length / 2000);

        return Math.min(1.0, base + lengthFactor * 0.3);
    }

    private emit(event: CapacitorEvent): void {
        for (const listener of this.listeners) listener(event);
    }
}
