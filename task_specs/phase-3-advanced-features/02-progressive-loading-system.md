# Task 3.2: Implement Progressive Loading System

## Overview
Create a progressive loading system that loads large exercise graphs in prioritized chunks, maintaining UI responsiveness while providing immediate value to users through staged content delivery.

## Context
Large exercise catalogs (1000+ exercises) can take 10+ seconds to load and render, creating poor user experience. This task implements a progressive loading strategy that shows core content immediately and enhances progressively.

## Technical Requirements

### Core Progressive Loading Interface
```typescript
interface LoadingPriority {
  priority: 1 | 2 | 3 | 4 | 5
  estimatedLoadTime: number
  userValue: 'immediate' | 'high' | 'medium' | 'low' | 'background'
}

interface LoadingChunk {
  id: string
  priority: LoadingPriority
  exercises: string[]
  dependencies: string[]
  loadingStrategy: 'eager' | 'lazy' | 'on-demand'
}

interface ProgressiveLoadingPlan {
  chunks: LoadingChunk[]
  totalExercises: number
  estimatedTotalTime: number
  coreContentTime: number
}

interface LoadingState {
  phase: 'initializing' | 'core' | 'enhancing' | 'complete' | 'error'
  loadedChunks: Set<string>
  pendingChunks: Set<string>
  progress: number // 0-1
  estimatedTimeRemaining: number
}
```

### Implementation Location
- **File**: `/lib/progressive-loader.ts`
- **Integration**: Used by visualization component for large graph loading

### Core Progressive Loader
```typescript
class ProgressiveLoader {
  private loadingState: LoadingState
  private loadingPlan: ProgressiveLoadingPlan | null = null
  private abortController: AbortController | null = null
  
  constructor(
    private graphManager: OptimizedGraphManager,
    private onProgress: (state: LoadingState) => void
  ) {
    this.loadingState = this.initializeLoadingState()
  }
  
  async loadGraph(
    graphData: ExerciseGraph,
    config: GraphVisualizationConfig
  ): Promise<void> {
    this.abortController = new AbortController()
    
    try {
      // Analyze graph and create loading plan
      this.loadingPlan = this.createLoadingPlan(graphData, config)
      
      // Phase 1: Load core content immediately
      await this.loadCoreContent()
      
      // Phase 2: Progressive enhancement
      await this.loadSecondaryContent()
      
      // Phase 3: Background loading of remaining content
      this.loadBackgroundContent()
      
    } catch (error) {
      this.handleLoadingError(error)
    }
  }
  
  private createLoadingPlan(
    graph: ExerciseGraph,
    config: GraphVisualizationConfig
  ): ProgressiveLoadingPlan {
    const chunks: LoadingChunk[] = []
    
    // Priority 1: Entry points and highly connected nodes
    chunks.push(this.createCoreChunk(graph, config))
    
    // Priority 2: Subgraph landmarks and equipment-focused content
    chunks.push(...this.createSecondaryChunks(graph, config))
    
    // Priority 3: Remaining visible content
    chunks.push(...this.createTertiaryChunks(graph, config))
    
    // Priority 4: Background/preload content
    chunks.push(...this.createBackgroundChunks(graph, config))
    
    return {
      chunks,
      totalExercises: graph.exercises.size,
      estimatedTotalTime: this.estimateLoadingTime(chunks),
      coreContentTime: chunks[0].priority.estimatedLoadTime
    }
  }
  
  private createCoreChunk(
    graph: ExerciseGraph,
    config: GraphVisualizationConfig
  ): LoadingChunk {
    const coreNodes = new Set<string>()
    
    // Add all entry points
    for (const subgraph of Object.values(graph.subgraphs)) {
      subgraph.entryPoints.forEach(ep => coreNodes.add(ep))
    }
    
    // Add highly connected nodes (hubs)
    const nodeConnections = this.calculateNodeConnections(graph)
    const topConnected = Array.from(nodeConnections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(50, Math.floor(graph.exercises.size * 0.1)))
      .map(([nodeId]) => nodeId)
    
    topConnected.forEach(nodeId => coreNodes.add(nodeId))
    
    // Add nodes matching current filters
    if (config.equipmentFilter?.length) {
      this.addFilteredNodes(graph, config, coreNodes, 20)
    }
    
    return {
      id: 'core',
      priority: {
        priority: 1,
        estimatedLoadTime: Math.min(500, coreNodes.size * 2),
        userValue: 'immediate'
      },
      exercises: Array.from(coreNodes),
      dependencies: [],
      loadingStrategy: 'eager'
    }
  }
}
```

## Progressive Loading Strategies

### 1. Intelligent Prioritization
```typescript
private prioritizeContent(
  graph: ExerciseGraph,
  config: GraphVisualizationConfig
): Map<string, LoadingPriority> {
  const priorities = new Map<string, LoadingPriority>()
  
  for (const [exerciseId, exercise] of graph.exercises) {
    let priority = 5 // Default lowest priority
    let userValue: LoadingPriority['userValue'] = 'background'
    
    // Entry points get highest priority
    if (this.isEntryPoint(exerciseId, graph)) {
      priority = 1
      userValue = 'immediate'
    }
    
    // Equipment filter matches
    else if (this.matchesEquipmentFilter(exercise, config.equipmentFilter)) {
      priority = 2
      userValue = 'high'
    }
    
    // Subgraph focus matches
    else if (this.matchesSubgraphFocus(exerciseId, config.focusSubgraph)) {
      priority = 2
      userValue = 'high'
    }
    
    // High connectivity (graph hubs)
    else if (this.isHighlyConnected(exerciseId, graph)) {
      priority = 3
      userValue = 'medium'
    }
    
    // Within depth limit
    else if (this.withinDepthLimit(exerciseId, config.maxDepth)) {
      priority = 4
      userValue = 'low'
    }
    
    priorities.set(exerciseId, {
      priority: priority as LoadingPriority['priority'],
      estimatedLoadTime: this.estimateExerciseLoadTime(exercise),
      userValue
    })
  }
  
  return priorities
}
```

### 2. Chunked Loading with Dependencies
```typescript
private async loadChunk(chunk: LoadingChunk): Promise<void> {
  // Ensure dependencies are loaded first
  for (const depId of chunk.dependencies) {
    if (!this.loadingState.loadedChunks.has(depId)) {
      await this.loadChunkById(depId)
    }
  }
  
  // Load exercises in smaller sub-chunks for responsiveness
  const subChunkSize = 25
  const subChunks = this.createSubChunks(chunk.exercises, subChunkSize)
  
  for (const subChunk of subChunks) {
    await this.loadExerciseBatch(subChunk)
    
    // Yield to main thread between sub-chunks
    await this.yieldToMainThread()
    
    // Check for abort signal
    if (this.abortController?.signal.aborted) {
      throw new Error('Loading aborted')
    }
    
    // Update progress
    this.updateProgress()
  }
  
  this.loadingState.loadedChunks.add(chunk.id)
}

private async yieldToMainThread(): Promise<void> {
  return new Promise(resolve => {
    if ('scheduler' in window && 'postTask' in window.scheduler) {
      // Use scheduler API if available
      window.scheduler.postTask(resolve, { priority: 'user-blocking' })
    } else {
      // Fallback to setTimeout
      setTimeout(resolve, 0)
    }
  })
}
```

### 3. Virtual Scrolling for Large Lists
```typescript
interface VirtualScrollConfig {
  containerHeight: number
  itemHeight: number
  overscan: number
  totalItems: number
}

class VirtualScroller {
  private startIndex: number = 0
  private endIndex: number = 0
  
  constructor(private config: VirtualScrollConfig) {
    this.calculateVisibleRange()
  }
  
  calculateVisibleRange(): { start: number, end: number } {
    const { containerHeight, itemHeight, overscan } = this.config
    
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    this.startIndex = Math.max(0, Math.floor(this.scrollTop / itemHeight) - overscan)
    this.endIndex = Math.min(
      this.config.totalItems - 1,
      this.startIndex + visibleCount + overscan * 2
    )
    
    return { start: this.startIndex, end: this.endIndex }
  }
  
  getVisibleItems(): string[] {
    const { start, end } = this.calculateVisibleRange()
    return this.allItems.slice(start, end + 1)
  }
}
```

## Performance Requirements
- **Core Content Load**: <500ms for entry points and key nodes
- **Progressive Enhancement**: <2s for 80% of visible content
- **Memory Usage**: Linear scaling, avoid loading invisible content
- **UI Responsiveness**: Maintain 60fps during loading

## Implementation Steps
1. Create `ProgressiveLoader` class with chunking strategy
2. Implement content prioritization algorithm
3. Add dependency-aware chunk loading
4. Create virtual scrolling for large lists
5. Implement loading state management
6. Add abort/cancel functionality
7. Create progress reporting system
8. Add error handling and recovery

## Acceptance Criteria

### ✅ Loading Performance
- [ ] Core content loads in <500ms for any graph size
- [ ] 80% of visible content loads in <2s
- [ ] UI remains responsive (60fps) during all loading phases
- [ ] Memory usage grows linearly with loaded content only
- [ ] Background loading doesn't impact foreground performance

### ✅ User Experience
- [ ] Users see meaningful content immediately
- [ ] Loading progress clearly communicated
- [ ] No blocking UI states during enhancement phases
- [ ] Graceful degradation when loading fails
- [ ] Cancel/abort functionality works correctly

### ✅ Content Prioritization
- [ ] Entry points and filtered content load first
- [ ] Loading order matches user intent and filters
- [ ] Dependencies load before dependent content
- [ ] High-value content prioritized over completeness
- [ ] Background content loads without blocking

### ✅ Scalability
- [ ] Handles 1000+ exercise graphs efficiently
- [ ] Loading time scales sub-linearly with graph size
- [ ] Memory usage bounded by visible content
- [ ] Network requests optimized and batched
- [ ] Works across different connection speeds

## Testing Strategy

### Unit Tests
```typescript
describe('ProgressiveLoader', () => {
  test('should prioritize content correctly', () => {
    const loader = new ProgressiveLoader(graphManager, onProgress)
    const plan = loader.createLoadingPlan(largeGraph, config)
    
    // Core chunk should contain entry points
    const coreChunk = plan.chunks.find(c => c.id === 'core')
    expect(coreChunk).toBeDefined()
    expect(coreChunk.priority.priority).toBe(1)
    expect(coreChunk.exercises.length).toBeGreaterThan(0)
    
    // Should include entry points
    const entryPoints = getEntryPoints(largeGraph)
    expect(entryPoints.every(ep => coreChunk.exercises.includes(ep))).toBe(true)
  })
  
  test('should load core content within performance budget', async () => {
    const start = performance.now()
    await loader.loadCoreContent()
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(500)
    expect(loader.loadingState.phase).toBe('core')
  })
  
  test('should maintain UI responsiveness during loading', async () => {
    let frameDrops = 0
    const targetFrameTime = 16.67 // 60fps
    
    const measureFrames = () => {
      let lastFrame = performance.now()
      
      const checkFrame = () => {
        const now = performance.now()
        const frameTime = now - lastFrame
        
        if (frameTime > targetFrameTime * 2) { // Allow some tolerance
          frameDrops++
        }
        
        lastFrame = now
        requestAnimationFrame(checkFrame)
      }
      
      requestAnimationFrame(checkFrame)
    }
    
    measureFrames()
    await loader.loadGraph(largeGraph, config)
    
    expect(frameDrops).toBeLessThan(5) // Allow minimal frame drops
  })
})
```

### Performance Tests
```typescript
describe('Progressive Loading Performance', () => {
  test('should scale sub-linearly with graph size', async () => {
    const sizes = [100, 250, 500, 1000]
    const loadTimes = []
    
    for (const size of sizes) {
      const testGraph = generateGraph(size)
      const start = performance.now()
      await loader.loadGraph(testGraph, config)
      const loadTime = performance.now() - start
      loadTimes.push(loadTime)
    }
    
    // Should not scale linearly (worse than O(n))
    const scaleFactor = loadTimes[3] / loadTimes[0] // 1000 vs 100
    expect(scaleFactor).toBeLessThan(50) // Much better than 10x linear scaling
  })
  
  test('should demonstrate significant improvement for large graphs', async () => {
    const largeGraph = generateGraph(1000)
    
    // Time traditional full loading
    const fullStart = performance.now()
    await traditionalLoader.loadGraph(largeGraph, config)
    const fullTime = performance.now() - fullStart
    
    // Time progressive loading to core content
    const progressiveStart = performance.now()
    await progressiveLoader.loadCoreContent(largeGraph, config)
    const coreTime = performance.now() - progressiveStart
    
    expect(coreTime * 10).toBeLessThan(fullTime) // At least 10x improvement to usable state
  })
})
```

### Integration Tests
- Test with various graph sizes and configurations
- Verify memory usage patterns
- Cross-browser compatibility testing

## Dependencies
- **Blocked by**: Phase 1 completion (OptimizedGraphManager for efficient data access)
- **Blocks**: None (enhancement feature)
- **Related**: Virtual scrolling libraries, Web Workers for background loading

## Deliverables
1. `/lib/progressive-loader.ts` - Core progressive loading implementation
2. `/lib/virtual-scroller.ts` - Virtual scrolling for large lists
3. `/lib/types/progressive-loading.ts` - Loading type definitions
4. `/tests/progressive-loader.test.ts` - Comprehensive test suite
5. Progressive loading performance analysis
6. Loading strategy documentation and tuning guide

## Risk Mitigation
- **Memory Growth**: Bounded loading with cleanup strategies
- **Network Failures**: Retry logic and graceful degradation
- **Loading Complexity**: Simple fallback to traditional loading
- **User Experience**: Clear progress communication and cancel options

## Success Metrics
- **Time to Usable**: <500ms for any graph size
- **Complete Loading**: Sub-linear scaling with graph size
- **Memory Efficiency**: Only load visible/relevant content
- **Responsiveness**: Maintain 60fps during all loading phases