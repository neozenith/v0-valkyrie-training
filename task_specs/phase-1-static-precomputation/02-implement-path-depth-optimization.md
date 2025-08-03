# Task 1.2: Implement Efficient Path Depth Calculation

## Overview
Replace the current O(n²) individual path depth calculations with a single O(n) traversal algorithm that pre-computes all path depths from entry points using optimized graph traversal.

## Context
Current implementation calls `calculatePathDepthForExercise()` individually for each node, resulting in repeated traversals. This task implements a single-pass algorithm that calculates all depths simultaneously.

## Technical Requirements

### Algorithm Design
```typescript
interface PathDepthResult {
  depths: Map<string, number>
  maxDepth: number
  entryPoints: Set<string>
  unreachableNodes: Set<string>
}

class PathDepthCalculator {
  calculateAllPathDepths(graph: ExerciseGraph): PathDepthResult {
    const depths = new Map<string, number>()
    const visited = new Set<string>()
    let maxDepth = 0
    
    // Multi-source BFS from all entry points
    const queue: Array<{nodeId: string, depth: number}> = []
    
    // Initialize with all entry points
    for (const subgraph of Object.values(graph.subgraphs)) {
      for (const entryPoint of subgraph.entryPoints) {
        queue.push({nodeId: entryPoint, depth: 0})
        depths.set(entryPoint, 0)
      }
    }
    
    // BFS traversal
    while (queue.length > 0) {
      const {nodeId, depth} = queue.shift()!
      
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      
      maxDepth = Math.max(maxDepth, depth)
      
      // Process outgoing edges
      const outgoingEdges = this.getOutgoingEdges(nodeId)
      for (const edge of outgoingEdges) {
        const targetDepth = depth + 1
        const currentDepth = depths.get(edge.to) ?? Infinity
        
        if (targetDepth < currentDepth) {
          depths.set(edge.to, targetDepth)
          queue.push({nodeId: edge.to, depth: targetDepth})
        }
      }
    }
    
    return {depths, maxDepth, entryPoints, unreachableNodes}
  }
}
```

### Implementation Location
- **File**: `/lib/path-depth-calculator.ts`
- **Integration**: Called from `OptimizedGraphManager` constructor

### Key Features
1. **Multi-source BFS**: Start from all entry points simultaneously
2. **Shortest Path**: Use shortest path to any entry point as depth
3. **Cycle Handling**: Detect and handle cyclic graph structures
4. **Unreachable Detection**: Identify nodes not reachable from entry points

## Performance Analysis

### Current Implementation
```typescript
// O(n²) - Called for each node individually
for (const nodeId of nodeIds) {
  const depth = calculatePathDepthForExercise(nodeId) // O(n) each call
}
```

### Optimized Implementation
```typescript
// O(n + e) - Single traversal for all nodes
const result = pathCalculator.calculateAllPathDepths(graph)
```

## Implementation Steps
1. Create `PathDepthCalculator` class with BFS algorithm
2. Implement cycle detection and handling
3. Add unreachable node identification
4. Integrate with `OptimizedGraphManager`
5. Add comprehensive error handling
6. Optimize memory usage for large graphs

## Performance Requirements
- **Time Complexity**: O(n + e) where n=nodes, e=edges
- **Execution Time**: <100ms for 500 exercises
- **Memory Usage**: O(n) additional memory
- **Accuracy**: 100% identical results to current implementation

## Acceptance Criteria

### ✅ Algorithm Correctness
- [ ] Path depths match current implementation exactly for all test cases
- [ ] Handles cyclic graphs without infinite loops
- [ ] Correctly identifies unreachable nodes
- [ ] Handles multiple entry points per subgraph
- [ ] Produces consistent results across multiple runs

### ✅ Performance Requirements
- [ ] Completes in <100ms for 500 exercises (measured with high-resolution timer)
- [ ] Memory usage scales linearly O(n) with node count
- [ ] No memory leaks during repeated calculations
- [ ] 10x faster than current implementation for large graphs

### ✅ Edge Case Handling
- [ ] Empty graphs return empty results
- [ ] Single-node graphs handled correctly
- [ ] Disconnected subgraphs processed independently
- [ ] Self-loops don't cause infinite recursion
- [ ] Missing entry points handled gracefully

### ✅ Integration
- [ ] Seamlessly integrates with `OptimizedGraphManager`
- [ ] Results stored in precomputed data structure
- [ ] No changes required to consuming code
- [ ] Backwards compatible with existing API

## Testing Strategy

### Unit Tests
```typescript
describe('PathDepthCalculator', () => {
  test('should calculate identical depths to current implementation', () => {
    const calculator = new PathDepthCalculator()
    const optimized = calculator.calculateAllPathDepths(testGraph)
    
    for (const nodeId of testGraph.nodes) {
      const currentDepth = legacyCalculatePathDepth(nodeId)
      const optimizedDepth = optimized.depths.get(nodeId)
      expect(optimizedDepth).toBe(currentDepth)
    }
  })
  
  test('should complete within performance budget', () => {
    const start = performance.now()
    calculator.calculateAllPathDepths(largeGraph) // 500 nodes
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
  
  test('should handle cyclic graphs', () => {
    const cyclicGraph = createCyclicTestGraph()
    const result = calculator.calculateAllPathDepths(cyclicGraph)
    expect(result.depths.size).toBeGreaterThan(0)
    expect(Array.from(result.depths.values()).every(d => d < Infinity)).toBe(true)
  })
})
```

### Performance Tests
```typescript
describe('PathDepthCalculator Performance', () => {
  test('should scale linearly with graph size', () => {
    const sizes = [10, 50, 100, 250, 500]
    const times = sizes.map(size => {
      const graph = generateTestGraph(size)
      const start = performance.now()
      calculator.calculateAllPathDepths(graph)
      return performance.now() - start
    })
    
    // Verify linear scaling (with tolerance for noise)
    const scalingFactor = times[4] / times[0] // 500 vs 10 nodes
    expect(scalingFactor).toBeLessThan(60) // Allow some overhead but expect near-linear
  })
})
```

### Integration Tests
- Compare results with current implementation across all exercise catalogs
- Memory usage profiling with large datasets
- Performance regression testing

## Dependencies
- **Blocked by**: Task 1.1 (OptimizedGraphManager foundation)
- **Blocks**: Task 1.3 (depends on path depth data)
- **Related**: Current path depth calculation in `ExerciseGraphManager`

## Deliverables
1. `/lib/path-depth-calculator.ts` - Core algorithm implementation
2. `/lib/types/path-depth.ts` - Type definitions
3. `/tests/path-depth-calculator.test.ts` - Comprehensive test suite
4. Performance comparison report vs current implementation
5. Algorithm documentation with complexity analysis

## Risk Mitigation
- **Algorithm Correctness**: Extensive testing against current implementation
- **Performance**: Continuous benchmarking during development
- **Memory Usage**: Profile with heap snapshots for large graphs
- **Edge Cases**: Comprehensive test suite covering all graph topologies

## Success Metrics
- **Performance**: 10x improvement in calculation time
- **Accuracy**: 100% match with current implementation
- **Scalability**: Linear scaling verified up to 1000 nodes
- **Integration**: Seamless replacement with no API changes