# Task 2.1: Implement Incremental Update System

## Overview
Create an incremental update system that calculates minimal diffs for configuration changes instead of regenerating all Cytoscape data, reducing update operations from full reconstruction to targeted modifications.

## Context
Current implementation calls `generateCytoscapeData()` and recreates all nodes/edges on every configuration change. This task implements a differential update system that only modifies what actually changed.

## Technical Requirements

### Core Diff Calculation Interface
```typescript
interface UpdatePlan {
  nodesToAdd: Map<string, CytoscapeNode>
  nodesToRemove: Set<string>
  nodesToUpdate: Map<string, NodeStyleUpdate>
  edgesToAdd: Map<string, CytoscapeEdge>
  edgesToRemove: Set<string>
  edgesToUpdate: Map<string, EdgeStyleUpdate>
  layoutChange: boolean
  estimatedCost: number
}

interface NodeStyleUpdate {
  classes: string[]
  data: Partial<any>
  position?: { x: number, y: number }
}

interface EdgeStyleUpdate {
  classes: string[]
  data: Partial<any>
}

interface ConfigurationDiff {
  layoutChanged: boolean
  visibilityChanged: boolean
  styleOnlyChanged: boolean
  affectedNodes: Set<string>
  affectedEdges: Set<string>
}
```

### Implementation Location
- **File**: `/lib/incremental-updater.ts`
- **Integration**: Called by optimized visualization component

### Core Algorithm
```typescript
class IncrementalUpdater {
  private previousConfig: GraphVisualizationConfig | null = null
  private previousNodeSet: Set<string> = new Set()
  private previousEdgeSet: Set<string> = new Set()
  
  calculateUpdatePlan(
    newConfig: GraphVisualizationConfig,
    optimizedData: OptimizedGraphData,
    indexes: GraphIndexes
  ): UpdatePlan {
    
    if (!this.previousConfig) {
      return this.createFullRebuildPlan(newConfig, optimizedData)
    }
    
    const diff = this.calculateConfigDiff(this.previousConfig, newConfig)
    
    if (diff.styleOnlyChanged) {
      return this.createStyleOnlyPlan(newConfig, diff)
    }
    
    if (diff.visibilityChanged) {
      return this.createVisibilityPlan(newConfig, diff, indexes)
    }
    
    if (diff.layoutChanged) {
      return this.createLayoutPlan(newConfig, diff)
    }
    
    return { /* no changes */ }
  }
  
  private calculateVisibleNodes(
    config: GraphVisualizationConfig,
    indexes: GraphIndexes
  ): Set<string> {
    let visibleNodes = new Set<string>()
    
    // Apply subgraph filter
    if (config.focusSubgraph) {
      visibleNodes = indexes.bySubgraph.get(config.focusSubgraph) || new Set()
    } else {
      visibleNodes = new Set(indexes.bySubgraph.values().flatMap(s => Array.from(s)))
    }
    
    // Apply equipment filter
    if (config.equipmentFilter?.length) {
      const equipmentNodes = new Set<string>()
      for (const equipment of config.equipmentFilter) {
        const nodes = indexes.byEquipment.get(equipment) || new Set()
        nodes.forEach(n => equipmentNodes.add(n))
      }
      visibleNodes = new Set([...visibleNodes].filter(n => equipmentNodes.has(n)))
    }
    
    // Apply depth filter
    if (config.maxDepth < Infinity) {
      visibleNodes = new Set([...visibleNodes].filter(nodeId => {
        const depth = optimizedData.static.nodes.get(nodeId)?.pathDepth || 0
        return depth <= config.maxDepth
      }))
    }
    
    return visibleNodes
  }
}
```

## Optimization Strategies

### 1. Configuration Diff Analysis
```typescript
private calculateConfigDiff(
  oldConfig: GraphVisualizationConfig,
  newConfig: GraphVisualizationConfig
): ConfigurationDiff {
  return {
    layoutChanged: oldConfig.layout !== newConfig.layout,
    visibilityChanged: this.hasVisibilityChanges(oldConfig, newConfig),
    styleOnlyChanged: this.hasOnlyStyleChanges(oldConfig, newConfig),
    affectedNodes: this.getAffectedNodes(oldConfig, newConfig),
    affectedEdges: this.getAffectedEdges(oldConfig, newConfig)
  }
}
```

### 2. Smart Visibility Calculation
```typescript
private createVisibilityPlan(
  config: GraphVisualizationConfig,
  diff: ConfigurationDiff,
  indexes: GraphIndexes
): UpdatePlan {
  const newVisibleNodes = this.calculateVisibleNodes(config, indexes)
  const newVisibleEdges = this.calculateVisibleEdges(newVisibleNodes, indexes)
  
  const nodesToAdd = new Map<string, CytoscapeNode>()
  const nodesToRemove = new Set<string>()
  const edgesToAdd = new Map<string, CytoscapeEdge>()
  const edgesToRemove = new Set<string>()
  
  // Calculate node differences
  for (const nodeId of newVisibleNodes) {
    if (!this.previousNodeSet.has(nodeId)) {
      nodesToAdd.set(nodeId, this.createCytoscapeNode(nodeId, config))
    }
  }
  
  for (const nodeId of this.previousNodeSet) {
    if (!newVisibleNodes.has(nodeId)) {
      nodesToRemove.add(nodeId)
    }
  }
  
  // Update state
  this.previousNodeSet = newVisibleNodes
  this.previousEdgeSet = newVisibleEdges
  
  return {
    nodesToAdd, nodesToRemove, edgesToAdd, edgesToRemove,
    nodesToUpdate: new Map(),
    edgesToUpdate: new Map(),
    layoutChange: false,
    estimatedCost: this.calculateUpdateCost(nodesToAdd.size, nodesToRemove.size)
  }
}
```

## Performance Requirements
- **Diff Calculation**: <20ms for 500 exercises
- **Style-only Updates**: <10ms for any size graph
- **Visibility Updates**: <50ms for major filter changes
- **Memory Overhead**: <5MB for tracking state

## Implementation Steps
1. Create `IncrementalUpdater` class with state tracking
2. Implement configuration difference analysis
3. Add visibility calculation with indexed lookups
4. Create style-only update optimization
5. Implement layout change detection and handling
6. Add update cost estimation
7. Integrate with visualization component
8. Add comprehensive error handling and validation

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] Correctly identifies configuration differences
- [ ] Generates minimal update plans for all change types
- [ ] Maintains visual consistency with full rebuild
- [ ] Handles all configuration combinations correctly
- [ ] Preserves user selections during updates

### ✅ Performance Requirements
- [ ] Configuration diff calculation <20ms (measured with `performance.now()`)
- [ ] Style-only updates <10ms for any graph size
- [ ] Visibility updates <50ms for major filter changes
- [ ] 90% reduction in DOM operations vs full rebuild
- [ ] Memory usage scales linearly with visible elements

### ✅ Update Accuracy
- [ ] Visual output identical to full rebuild for all configs
- [ ] No visual artifacts during incremental updates
- [ ] Correct node/edge addition and removal
- [ ] Style updates applied correctly to all elements
- [ ] Layout changes trigger appropriate re-positioning

### ✅ State Management
- [ ] Previous configuration tracked correctly
- [ ] Node/edge visibility state maintained accurately
- [ ] Handles rapid configuration changes gracefully
- [ ] Memory cleanup after updates
- [ ] Thread-safe for concurrent updates

## Testing Strategy

### Unit Tests
```typescript
describe('IncrementalUpdater', () => {
  test('should generate minimal update plan for color scheme change', () => {
    const updater = new IncrementalUpdater()
    
    // Initial state
    const plan1 = updater.calculateUpdatePlan(config1, data, indexes)
    
    // Change only color scheme
    const config2 = { ...config1, colorScheme: 'difficulty' }
    const plan2 = updater.calculateUpdatePlan(config2, data, indexes)
    
    expect(plan2.nodesToAdd.size).toBe(0)
    expect(plan2.nodesToRemove.size).toBe(0)
    expect(plan2.nodesToUpdate.size).toBeGreaterThan(0)
    expect(plan2.layoutChange).toBe(false)
  })
  
  test('should handle equipment filter changes efficiently', () => {
    const updater = new IncrementalUpdater()
    
    const plan1 = updater.calculateUpdatePlan(allEquipmentConfig, data, indexes)
    const plan2 = updater.calculateUpdatePlan(bodyweightOnlyConfig, data, indexes)
    
    const expectedVisible = indexes.byEquipment.get('bodyweight')?.size || 0
    expect(plan2.nodesToRemove.size).toBe(plan1.nodesToAdd.size - expectedVisible)
    expect(plan2.nodesToAdd.size).toBe(0) // Already visible
  })
  
  test('should complete diff calculation within performance budget', () => {
    const start = performance.now()
    updater.calculateUpdatePlan(newConfig, largeData, largeIndexes)
    const duration = performance.now() - start
    expect(duration).toBeLessThan(20)
  })
})
```

### Performance Tests
```typescript
describe('Update Performance', () => {
  test('should demonstrate significant improvement over full rebuild', () => {
    // Time full rebuild
    const fullStart = performance.now()
    const fullRebuild = generateCytoscapeData(newConfig) // Current approach
    const fullTime = performance.now() - fullStart
    
    // Time incremental update
    const incStart = performance.now()
    const updatePlan = updater.calculateUpdatePlan(newConfig, data, indexes)
    const incTime = performance.now() - incStart
    
    expect(incTime * 10).toBeLessThan(fullTime) // At least 10x improvement
  })
})
```

### Integration Tests
- Test with all configuration combinations
- Verify visual consistency with existing implementation
- Performance regression testing

## Dependencies
- **Blocked by**: Phase 1 tasks (OptimizedGraphManager, Indexes)
- **Blocks**: Task 2.2 (Cytoscape batching depends on update plans)
- **Related**: Current `generateCytoscapeData` method

## Deliverables
1. `/lib/incremental-updater.ts` - Core implementation
2. `/lib/types/update-plan.ts` - Type definitions
3. `/tests/incremental-updater.test.ts` - Comprehensive test suite
4. Performance benchmark vs current implementation
5. Configuration change analysis documentation

## Risk Mitigation
- **State Consistency**: Comprehensive validation of tracked state
- **Performance**: Continuous benchmarking during development
- **Visual Accuracy**: Pixel-perfect comparison tests with full rebuild
- **Memory Leaks**: Automated memory usage monitoring

## Success Metrics
- **Update Speed**: 90% faster than full rebuild for style changes
- **Accuracy**: 100% visual consistency with full rebuild
- **Memory**: Linear scaling with visible elements only
- **Responsiveness**: All updates complete in <100ms