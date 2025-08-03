# Task 1.3: Create Indexed Data Structures

## Overview
Implement efficient indexed data structures to replace linear array searches with O(1) Map-based lookups for equipment, subgraph, difficulty, and edge traversal operations.

## Context
Current implementation uses linear searches through arrays for equipment filtering, subgraph lookups, and edge traversal. This task creates indexed data structures for instant access patterns.

## Technical Requirements

### Core Index Interface
```typescript
interface GraphIndexes {
  byEquipment: Map<string, Set<string>>      // equipment -> exercise IDs
  bySubgraph: Map<string, Set<string>>       // subgraph ID -> exercise IDs  
  byDifficulty: Map<number, Set<string>>     // difficulty level -> exercise IDs
  outgoingEdges: Map<string, Set<string>>    // exercise ID -> outgoing edge IDs
  incomingEdges: Map<string, Set<string>>    // exercise ID -> incoming edge IDs
  byMovementPattern: Map<string, Set<string>> // movement pattern -> exercise IDs
}

interface IndexMetrics {
  indexSizes: Map<string, number>
  buildTime: number
  memoryUsage: number
  totalLookups: number
}
```

### Implementation Location
- **File**: `/lib/graph-indexer.ts`
- **Integration**: Called from `OptimizedGraphManager` constructor

### Key Classes
```typescript
class GraphIndexer {
  private indexes: GraphIndexes
  private metrics: IndexMetrics
  
  constructor(graph: ExerciseGraph, precomputedData: OptimizedGraphData) {
    this.buildIndexes(graph, precomputedData)
  }
  
  buildIndexes(graph: ExerciseGraph, data: OptimizedGraphData): void
  getExercisesByEquipment(equipment: string): Set<string>
  getExercisesBySubgraph(subgraphId: string): Set<string>
  getExercisesByDifficultyRange(min: number, max: number): Set<string>
  getOutgoingEdges(exerciseId: string): Set<string>
  getIncomingEdges(exerciseId: string): Set<string>
  getIndexMetrics(): IndexMetrics
}
```

### Index Building Strategy
```typescript
private buildEquipmentIndex(data: OptimizedGraphData): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()
  
  for (const [nodeId, nodeData] of data.static.nodes) {
    for (const equipment of nodeData.exerciseData.equipment) {
      if (!index.has(equipment)) {
        index.set(equipment, new Set())
      }
      index.get(equipment)!.add(nodeId)
    }
    
    // Also index by primary equipment for quick filtering
    if (!index.has(nodeData.primaryEquipment)) {
      index.set(nodeData.primaryEquipment, new Set())
    }
    index.get(nodeData.primaryEquipment)!.add(nodeId)
  }
  
  return index
}
```

## Performance Analysis

### Current vs Optimized Lookups

| Operation | Current | Optimized | Improvement |
|-----------|---------|-----------|-------------|
| Equipment Filter | O(n) array scan | O(1) Map lookup | 50-500x |
| Subgraph Lookup | O(n) array scan | O(1) Map lookup | 50-500x |
| Edge Traversal | O(e) edge scan | O(1) Map lookup | 10-100x |
| Difficulty Range | O(n) calculation | O(k) indexed lookup | 5-50x |

### Memory Usage
- **Equipment Index**: ~1KB per unique equipment type
- **Subgraph Index**: ~2KB per subgraph
- **Edge Indexes**: ~4KB per 100 edges
- **Total Overhead**: <5MB for 1000 exercises

## Implementation Steps
1. Create `GraphIndexer` class with index building methods
2. Implement equipment indexing with primary equipment optimization
3. Add subgraph and movement pattern indexing
4. Create difficulty level indexing with range query support
5. Implement bidirectional edge indexing
6. Add index metrics and memory monitoring
7. Integrate with `OptimizedGraphManager`
8. Add index validation and consistency checks

## Performance Requirements
- **Index Build Time**: <200ms for 500 exercises
- **Lookup Time**: <1ms for any indexed operation
- **Memory Overhead**: <10MB for 1000 exercises
- **Index Coverage**: 100% of nodes and edges indexed

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] All equipment types indexed correctly
- [ ] Subgraph membership indexed for all exercises
- [ ] Difficulty ranges support efficient range queries
- [ ] Bidirectional edge traversal through indexes
- [ ] Movement pattern indexing supports filtering
- [ ] Index consistency maintained across updates

### ✅ Performance Requirements
- [ ] Index building completes in <200ms for 500 exercises
- [ ] Equipment lookups complete in <1ms (measured with `performance.now()`)
- [ ] Subgraph filtering 50x faster than current implementation
- [ ] Edge traversal 10x faster than current array scanning
- [ ] Memory usage scales linearly with exercise count

### ✅ Data Integrity
- [ ] All exercises appear in correct equipment indexes
- [ ] No duplicate entries in any index
- [ ] Bidirectional edge consistency (if A→B then B has incoming from A)
- [ ] Index completeness verified against source data
- [ ] Handles missing or malformed data gracefully

### ✅ Integration
- [ ] Seamless integration with `OptimizedGraphManager`
- [ ] Existing lookup methods use indexes transparently
- [ ] No API changes required for consuming code
- [ ] Index rebuilding supports dynamic graph updates

## Testing Strategy

### Unit Tests
```typescript
describe('GraphIndexer', () => {
  test('should index all equipment types correctly', () => {
    const indexer = new GraphIndexer(testGraph, precomputedData)
    const bodyweightExercises = indexer.getExercisesByEquipment('bodyweight')
    
    // Verify against manual count
    const expected = testGraph.exercises.filter(ex => 
      ex.equipment.includes('bodyweight')).length
    expect(bodyweightExercises.size).toBe(expected)
  })
  
  test('should provide O(1) equipment lookups', () => {
    const indexer = new GraphIndexer(largeGraph, largePrecomputedData)
    
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      indexer.getExercisesByEquipment('dumbbells')
    }
    const avgTime = (performance.now() - start) / 1000
    
    expect(avgTime).toBeLessThan(0.1) // <0.1ms per lookup
  })
  
  test('should maintain bidirectional edge consistency', () => {
    const indexer = new GraphIndexer(testGraph, precomputedData)
    
    for (const [edgeId, edge] of precomputedData.static.edges) {
      const outgoing = indexer.getOutgoingEdges(edge.source)
      const incoming = indexer.getIncomingEdges(edge.target)
      
      expect(outgoing.has(edgeId)).toBe(true)
      expect(incoming.has(edgeId)).toBe(true)
    }
  })
})
```

### Performance Tests
```typescript
describe('Index Performance', () => {
  test('should demonstrate significant speedup over linear search', () => {
    const exercises = Array.from(largeGraph.exercises.keys())
    
    // Time linear search
    const linearStart = performance.now()
    const linearResults = exercises.filter(id => 
      largeGraph.exercises[id].equipment.includes('dumbbells'))
    const linearTime = performance.now() - linearStart
    
    // Time indexed search
    const indexedStart = performance.now()
    const indexedResults = indexer.getExercisesByEquipment('dumbbells')
    const indexedTime = performance.now() - indexedStart
    
    expect(indexedResults.size).toBe(linearResults.length)
    expect(indexedTime * 50).toBeLessThan(linearTime) // At least 50x improvement
  })
})
```

### Integration Tests
- Verify index accuracy against current implementation
- Test with all existing exercise catalogs
- Memory usage profiling with large datasets

## Dependencies
- **Blocked by**: Task 1.1 (OptimizedGraphManager), Task 1.2 (Path depths for difficulty indexing)
- **Blocks**: Phase 2 tasks (depend on indexed lookups)
- **Related**: Current linear search implementations

## Deliverables
1. `/lib/graph-indexer.ts` - Core indexing implementation
2. `/lib/types/graph-indexes.ts` - Index type definitions  
3. `/tests/graph-indexer.test.ts` - Comprehensive test suite
4. Performance comparison benchmarks
5. Memory usage analysis report
6. Index documentation and usage guide

## Risk Mitigation
- **Memory Usage**: Continuous monitoring during development
- **Index Accuracy**: Comprehensive validation against source data
- **Performance**: Benchmark against current implementation continuously
- **Maintenance**: Design for easy index rebuilding and updates

## Success Metrics
- **Lookup Performance**: 50x improvement for equipment/subgraph filtering
- **Memory Efficiency**: <5MB overhead for 1000 exercises
- **Accuracy**: 100% consistency with current lookup results
- **Coverage**: All lookup patterns optimized through indexes