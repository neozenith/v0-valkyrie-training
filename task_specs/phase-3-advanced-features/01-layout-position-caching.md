# Task 3.1: Implement Layout Position Caching

## Overview
Create an intelligent caching system for Cytoscape layout positions that eliminates expensive layout recalculations when switching between previously computed configurations.

## Context
Layout algorithms (especially force-directed ones like 'fcose') can take 2-5 seconds to compute positions for large graphs. This task caches computed positions and provides instant layout switching for previously seen configurations.

## Technical Requirements

### Core Caching Interface
```typescript
interface LayoutPositionCache {
  [cacheKey: string]: {
    positions: Map<string, Position>
    timestamp: number
    config: LayoutConfiguration
    nodeCount: number
    validity: 'valid' | 'stale' | 'invalid'
  }
}

interface Position {
  x: number
  y: number
}

interface LayoutConfiguration {
  algorithm: string
  visibleNodes: Set<string>
  parameters: Record<string, any>
  subgraphFocus?: string
  equipmentFilter?: string[]
}

interface CacheMetrics {
  hitRate: number
  missRate: number
  totalRequests: number
  cacheSize: number
  memoryUsage: number
  averageHitTime: number
  averageMissTime: number
}
```

### Implementation Location
- **File**: `/lib/layout-cache-manager.ts`
- **Integration**: Used by visualization component for layout switching

### Core Cache Manager
```typescript
class LayoutCacheManager {
  private cache: LayoutPositionCache = {}
  private metrics: CacheMetrics
  private maxCacheSize: number = 50
  private maxAge: number = 30 * 60 * 1000 // 30 minutes
  
  constructor(options?: { maxCacheSize?: number, maxAge?: number }) {
    this.maxCacheSize = options?.maxCacheSize ?? 50
    this.maxAge = options?.maxAge ?? 30 * 60 * 1000
    this.metrics = this.initializeMetrics()
  }
  
  async getLayoutPositions(
    config: LayoutConfiguration,
    nodeData: Map<string, any>
  ): Promise<Map<string, Position>> {
    const cacheKey = this.generateCacheKey(config)
    const cached = this.getCachedPositions(cacheKey)
    
    if (cached && this.isCacheValid(cached, config)) {
      this.recordCacheHit()
      return cached.positions
    }
    
    this.recordCacheMiss()
    const positions = await this.computeLayoutPositions(config, nodeData)
    this.cachePositions(cacheKey, positions, config)
    
    return positions
  }
  
  private generateCacheKey(config: LayoutConfiguration): string {
    const keyParts = [
      config.algorithm,
      Array.from(config.visibleNodes).sort().join(','),
      JSON.stringify(config.parameters),
      config.subgraphFocus || '',
      config.equipmentFilter?.sort().join(',') || ''
    ]
    
    return btoa(keyParts.join('|')).slice(0, 32)
  }
  
  private isCacheValid(
    cached: LayoutPositionCache[string],
    config: LayoutConfiguration
  ): boolean {
    // Check age
    if (Date.now() - cached.timestamp > this.maxAge) {
      return false
    }
    
    // Check node set consistency
    if (cached.nodeCount !== config.visibleNodes.size) {
      return false
    }
    
    // Check algorithm/parameter changes
    if (cached.config.algorithm !== config.algorithm) {
      return false
    }
    
    return true
  }
}
```

## Cache Optimization Strategies

### 1. Smart Cache Key Generation
```typescript
private generateOptimizedCacheKey(config: LayoutConfiguration): string {
  // Use stable sorting for consistent keys
  const sortedNodes = Array.from(config.visibleNodes).sort()
  
  // Hash large node sets to reduce key size
  const nodeKey = sortedNodes.length > 100 
    ? this.hashNodeSet(sortedNodes)
    : sortedNodes.join(',')
  
  // Normalize parameters for better cache hits
  const normalizedParams = this.normalizeLayoutParameters(config.parameters)
  
  return `${config.algorithm}:${nodeKey}:${JSON.stringify(normalizedParams)}`
}

private normalizeLayoutParameters(params: Record<string, any>): Record<string, any> {
  // Round numerical parameters to reduce cache misses from tiny differences
  const normalized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number') {
      normalized[key] = Math.round(value * 100) / 100 // 2 decimal places
    } else {
      normalized[key] = value
    }
  }
  
  return normalized
}
```

### 2. Intelligent Cache Eviction
```typescript
private evictStaleEntries(): void {
  const now = Date.now()
  const entries = Object.entries(this.cache)
  
  // Remove expired entries
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > this.maxAge) {
      delete this.cache[key]
    }
  }
  
  // If still over limit, remove least recently used
  if (Object.keys(this.cache).length > this.maxCacheSize) {
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = sortedEntries.slice(0, entries.length - this.maxCacheSize)
    
    for (const [key] of toRemove) {
      delete this.cache[key]
    }
  }
}
```

### 3. Position Interpolation
```typescript
interpolatePositions(
  fromPositions: Map<string, Position>,
  toPositions: Map<string, Position>,
  progress: number
): Map<string, Position> {
  const interpolated = new Map<string, Position>()
  
  for (const [nodeId, fromPos] of fromPositions) {
    const toPos = toPositions.get(nodeId)
    
    if (toPos) {
      interpolated.set(nodeId, {
        x: fromPos.x + (toPos.x - fromPos.x) * progress,
        y: fromPos.y + (toPos.y - fromPos.y) * progress
      })
    }
  }
  
  return interpolated
}

async animateLayoutTransition(
  fromConfig: LayoutConfiguration,
  toConfig: LayoutConfiguration,
  duration: number = 500
): Promise<void> {
  const fromPositions = await this.getLayoutPositions(fromConfig, nodeData)
  const toPositions = await this.getLayoutPositions(toConfig, nodeData)
  
  return new Promise(resolve => {
    const startTime = performance.now()
    
    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const currentPositions = this.interpolatePositions(
        fromPositions, 
        toPositions, 
        this.easeInOutCubic(progress)
      )
      
      this.applyPositions(currentPositions)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }
    
    animate()
  })
}
```

## Performance Requirements
- **Cache Hit Time**: <10ms for layout retrieval
- **Cache Miss Time**: <2s for new layout computation
- **Memory Usage**: <20MB for 50 cached layouts
- **Cache Hit Rate**: >70% for typical usage patterns

## Implementation Steps
1. Create `LayoutCacheManager` class with position storage
2. Implement cache key generation and validation
3. Add intelligent cache eviction policies
4. Create position interpolation for smooth transitions
5. Integrate with Cytoscape layout system
6. Add cache metrics and monitoring
7. Implement cache persistence (localStorage)
8. Add fallback for cache failures

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] Layout positions cache correctly across configuration changes
- [ ] Cache keys uniquely identify layout configurations
- [ ] Cache eviction maintains bounded memory usage
- [ ] Position interpolation provides smooth transitions
- [ ] Cache works with all supported layout algorithms

### ✅ Performance Requirements
- [ ] Cache hits retrieve positions in <10ms (measured with `performance.now()`)
- [ ] Layout switching 20x faster than recomputation
- [ ] Memory usage <20MB for 50 cached layouts
- [ ] Cache hit rate >70% for typical user workflows
- [ ] Position interpolation at 60fps during transitions

### ✅ Cache Accuracy
- [ ] Cached positions identical to fresh computation
- [ ] Cache invalidation works correctly for configuration changes
- [ ] No position drift or corruption in cached data
- [ ] Cache handles node additions/removals correctly
- [ ] Consistent behavior across browser sessions

### ✅ Integration
- [ ] Seamless integration with existing layout system
- [ ] Works with all layout algorithms (fcose, hierarchical, etc.)
- [ ] Cache persistence survives page reloads
- [ ] Graceful fallback when cache unavailable
- [ ] Memory cleanup prevents leaks

## Testing Strategy

### Unit Tests
```typescript
describe('LayoutCacheManager', () => {
  test('should cache and retrieve layout positions correctly', async () => {
    const manager = new LayoutCacheManager()
    const config: LayoutConfiguration = {
      algorithm: 'fcose',
      visibleNodes: new Set(['node1', 'node2', 'node3']),
      parameters: { idealEdgeLength: 50 }
    }
    
    // First call should compute and cache
    const positions1 = await manager.getLayoutPositions(config, nodeData)
    expect(positions1).toBeDefined()
    
    // Second call should hit cache
    const start = performance.now()
    const positions2 = await manager.getLayoutPositions(config, nodeData)
    const hitTime = performance.now() - start
    
    expect(hitTime).toBeLessThan(10)
    expect(positions2).toEqual(positions1)
  })
  
  test('should generate consistent cache keys', () => {
    const config1: LayoutConfiguration = {
      algorithm: 'fcose',
      visibleNodes: new Set(['a', 'b', 'c']),
      parameters: { idealEdgeLength: 50 }
    }
    
    const config2: LayoutConfiguration = {
      algorithm: 'fcose',
      visibleNodes: new Set(['c', 'a', 'b']), // Different order
      parameters: { idealEdgeLength: 50 }
    }
    
    const key1 = manager.generateCacheKey(config1)
    const key2 = manager.generateCacheKey(config2)
    
    expect(key1).toBe(key2) // Should be identical despite different order
  })
  
  test('should evict old entries when cache size exceeded', () => {
    const manager = new LayoutCacheManager({ maxCacheSize: 3 })
    
    // Fill cache beyond limit
    for (let i = 0; i < 5; i++) {
      const config = { algorithm: 'fcose', visibleNodes: new Set([`node${i}`]) }
      manager.cachePositions(`key${i}`, new Map(), config)
    }
    
    expect(Object.keys(manager.cache).length).toBe(3)
  })
})
```

### Performance Tests
```typescript
describe('Cache Performance', () => {
  test('should demonstrate significant speedup for cached layouts', async () => {
    const config = createTestLayoutConfig()
    
    // Time fresh computation
    const computeStart = performance.now()
    const computed = await manager.computeLayoutPositions(config, nodeData)
    const computeTime = performance.now() - computeStart
    
    // Cache the result
    manager.cachePositions('test', computed, config)
    
    // Time cache retrieval
    const cacheStart = performance.now()
    const cached = await manager.getLayoutPositions(config, nodeData)
    const cacheTime = performance.now() - cacheStart
    
    expect(cacheTime * 20).toBeLessThan(computeTime) // At least 20x speedup
    expect(cached).toEqual(computed)
  })
})
```

### Integration Tests
- Test with all layout algorithms
- Verify cache persistence across page reloads
- Memory usage profiling with large caches

## Dependencies
- **Blocked by**: Phase 2 completion (stable incremental updates)
- **Blocks**: None (optimization feature)
- **Related**: Cytoscape layout algorithms, position animations

## Deliverables
1. `/lib/layout-cache-manager.ts` - Core caching implementation
2. `/lib/types/layout-cache.ts` - Cache type definitions
3. `/tests/layout-cache-manager.test.ts` - Comprehensive test suite
4. Cache performance benchmark report
5. Cache configuration and tuning guide

## Risk Mitigation
- **Memory Usage**: Cache size limits and monitoring
- **Cache Consistency**: Validation against fresh computation
- **Performance**: Fallback to direct computation on cache failures
- **Browser Compatibility**: localStorage availability detection

## Success Metrics
- **Cache Hit Speed**: 20x faster than fresh computation
- **Memory Efficiency**: <20MB for typical cache sizes
- **Hit Rate**: >70% for common user workflows
- **Transition Smoothness**: 60fps interpolated animations