# Task 2.2: Implement Cytoscape Batch Operations

## Overview
Optimize Cytoscape graph updates by implementing batch operations that group DOM manipulations, reducing render cycles from hundreds to single transactions per configuration change.

## Context
Current implementation performs individual add/remove/style operations, triggering multiple render cycles. This task implements `cy.batch()` operations that group all changes into atomic transactions.

## Technical Requirements

### Core Batch Interface
```typescript
interface BatchOperation {
  type: 'add' | 'remove' | 'style' | 'data' | 'position'
  elementId: string
  data?: any
  classes?: string[]
  position?: { x: number, y: number }
}

interface BatchPlan {
  operations: BatchOperation[]
  estimatedRenderTime: number
  operationCount: number
  priority: 'immediate' | 'next-frame' | 'background'
}

interface BatchMetrics {
  operationCount: number
  renderTime: number
  domMutations: number
  layoutRecalculations: number
}
```

### Implementation Location
- **File**: `/lib/cytoscape-batch-manager.ts`
- **Integration**: Used by IncrementalUpdater for efficient graph updates

### Core Algorithm
```typescript
class CytoscapeBatchManager {
  private cy: cytoscape.Core
  private pendingOperations: BatchOperation[] = []
  private batchTimeout: number | null = null
  
  constructor(cy: cytoscape.Core) {
    this.cy = cy
  }
  
  queueOperation(operation: BatchOperation): void {
    this.pendingOperations.push(operation)
    this.scheduleBatch()
  }
  
  private scheduleBatch(): void {
    if (this.batchTimeout) return
    
    this.batchTimeout = requestAnimationFrame(() => {
      this.executeBatch()
      this.batchTimeout = null
    })
  }
  
  private executeBatch(): void {
    if (this.pendingOperations.length === 0) return
    
    const startTime = performance.now()
    
    this.cy.batch(() => {
      this.groupAndExecuteOperations(this.pendingOperations)
    })
    
    const batchTime = performance.now() - startTime
    this.recordMetrics(this.pendingOperations.length, batchTime)
    this.pendingOperations = []
  }
  
  private groupAndExecuteOperations(operations: BatchOperation[]): void {
    // Group operations by type for optimal execution order
    const groups = {
      remove: operations.filter(op => op.type === 'remove'),
      add: operations.filter(op => op.type === 'add'),
      style: operations.filter(op => op.type === 'style'),
      data: operations.filter(op => op.type === 'data'),
      position: operations.filter(op => op.type === 'position')
    }
    
    // Execute in optimal order: remove → add → style → data → position
    this.executeRemoveOperations(groups.remove)
    this.executeAddOperations(groups.add)
    this.executeStyleOperations(groups.style)
    this.executeDataOperations(groups.data)
    this.executePositionOperations(groups.position)
  }
}
```

## Batch Optimization Strategies

### 1. Operation Grouping
```typescript
private executeStyleOperations(operations: BatchOperation[]): void {
  // Group by classes for bulk application
  const classesByElement = new Map<string, string[]>()
  
  for (const op of operations) {
    if (!classesByElement.has(op.elementId)) {
      classesByElement.set(op.elementId, [])
    }
    classesByElement.get(op.elementId)!.push(...(op.classes || []))
  }
  
  // Apply all classes at once per element
  for (const [elementId, classes] of classesByElement) {
    this.cy.getElementById(elementId).classes(classes)
  }
}
```

### 2. Smart Scheduling
```typescript
interface BatchScheduler {
  immediate: BatchOperation[]     // Critical updates (user interactions)
  nextFrame: BatchOperation[]     // Standard updates (config changes)
  background: BatchOperation[]    // Background updates (preloading)
}

private scheduleByPriority(): void {
  // Immediate operations bypass queue
  if (this.scheduler.immediate.length > 0) {
    this.executeImmediateBatch()
  }
  
  // Standard operations use requestAnimationFrame
  if (this.scheduler.nextFrame.length > 0) {
    requestAnimationFrame(() => this.executeStandardBatch())
  }
  
  // Background operations use requestIdleCallback
  if (this.scheduler.background.length > 0) {
    requestIdleCallback(() => this.executeBackgroundBatch())
  }
}
```

### 3. Render Optimization
```typescript
private optimizeRenderCycle(): void {
  // Disable auto-refresh during batch operations
  this.cy.autoRefresh(false)
  
  // Execute all operations
  this.executeBatchOperations()
  
  // Single refresh at the end
  this.cy.autoRefresh(true)
  this.cy.refresh()
}
```

## Performance Requirements
- **Batch Execution**: <50ms for 500 node updates
- **DOM Mutations**: 90% reduction vs individual operations
- **Render Cycles**: 95% reduction (1 cycle vs 20+ cycles)
- **Memory Overhead**: <2MB for operation queuing

## Implementation Steps
1. Create `CytoscapeBatchManager` class with operation queuing
2. Implement operation grouping and optimization
3. Add priority-based scheduling system
4. Create batch metrics and monitoring
5. Integrate with `IncrementalUpdater`
6. Add render cycle optimization
7. Implement fallback for batch failures
8. Add comprehensive error handling

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] All graph updates use batch operations
- [ ] Operation grouping reduces redundant DOM manipulations
- [ ] Priority scheduling handles urgent vs background updates
- [ ] Batch failures fallback to individual operations gracefully
- [ ] Visual consistency maintained across all batch types

### ✅ Performance Requirements
- [ ] Batch execution <50ms for 500 operations (measured with `performance.now()`)
- [ ] 90% reduction in DOM mutations vs individual operations
- [ ] 95% reduction in render cycles (measured with observer)
- [ ] Memory usage <2MB for operation queue
- [ ] No visual artifacts during batch updates

### ✅ Integration Requirements
- [ ] Seamless integration with IncrementalUpdater
- [ ] Works with all Cytoscape element types (nodes, edges)
- [ ] Compatible with all operation types (add, remove, style, data)
- [ ] Handles concurrent batch requests correctly
- [ ] Maintains operation order when required

### ✅ Error Handling
- [ ] Graceful fallback when batch operations fail
- [ ] Handles invalid element IDs without breaking batch
- [ ] Recovers from Cytoscape API errors
- [ ] Provides meaningful error reporting
- [ ] Maintains graph consistency after failures

## Testing Strategy

### Unit Tests
```typescript
describe('CytoscapeBatchManager', () => {
  test('should group operations efficiently', () => {
    const manager = new CytoscapeBatchManager(cy)
    
    // Queue multiple style operations for same element
    manager.queueOperation({
      type: 'style',
      elementId: 'node1',
      classes: ['highlight']
    })
    manager.queueOperation({
      type: 'style', 
      elementId: 'node1',
      classes: ['selected']
    })
    
    // Should combine into single DOM operation
    const spy = jest.spyOn(cy, 'batch')
    manager.executeBatch()
    
    expect(spy).toHaveBeenCalledTimes(1)
    expect(cy.getElementById('node1').classes()).toContain('highlight')
    expect(cy.getElementById('node1').classes()).toContain('selected')
  })
  
  test('should complete batch within performance budget', () => {
    const operations = Array.from({length: 500}, (_, i) => ({
      type: 'style' as const,
      elementId: `node${i}`,
      classes: ['updated']
    }))
    
    const start = performance.now()
    manager.executeBatch(operations)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(50)
  })
  
  test('should reduce DOM mutations significantly', () => {
    const mutationObserver = new MutationObserver(() => {})
    let mutationCount = 0
    
    // Count individual operations
    const individualStart = performance.now()
    for (let i = 0; i < 100; i++) {
      cy.getElementById(`node${i}`).classes(['individual'])
      mutationCount++
    }
    const individualTime = performance.now() - individualStart
    
    // Count batch operations
    mutationCount = 0
    const batchStart = performance.now()
    manager.executeBatch(operations)
    const batchTime = performance.now() - batchStart
    
    expect(mutationCount).toBeLessThan(10) // Should be ~1 mutation
    expect(batchTime * 10).toBeLessThan(individualTime) // At least 10x faster
  })
})
```

### Performance Tests
```typescript
describe('Batch Performance', () => {
  test('should demonstrate significant speedup over individual operations', () => {
    const nodeCount = 500
    
    // Time individual operations
    const individualStart = performance.now()
    for (let i = 0; i < nodeCount; i++) {
      cy.getElementById(`node${i}`).addClass('test-class')
    }
    const individualTime = performance.now() - individualStart
    
    // Time batch operations  
    const operations = Array.from({length: nodeCount}, (_, i) => ({
      type: 'style' as const,
      elementId: `node${i}`,
      classes: ['test-class']
    }))
    
    const batchStart = performance.now()
    manager.executeBatch(operations)
    const batchTime = performance.now() - batchStart
    
    expect(batchTime * 5).toBeLessThan(individualTime) // At least 5x improvement
  })
})
```

### Integration Tests
- Test with all update plan types from IncrementalUpdater
- Verify batch operations work with complex graph configurations
- Performance testing with realistic usage patterns

## Dependencies
- **Blocked by**: Task 2.1 (IncrementalUpdater generates operations)
- **Blocks**: Phase 3 tasks (advanced features use batch operations)
- **Related**: Cytoscape.js batch API, DOM performance optimization

## Deliverables
1. `/lib/cytoscape-batch-manager.ts` - Core batch implementation
2. `/lib/types/batch-operations.ts` - Type definitions
3. `/tests/cytoscape-batch-manager.test.ts` - Comprehensive test suite
4. Performance comparison report vs individual operations
5. Batch operation documentation and best practices

## Risk Mitigation
- **Batch Failures**: Comprehensive fallback to individual operations
- **Memory Usage**: Operation queue size limits and cleanup
- **Visual Artifacts**: Validation and rollback for failed batches
- **Performance**: Continuous benchmarking during development

## Success Metrics
- **DOM Mutations**: 90% reduction vs individual operations
- **Render Performance**: 95% fewer render cycles
- **Update Speed**: 5x faster than individual operations
- **Memory Efficiency**: <2MB overhead for operation management