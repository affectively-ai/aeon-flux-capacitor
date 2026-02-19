/**
 * ContentKnapsack — Let the piece organize itself to the container
 *
 * THE KNAPSACK FOR INFORMATION.
 *
 * The viewport is a container with finite capacity.
 * Each block has a VALUE (emotional intensity × contextual relevance ×
 * freshness) and a WEIGHT (pixels, reading time, cognitive load).
 *
 * The layout engine solves: maximize information value given available space.
 *
 * What this means:
 *   - Stale blocks COMPRESS (low value/weight → collapse to summary)
 *   - High-resonance blocks EXPAND (readers care → more real estate)
 *   - Fresh, dense, relevant content wins prime positioning
 *   - Same document renders differently on mobile vs desktop
 *     (not just reflow — different information priority)
 *   - Reading behavior feeds back into value (highlight → value ↑, skip → value ↓)
 *   - As the reader scrolls, the knapsack re-solves for current viewport
 *
 * This is NOT responsive design. This is INFORMATION ECONOMICS.
 */

// ── Types ───────────────────────────────────────────────────────────

export interface ContentItem {
    /** Block ID */
    readonly blockId: string;
    /** Full content text */
    readonly fullText: string;
    /** Compressed summary (for collapsed rendering) */
    readonly summary: string;
    /** Block type */
    readonly blockType: 'heading' | 'paragraph' | 'code' | 'image' | 'list' | 'blockquote' | 'table';
    /** Whether this block is structurally required (headings, etc.) */
    readonly structural: boolean;
}

export interface ContentValue {
    /** Block ID */
    readonly blockId: string;
    /** Emotional intensity (from Amygdala) */
    readonly emotionalIntensity: number;
    /** Contextual relevance to viewport focus (from Hippocampus) */
    readonly contextualRelevance: number;
    /** Content freshness (from DocumentMetabolism) */
    readonly freshness: number;
    /** Reader engagement signal (from ReaderWriterSymbiosis) */
    readonly readerEngagement: number;
    /** Computed composite value */
    readonly compositeValue: number;
}

export interface ContentWeight {
    /** Block ID */
    readonly blockId: string;
    /** Full render height in pixels */
    readonly fullHeightPx: number;
    /** Compressed render height in pixels */
    readonly compressedHeightPx: number;
    /** Estimated reading time in seconds */
    readonly readingTimeSec: number;
    /** Cognitive load (0-1, from complexity/density) */
    readonly cognitiveLoad: number;
    /** Computed composite weight (in container units) */
    readonly compositeWeight: number;
    /** Minimum weight (even when maximally compressed) */
    readonly minWeight: number;
}

export interface LayoutDecision {
    /** Block ID */
    readonly blockId: string;
    /** Rendering mode for this block */
    readonly renderMode: RenderMode;
    /** Allocated height in pixels */
    readonly allocatedHeight: number;
    /** Position (0-based ordering) */
    readonly position: number;
    /** Value-to-weight ratio (higher = better real estate utilization) */
    readonly efficiency: number;
    /** Whether this block was included in the knapsack solution */
    readonly included: boolean;
}

export type RenderMode =
    | 'full'            // show everything — this block earned its space
    | 'comfortable'     // full content, generous spacing
    | 'compact'         // full content, tighter spacing
    | 'compressed'      // show summary, expandable
    | 'collapsed'       // single-line indicator, expandable
    | 'hidden';         // not rendered (below viewport, or zero value)

export interface ContainerConstraints {
    /** Available height in pixels */
    readonly heightPx: number;
    /** Available width in pixels */
    readonly widthPx: number;
    /** Maximum cognitive load budget (0-1) per viewport */
    readonly maxCognitiveLoad?: number;
    /** Minimum number of blocks to always show */
    readonly minBlocks?: number;
    /** Whether structural blocks (headings) must always be included */
    readonly preserveStructure?: boolean;
}

export interface KnapsackConfig {
    /** Value calculation weights */
    readonly valueWeights?: {
        emotion: number;
        relevance: number;
        freshness: number;
        engagement: number;
    };
    /** Compression thresholds */
    readonly compressionThresholds?: {
        /** Below this value ratio, compress */
        compressBelow: number;
        /** Below this value ratio, collapse */
        collapseBelow: number;
        /** Below this value ratio, hide */
        hideBelow: number;
    };
    /** Animate transitions between layout states */
    readonly animateTransitions?: boolean;
    /** Transition duration in ms */
    readonly transitionMs?: number;
}

export interface LayoutResult {
    /** Ordered layout decisions for each block */
    readonly decisions: LayoutDecision[];
    /** Total value packed into the container */
    readonly totalValue: number;
    /** Container utilization (0-1) */
    readonly utilization: number;
    /** Total cognitive load in viewport */
    readonly cognitiveLoad: number;
    /** Blocks that didn't fit */
    readonly overflow: string[];
    /** Solution metadata */
    readonly meta: {
        solveTimeMs: number;
        algorithm: 'dp' | 'greedy' | 'fractional';
        containerCapacity: number;
        itemCount: number;
    };
}

// ── Content Knapsack Engine ─────────────────────────────────────────

export class ContentKnapsack {
    private config: Required<KnapsackConfig>;
    private items: Map<string, ContentItem> = new Map();
    private values: Map<string, ContentValue> = new Map();
    private weights: Map<string, ContentWeight> = new Map();
    private lastResult: LayoutResult | null = null;
    private listeners: Set<(result: LayoutResult) => void> = new Set();

    constructor(config?: KnapsackConfig) {
        this.config = {
            valueWeights: config?.valueWeights ?? {
                emotion: 0.25,
                relevance: 0.35,
                freshness: 0.2,
                engagement: 0.2,
            },
            compressionThresholds: config?.compressionThresholds ?? {
                compressBelow: 0.4,
                collapseBelow: 0.2,
                hideBelow: 0.05,
            },
            animateTransitions: config?.animateTransitions ?? true,
            transitionMs: config?.transitionMs ?? 300,
        };
    }

    // ── Registration ──────────────────────────────────────────────

    /**
     * Register a content item with its value and weight signals.
     */
    registerItem(
        item: ContentItem,
        value: Omit<ContentValue, 'compositeValue'>,
        weight: Omit<ContentWeight, 'compositeWeight' | 'minWeight'>,
    ): void {
        this.items.set(item.blockId, item);

        // Compute composite value
        const w = this.config.valueWeights;
        const compositeValue =
            value.emotionalIntensity * w.emotion +
            value.contextualRelevance * w.relevance +
            value.freshness * w.freshness +
            value.readerEngagement * w.engagement;

        this.values.set(item.blockId, { ...value, compositeValue });

        // Compute composite weight (normalize to container-relative units)
        const compositeWeight = weight.fullHeightPx;
        const minWeight = weight.compressedHeightPx * 0.3; // even collapsed takes some space

        this.weights.set(item.blockId, { ...weight, compositeWeight, minWeight });
    }

    /**
     * Update value signals for a block (e.g., reader engagement changed).
     */
    updateValue(blockId: string, partial: Partial<Omit<ContentValue, 'compositeValue' | 'blockId'>>): void {
        const existing = this.values.get(blockId);
        if (!existing) return;

        const updated = { ...existing, ...partial };
        const w = this.config.valueWeights;
        const compositeValue =
            updated.emotionalIntensity * w.emotion +
            updated.contextualRelevance * w.relevance +
            updated.freshness * w.freshness +
            updated.readerEngagement * w.engagement;

        this.values.set(blockId, { ...updated, compositeValue });
    }

    // ── Solve ─────────────────────────────────────────────────────

    /**
     * Solve the knapsack: given container constraints, determine rendering.
     */
    solve(constraints: ContainerConstraints): LayoutResult {
        const start = performance.now();

        const blockIds = Array.from(this.items.keys());
        const capacity = constraints.heightPx;

        // Separate structural (always included) from optional
        const structural: string[] = [];
        const optional: string[] = [];

        for (const id of blockIds) {
            const item = this.items.get(id)!;
            if (constraints.preserveStructure !== false && item.structural) {
                structural.push(id);
            } else {
                optional.push(id);
            }
        }

        // Reserve space for structural blocks
        let reservedHeight = 0;
        for (const id of structural) {
            const weight = this.weights.get(id);
            if (weight) {
                reservedHeight += weight.compressedHeightPx; // structural gets at least compressed size
            }
        }

        const availableForOptional = Math.max(0, capacity - reservedHeight);

        // Solve 0/1 knapsack for optional blocks
        // Use fractional approach for smooth rendering (blocks can be partially compressed)
        const solution = optional.length > 100
            ? this.greedySolve(optional, availableForOptional)
            : this.fractionalSolve(optional, availableForOptional);

        // Build layout decisions
        const decisions: LayoutDecision[] = [];
        let totalValue = 0;
        let totalHeight = 0;
        let totalCognitiveLoad = 0;
        const overflow: string[] = [];
        let position = 0;

        // Add structural blocks first
        for (const id of structural) {
            const value = this.values.get(id);
            const weight = this.weights.get(id);
            if (!value || !weight) continue;

            const allocatedHeight = this.determineHeight(id, value.compositeValue, weight, capacity);
            const renderMode = this.determineRenderMode(value.compositeValue, allocatedHeight, weight);

            decisions.push({
                blockId: id,
                renderMode,
                allocatedHeight,
                position: position++,
                efficiency: value.compositeValue / Math.max(1, allocatedHeight),
                included: true,
            });

            totalValue += value.compositeValue;
            totalHeight += allocatedHeight;
            totalCognitiveLoad += weight.cognitiveLoad * (allocatedHeight / weight.fullHeightPx);
        }

        // Add solved optional blocks
        for (const [id, fraction] of solution) {
            const value = this.values.get(id);
            const weight = this.weights.get(id);
            if (!value || !weight) continue;

            if (fraction <= 0) {
                overflow.push(id);
                decisions.push({
                    blockId: id,
                    renderMode: 'hidden',
                    allocatedHeight: 0,
                    position: position++,
                    efficiency: 0,
                    included: false,
                });
                continue;
            }

            const allocatedHeight = weight.compressedHeightPx +
                (weight.fullHeightPx - weight.compressedHeightPx) * fraction;
            const renderMode = this.fractionToRenderMode(fraction);

            decisions.push({
                blockId: id,
                renderMode,
                allocatedHeight: Math.round(allocatedHeight),
                position: position++,
                efficiency: (value.compositeValue * fraction) / Math.max(1, allocatedHeight),
                included: true,
            });

            totalValue += value.compositeValue * fraction;
            totalHeight += allocatedHeight;
            totalCognitiveLoad += weight.cognitiveLoad * fraction;
        }

        // Enforce minimum blocks
        if (constraints.minBlocks && decisions.filter((d) => d.included).length < constraints.minBlocks) {
            // Promote hidden blocks with highest value until minBlocks met
            const hidden = decisions
                .filter((d) => !d.included)
                .sort((a, b) => {
                    const va = this.values.get(a.blockId)?.compositeValue ?? 0;
                    const vb = this.values.get(b.blockId)?.compositeValue ?? 0;
                    return vb - va;
                });

            let included = decisions.filter((d) => d.included).length;
            for (const decision of hidden) {
                if (included >= constraints.minBlocks) break;
                decision.renderMode = 'collapsed' as RenderMode;
                (decision as { included: boolean }).included = true;
                (decision as { allocatedHeight: number }).allocatedHeight =
                    this.weights.get(decision.blockId)?.minWeight ?? 24;
                included++;
            }
        }

        // Enforce cognitive load budget
        if (constraints.maxCognitiveLoad && totalCognitiveLoad > constraints.maxCognitiveLoad) {
            // Compress the least-valuable blocks until under budget
            const byValue = [...decisions]
                .filter((d) => d.included && !this.items.get(d.blockId)?.structural)
                .sort((a, b) => {
                    const va = this.values.get(a.blockId)?.compositeValue ?? 0;
                    const vb = this.values.get(b.blockId)?.compositeValue ?? 0;
                    return va - vb; // lowest value first
                });

            for (const decision of byValue) {
                if (totalCognitiveLoad <= (constraints.maxCognitiveLoad ?? 1)) break;
                const weight = this.weights.get(decision.blockId);
                if (!weight) continue;

                const savings = weight.cognitiveLoad * 0.5;
                totalCognitiveLoad -= savings;
                (decision as { renderMode: RenderMode }).renderMode = 'compressed';
            }
        }

        const elapsed = performance.now() - start;

        const result: LayoutResult = {
            decisions: decisions.sort((a, b) => a.position - b.position),
            totalValue,
            utilization: totalHeight / Math.max(1, capacity),
            cognitiveLoad: totalCognitiveLoad,
            overflow,
            meta: {
                solveTimeMs: elapsed,
                algorithm: optional.length > 100 ? 'greedy' : 'fractional',
                containerCapacity: capacity,
                itemCount: blockIds.length,
            },
        };

        this.lastResult = result;
        this.notify(result);
        return result;
    }

    /**
     * Re-solve for current constraints (for viewport changes, scroll, etc.)
     */
    getLastResult(): LayoutResult | null {
        return this.lastResult;
    }

    /**
     * Listen for layout changes.
     */
    onChange(listener: (result: LayoutResult) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // ── Solvers ───────────────────────────────────────────────────

    /**
     * Fractional knapsack: items can be partially included.
     * Perfect for content that can render at different compression levels.
     */
    private fractionalSolve(
        blockIds: string[],
        capacity: number,
    ): Map<string, number> {
        // Compute value-to-weight ratio for ranking
        const ranked = blockIds.map((id) => {
            const value = this.values.get(id)?.compositeValue ?? 0;
            const weight = this.weights.get(id)?.fullHeightPx ?? 1;
            return { id, value, weight, ratio: value / Math.max(1, weight) };
        }).sort((a, b) => b.ratio - a.ratio);

        const result = new Map<string, number>();
        let remaining = capacity;

        for (const { id, weight } of ranked) {
            if (remaining <= 0) {
                result.set(id, 0);
                continue;
            }

            if (weight <= remaining) {
                result.set(id, 1); // fully included
                remaining -= weight;
            } else {
                // Fractional inclusion
                const fraction = remaining / weight;
                result.set(id, fraction);
                remaining = 0;
            }
        }

        return result;
    }

    /**
     * Greedy solver for large block counts (O(n log n)).
     */
    private greedySolve(
        blockIds: string[],
        capacity: number,
    ): Map<string, number> {
        // Same as fractional for greedy — fractional is already O(n log n)
        return this.fractionalSolve(blockIds, capacity);
    }

    // ── Helpers ───────────────────────────────────────────────────

    private determineHeight(
        _blockId: string,
        value: number,
        weight: ContentWeight,
        _capacity: number,
    ): number {
        if (value > 0.8) return weight.fullHeightPx * 1.1; // generous spacing for premium content
        if (value > 0.5) return weight.fullHeightPx;
        if (value > 0.3) return weight.compressedHeightPx;
        return weight.minWeight;
    }

    private determineRenderMode(
        value: number,
        allocatedHeight: number,
        weight: ContentWeight,
    ): RenderMode {
        const ratio = allocatedHeight / weight.fullHeightPx;

        if (value > 0.8 && ratio >= 1) return 'comfortable';
        if (ratio >= 0.9) return 'full';
        if (ratio >= 0.6) return 'compact';
        if (ratio >= 0.3) return 'compressed';
        if (ratio > 0) return 'collapsed';
        return 'hidden';
    }

    private fractionToRenderMode(fraction: number): RenderMode {
        if (fraction >= 0.95) return 'comfortable';
        if (fraction >= 0.8) return 'full';
        if (fraction >= 0.5) return 'compact';
        if (fraction >= 0.2) return 'compressed';
        if (fraction > 0) return 'collapsed';
        return 'hidden';
    }

    private notify(result: LayoutResult): void {
        for (const listener of this.listeners) listener(result);
    }
}
