# Task 2.3: Implement Style Update Optimization

## Overview
Create a specialized style update system that separates styling operations from data changes, enabling instant color scheme and visual updates without data reprocessing.

## Context
Current implementation recalculates node data when only visual styling changes (color schemes, highlighting). This task creates style-only update paths that modify CSS classes and properties without touching underlying graph data.

## Technical Requirements

### Core Style Management Interface
```typescript
interface StyleUpdate {
  elementId: string
  addClasses: string[]
  removeClasses: string[]
  dataChanges: Partial<CytoscapeNodeData>
  priority: 'immediate' | 'batch' | 'background'
}

interface StyleScheme {
  id: string
  nodeClassMap: Map<string, string[]>
  edgeClassMap: Map<string, string[]>
  dynamicRules: StyleRule[]
}

interface StyleRule {
  condition: (element: any) => boolean
  classes: string[]
  data?: Record<string, any>
}

interface StyleCache {
  schemes: Map<string, StyleScheme>
  appliedScheme: string | null
  elementStyles: Map<string, string[]>
}
```

### Implementation Location
- **File**: `/lib/style-update-manager.ts`
- **Integration**: Used by IncrementalUpdater for style-only changes

### Core Style Manager
```typescript
class StyleUpdateManager {
  private cy: cytoscape.Core
  private cache: StyleCache
  private batchManager: CytoscapeBatchManager
  
  constructor(cy: cytoscape.Core, batchManager: CytoscapeBatchManager) {
    this.cy = cy
    this.cache = this.initializeCache()
    this.batchManager = batchManager
  }
  
  updateColorScheme(
    scheme: 'difficulty' | 'equipment' | 'subgraph' | 'movement',
    config: GraphVisualizationConfig
  ): void {
    const styleScheme = this.buildStyleScheme(scheme, config)
    this.applyStyleScheme(styleScheme)
  }
  
  updateHighlighting(
    selectedNodes: Set<string>,
    connectedNodes: Set<string>
  ): void {
    const updates: StyleUpdate[] = []
    
    // Clear previous highlighting
    this.clearHighlighting(updates)
    
    // Apply new highlighting
    this.applySelectionHighlighting(selectedNodes, updates)
    this.applyConnectionHighlighting(connectedNodes, updates)
    
    this.batchStyleUpdates(updates)
  }
  
  private buildStyleScheme(
    scheme: string,
    config: GraphVisualizationConfig
  ): StyleScheme {
    const nodeClassMap = new Map<string, string[]>()
    const edgeClassMap = new Map<string, string[]>()
    
    for (const [nodeId, nodeData] of this.getVisibleNodes()) {
      const classes = this.calculateNodeClasses(nodeData, scheme, config)
      nodeClassMap.set(nodeId, classes)
    }
    
    for (const [edgeId, edgeData] of this.getVisibleEdges()) {
      const classes = this.calculateEdgeClasses(edgeData, scheme, config)
      edgeClassMap.set(edgeId, classes)
    }
    
    return {
      id: `${scheme}-${Date.now()}`,
      nodeClassMap,
      edgeClassMap,
      dynamicRules: this.buildDynamicRules(scheme, config)
    }
  }
}
```

## Style Optimization Strategies

### 1. Precomputed Style Schemes
```typescript
private precomputeStyleSchemes(config: GraphVisualizationConfig): void {
  const schemes = ['difficulty', 'equipment', 'subgraph', 'movement']
  
  for (const scheme of schemes) {
    const styleScheme = this.buildStyleScheme(scheme, config)
    this.cache.schemes.set(scheme, styleScheme)
  }
}

updateColorScheme(scheme: string): void {
  const cachedScheme = this.cache.schemes.get(scheme)
  
  if (cachedScheme) {
    this.applyStyleScheme(cachedScheme) // <10ms operation
  } else {
    this.buildAndApplyStyleScheme(scheme) // Fallback
  }
}
```

### 2. Differential Style Updates
```typescript
private calculateStyleDiff(
  oldScheme: StyleScheme,
  newScheme: StyleScheme
): StyleUpdate[] {
  const updates: StyleUpdate[] = []
  
  // Find nodes with class changes
  for (const [nodeId, newClasses] of newScheme.nodeClassMap) {
    const oldClasses = oldScheme.nodeClassMap.get(nodeId) || []
    
    if (!this.arraysEqual(oldClasses, newClasses)) {
      updates.push({
        elementId: nodeId,
        addClasses: newClasses.filter(c => !oldClasses.includes(c)),
        removeClasses: oldClasses.filter(c => !newClasses.includes(c)),
        dataChanges: {},
        priority: 'batch'
      })
    }
  }
  
  return updates
}
```

### 3. CSS Class Optimization
```typescript
private optimizeClassManagement(updates: StyleUpdate[]): void {
  // Group class changes by element for single DOM operation
  const elementUpdates = new Map<string, {add: Set<string>, remove: Set<string>}>()
  
  for (const update of updates) {
    if (!elementUpdates.has(update.elementId)) {
      elementUpdates.set(update.elementId, {add: new Set(), remove: new Set()})
    }
    
    const element = elementUpdates.get(update.elementId)!
    update.addClasses.forEach(c => element.add.add(c))
    update.removeClasses.forEach(c => element.remove.add(c))
  }
  
  // Apply consolidated changes
  for (const [elementId, changes] of elementUpdates) {
    const element = this.cy.getElementById(elementId)
    
    // Remove old classes first
    element.removeClass([...changes.remove])
    
    // Add new classes
    element.addClass([...changes.add])
  }
}
```

## Performance Requirements
- **Color Scheme Switch**: <10ms for any graph size
- **Selection Highlighting**: <5ms for up to 100 selected nodes
- **Style Cache Size**: <5MB for all precomputed schemes
- **Class Operations**: <1ms per element styling

## Implementation Steps
1. Create `StyleUpdateManager` class with caching system
2. Implement style scheme precomputation
3. Add differential style update calculation
4. Create optimized class management
5. Integrate with batch operations manager
6. Add style validation and fallback
7. Implement style cache management
8. Add performance monitoring and metrics

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] Color scheme changes apply instantly without data recalculation
- [ ] Selection highlighting updates in real-time
- [ ] Style schemes cache correctly for reuse
- [ ] Differential updates only change modified elements
- [ ] All visual styles maintain consistency

### ✅ Performance Requirements
- [ ] Color scheme switch <10ms (measured with `performance.now()`)
- [ ] Selection highlighting <5ms for 100 nodes
- [ ] Style cache uses <5MB memory
- [ ] Class operations <1ms per element
- [ ] 95% reduction vs full style recalculation

### ✅ Style Accuracy
- [ ] Style output identical to full recalculation
- [ ] No visual artifacts during style transitions
- [ ] Correct class application and removal
- [ ] Consistent styling across all browsers
- [ ] Handles missing elements gracefully

### ✅ Cache Management
- [ ] Style schemes cache efficiently
- [ ] Cache invalidation works correctly
- [ ] Memory usage remains bounded
- [ ] Cache hits provide significant speedup
- [ ] Handles cache misses gracefully

## Testing Strategy

### Unit Tests
```typescript
describe('StyleUpdateManager', () => {
  test('should switch color schemes without data recalculation', () => {
    const manager = new StyleUpdateManager(cy, batchManager)
    
    // Mock data access to verify it's not called
    const dataAccessSpy = jest.spyOn(manager, 'getNodeData')
    
    manager.updateColorScheme('difficulty', config)
    
    // Should not access node data, only apply cached styles
    expect(dataAccessSpy).not.toHaveBeenCalled()
    
    // Verify correct classes applied
    const testNode = cy.getElementById('test-node')
    expect(testNode.hasClass('difficulty-beginner')).toBe(true)
  })
  
  test('should complete style updates within performance budget', () => {
    const start = performance.now()
    manager.updateColorScheme('equipment', config)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(10)
  })
  
  test('should calculate minimal style diffs', () => {
    const oldScheme = manager.buildStyleScheme('difficulty', config)
    const newScheme = manager.buildStyleScheme('equipment', config)
    
    const diff = manager.calculateStyleDiff(oldScheme, newScheme)
    
    // Should only include nodes with actual class changes
    expect(diff.length).toBeLessThan(totalNodes)
    expect(diff.every(update => 
      update.addClasses.length > 0 || update.removeClasses.length > 0
    )).toBe(true)
  })
})
```

### Performance Tests
```typescript
describe('Style Performance', () => {
  test('should demonstrate significant speedup over full recalculation', () => {
    // Time full style recalculation
    const fullStart = performance.now()
    manager.recalculateAllStyles('difficulty', config)
    const fullTime = performance.now() - fullStart
    
    // Time optimized style update
    const optimizedStart = performance.now()
    manager.updateColorScheme('difficulty', config)
    const optimizedTime = performance.now() - optimizedStart
    
    expect(optimizedTime * 20).toBeLessThan(fullTime) // At least 20x improvement
  })
  
  test('should handle rapid style changes efficiently', () => {
    const schemes = ['difficulty', 'equipment', 'subgraph', 'movement']
    
    const start = performance.now()
    for (let i = 0; i < 10; i++) {
      const scheme = schemes[i % schemes.length]
      manager.updateColorScheme(scheme, config)
    }
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(100) // 10 style changes in <100ms
  })
})
```

### Integration Tests
- Test with all color scheme combinations
- Verify integration with batch operations
- Memory usage profiling with style caching

## Dependencies
- **Blocked by**: Task 2.2 (CytoscapeBatchManager for efficient updates)
- **Blocks**: None (optimization task)
- **Related**: Current style calculation in visualization component

## Deliverables
1. `/lib/style-update-manager.ts` - Core style management
2. `/lib/types/style-updates.ts` - Style type definitions
3. `/tests/style-update-manager.test.ts` - Comprehensive test suite
4. Style performance benchmark report
5. CSS class optimization documentation

## Risk Mitigation
- **Style Consistency**: Comprehensive validation against full recalculation
- **Memory Usage**: Cache size limits and cleanup policies
- **Performance**: Continuous benchmarking during development
- **Browser Compatibility**: Cross-browser testing for CSS operations

## Success Metrics
- **Style Speed**: 95% faster than full recalculation
- **Memory Efficiency**: <5MB cache overhead
- **Accuracy**: 100% visual consistency with full calculation
- **Responsiveness**: All style updates feel instant (<10ms)