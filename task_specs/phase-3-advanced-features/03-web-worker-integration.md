# Task 3.3: Implement Web Worker Integration

## Overview
Move computationally expensive graph operations to Web Workers to maintain UI responsiveness during heavy calculations like path depth computation, layout algorithms, and large graph analysis.

## Context
Heavy graph computations (especially with 1000+ exercises) can block the main thread for seconds, freezing the UI. This task offloads these operations to Web Workers while maintaining seamless integration with the main application.

## Technical Requirements

### Core Worker Interface
```typescript
interface WorkerMessage {
  id: string
  type: WorkerMessageType
  payload: any
  timestamp: number
}

type WorkerMessageType = 
  | 'CALCULATE_PATH_DEPTHS'
  | 'OPTIMIZE_LAYOUT'
  | 'BUILD_INDEXES'
  | 'ANALYZE_GRAPH'
  | 'PRECOMPUTE_STYLES'

interface WorkerResponse {
  id: string
  type: WorkerMessageType
  result?: any
  error?: string
  progress?: number
  timestamp: number
}

interface WorkerPool {
  workers: Worker[]
  activeJobs: Map<string, WorkerJob>
  jobQueue: WorkerJob[]
  maxWorkers: number
  roundRobinIndex: number
}

interface WorkerJob {
  id: string
  type: WorkerMessageType
  payload: any
  resolve: (result: any) => void
  reject: (error: Error) => void
  progress?: (progress: number) => void
  priority: 'immediate' | 'high' | 'normal' | 'low'
}
```

### Implementation Location
- **File**: `/lib/graph-worker-manager.ts`
- **Worker Files**: `/workers/graph-computation-worker.ts`
- **Integration**: Used by OptimizedGraphManager for heavy computations

### Core Worker Manager
```typescript
class GraphWorkerManager {
  private workerPool: WorkerPool
  private supportsWorkers: boolean
  
  constructor(options?: { maxWorkers?: number }) {
    this.supportsWorkers = this.checkWorkerSupport()
    this.workerPool = this.initializeWorkerPool(options?.maxWorkers)
  }
  
  async calculatePathDepths(
    graph: SerializableGraph,
    onProgress?: (progress: number) => void
  ): Promise<Map<string, number>> {
    if (!this.supportsWorkers) {
      return this.fallbackPathDepthCalculation(graph)
    }
    
    return this.executeWorkerJob({
      type: 'CALCULATE_PATH_DEPTHS',
      payload: { graph },
      priority: 'high',
      progress: onProgress
    })
  }
  
  async optimizeLayout(
    algorithm: string,
    nodes: SerializableNode[],
    edges: SerializableEdge[],
    parameters: LayoutParameters
  ): Promise<Map<string, Position>> {
    if (!this.supportsWorkers) {
      return this.fallbackLayoutOptimization(algorithm, nodes, edges, parameters)
    }
    
    return this.executeWorkerJob({
      type: 'OPTIMIZE_LAYOUT',
      payload: { algorithm, nodes, edges, parameters },
      priority: 'immediate'
    })
  }
  
  private async executeWorkerJob(job: Omit<WorkerJob, 'id' | 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const jobId = this.generateJobId()
      const fullJob: WorkerJob = {
        ...job,
        id: jobId,
        resolve,
        reject
      }
      
      if (this.workerPool.workers.length === 0) {
        this.workerPool.jobQueue.push(fullJob)
      } else {
        this.assignJobToWorker(fullJob)
      }
    })
  }
  
  private assignJobToWorker(job: WorkerJob): void {
    const worker = this.selectWorker()
    this.workerPool.activeJobs.set(job.id, job)
    
    const message: WorkerMessage = {
      id: job.id,
      type: job.type,
      payload: job.payload,
      timestamp: Date.now()
    }
    
    worker.postMessage(message)
  }
  
  private selectWorker(): Worker {
    // Round-robin selection for load balancing
    const worker = this.workerPool.workers[this.workerPool.roundRobinIndex]
    this.workerPool.roundRobinIndex = 
      (this.workerPool.roundRobinIndex + 1) % this.workerPool.workers.length
    return worker
  }
}
```

## Worker Implementation

### Graph Computation Worker
```typescript
// workers/graph-computation-worker.ts
interface SerializableGraph {
  nodes: SerializableNode[]
  edges: SerializableEdge[]
  subgraphs: SerializableSubgraph[]
}

interface SerializableNode {
  id: string
  exerciseData: CatalogExercise
  subgraphId: string
  isEntryPoint: boolean
}

interface SerializableEdge {
  id: string
  source: string
  target: string
  relationship: string
}

// Main worker message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data
  
  try {
    let result: any
    
    switch (type) {
      case 'CALCULATE_PATH_DEPTHS':
        result = await calculatePathDepthsWorker(payload.graph, (progress) => {
          postProgressUpdate(id, progress)
        })
        break
        
      case 'OPTIMIZE_LAYOUT':
        result = await optimizeLayoutWorker(
          payload.algorithm,
          payload.nodes,
          payload.edges,
          payload.parameters
        )
        break
        
      case 'BUILD_INDEXES':
        result = await buildIndexesWorker(payload.graph)
        break
        
      case 'ANALYZE_GRAPH':
        result = await analyzeGraphWorker(payload.graph, payload.analysisType)
        break
        
      case 'PRECOMPUTE_STYLES':
        result = await precomputeStylesWorker(payload.graph, payload.schemes)
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    postSuccessResponse(id, type, result)
    
  } catch (error) {
    postErrorResponse(id, type, error.message)
  }
})

// Optimized path depth calculation for worker
async function calculatePathDepthsWorker(
  graph: SerializableGraph,
  onProgress: (progress: number) => void
): Promise<Record<string, number>> {
  const depths: Record<string, number> = {}
  const visited = new Set<string>()
  const queue: Array<{nodeId: string, depth: number}> = []
  
  // Find all entry points
  const entryPoints = graph.nodes.filter(node => node.isEntryPoint)
  
  // Initialize queue with entry points
  for (const entryPoint of entryPoints) {
    queue.push({ nodeId: entryPoint.id, depth: 0 })
    depths[entryPoint.id] = 0
  }
  
  let processed = 0
  const total = graph.nodes.length
  
  // BFS traversal
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!
    
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    processed++
    
    // Report progress periodically
    if (processed % 50 === 0) {
      onProgress(processed / total)
    }
    
    // Yield to prevent blocking worker
    if (processed % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    // Find outgoing edges
    const outgoingEdges = graph.edges.filter(edge => edge.source === nodeId)
    
    for (const edge of outgoingEdges) {
      const targetDepth = depth + 1
      const currentDepth = depths[edge.target] ?? Infinity
      
      if (targetDepth < currentDepth) {
        depths[edge.target] = targetDepth
        queue.push({ nodeId: edge.target, depth: targetDepth })
      }
    }
  }
  
  onProgress(1.0)
  return depths
}
```

## Worker Pool Management

### Dynamic Worker Scaling
```typescript
private initializeWorkerPool(maxWorkers?: number): WorkerPool {
  const workerCount = maxWorkers || this.calculateOptimalWorkerCount()
  const workers: Worker[] = []
  
  for (let i = 0; i < workerCount; i++) {
    const worker = this.createWorker()
    workers.push(worker)
  }
  
  return {
    workers,
    activeJobs: new Map(),
    jobQueue: [],
    maxWorkers: workerCount,
    roundRobinIndex: 0
  }
}

private calculateOptimalWorkerCount(): number {
  // Use navigator.hardwareConcurrency with reasonable bounds
  const cores = navigator.hardwareConcurrency || 4
  return Math.min(Math.max(cores - 1, 1), 8) // Leave one core for main thread, max 8 workers
}

private createWorker(): Worker {
  const worker = new Worker(
    new URL('../workers/graph-computation-worker.ts', import.meta.url),
    { type: 'module' }
  )
  
  worker.addEventListener('message', this.handleWorkerMessage.bind(this))
  worker.addEventListener('error', this.handleWorkerError.bind(this))
  
  return worker
}
```

### Job Prioritization and Queuing
```typescript
private queueJob(job: WorkerJob): void {
  // Insert job based on priority
  const insertIndex = this.findInsertionIndex(job.priority)
  this.workerPool.jobQueue.splice(insertIndex, 0, job)
  
  // Try to assign to available worker
  this.processJobQueue()
}

private findInsertionIndex(priority: WorkerJob['priority']): number {
  const priorityValues = { immediate: 0, high: 1, normal: 2, low: 3 }
  const jobPriority = priorityValues[priority]
  
  for (let i = 0; i < this.workerPool.jobQueue.length; i++) {
    const queuedPriority = priorityValues[this.workerPool.jobQueue[i].priority]
    if (jobPriority < queuedPriority) {
      return i
    }
  }
  
  return this.workerPool.jobQueue.length
}
```

## Performance Requirements
- **Worker Initialization**: <100ms for worker pool setup
- **Job Assignment**: <5ms for worker selection and message posting
- **Memory Isolation**: Workers use separate memory space
- **Graceful Degradation**: Fallback to main thread when workers unavailable

## Implementation Steps
1. Create `GraphWorkerManager` class with worker pool
2. Implement graph computation worker
3. Add job prioritization and queuing system
4. Create data serialization for worker communication
5. Implement fallback mechanisms for non-worker environments
6. Add progress reporting from workers
7. Create worker lifecycle management
8. Add comprehensive error handling

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] All heavy computations run in Web Workers
- [ ] Main thread remains responsive during computations
- [ ] Worker pool scales based on hardware capabilities
- [ ] Job prioritization works correctly
- [ ] Progress reporting provides meaningful updates

### ✅ Performance Requirements
- [ ] UI remains responsive (no blocking >16ms) during heavy operations
- [ ] Worker operations complete within expected timeframes
- [ ] Memory usage isolated between main thread and workers
- [ ] Parallel execution utilizes multiple CPU cores effectively
- [ ] Worker initialization overhead <100ms

### ✅ Compatibility & Fallback
- [ ] Graceful fallback when Web Workers unavailable
- [ ] Works across all supported browsers
- [ ] Handles worker failures without crashing main app
- [ ] Data serialization works correctly for all graph types
- [ ] Error reporting provides meaningful debugging information

### ✅ Resource Management
- [ ] Worker pool size adapts to hardware capabilities
- [ ] Workers clean up properly on termination
- [ ] Memory leaks prevented in both workers and main thread
- [ ] Job queue prevents worker overload
- [ ] Proper cleanup on component unmount

## Testing Strategy

### Unit Tests
```typescript
describe('GraphWorkerManager', () => {
  test('should maintain UI responsiveness during heavy computation', async () => {
    const manager = new GraphWorkerManager()
    let frameDrops = 0
    const targetFrameTime = 16.67 // 60fps
    
    // Monitor frame timing
    const startMonitoring = () => {
      let lastFrame = performance.now()
      
      const checkFrame = () => {
        const now = performance.now()
        const frameTime = now - lastFrame
        
        if (frameTime > targetFrameTime * 2) {
          frameDrops++
        }
        
        lastFrame = now
        if (frameDrops < 100) { // Continue monitoring
          requestAnimationFrame(checkFrame)
        }
      }
      
      requestAnimationFrame(checkFrame)
    }
    
    startMonitoring()
    
    // Execute heavy computation
    await manager.calculatePathDepths(largeGraph)
    
    expect(frameDrops).toBeLessThan(5) // Allow minimal frame drops
  })
  
  test('should utilize multiple workers for parallel processing', async () => {
    const manager = new GraphWorkerManager({ maxWorkers: 4 })
    
    // Start multiple jobs simultaneously
    const jobs = [
      manager.calculatePathDepths(graph1),
      manager.optimizeLayout('fcose', nodes, edges, params),
      manager.buildIndexes(graph2),
      manager.analyzeGraph(graph3, 'connectivity')
    ]
    
    const start = performance.now()
    await Promise.all(jobs)
    const parallelTime = performance.now() - start
    
    // Compare to sequential execution
    const sequentialStart = performance.now()
    await manager.calculatePathDepths(graph1)
    await manager.optimizeLayout('fcose', nodes, edges, params)
    await manager.buildIndexes(graph2)
    await manager.analyzeGraph(graph3, 'connectivity')
    const sequentialTime = performance.now() - sequentialStart
    
    expect(parallelTime * 2).toBeLessThan(sequentialTime) // At least 2x speedup
  })
  
  test('should fallback gracefully when workers unavailable', async () => {
    // Mock worker unavailability
    const originalWorker = window.Worker
    delete window.Worker
    
    const manager = new GraphWorkerManager()
    
    // Should still work via fallback
    const result = await manager.calculatePathDepths(testGraph)
    expect(result).toBeDefined()
    expect(result.size).toBeGreaterThan(0)
    
    // Restore Worker
    window.Worker = originalWorker
  })
})
```

### Performance Tests
```typescript
describe('Worker Performance', () => {
  test('should demonstrate significant speedup for CPU-intensive tasks', async () => {
    const largeGraph = generateGraph(1000)
    
    // Time main thread computation
    const mainThreadStart = performance.now()
    const mainResult = await mainThreadPathCalculation(largeGraph)
    const mainThreadTime = performance.now() - mainThreadStart
    
    // Time worker computation
    const workerStart = performance.now()
    const workerResult = await manager.calculatePathDepths(largeGraph)
    const workerTime = performance.now() - workerStart
    
    // Results should be identical
    expect(workerResult).toEqual(mainResult)
    
    // Worker should maintain UI responsiveness
    expect(workerTime).toBeLessThan(mainThreadTime * 1.5) // Allow some overhead
  })
})
```

### Integration Tests
- Test with all graph computation types
- Verify worker pool behavior under load
- Cross-browser compatibility testing

## Dependencies
- **Blocked by**: Phase 1 completion (SerializableGraph types)
- **Blocks**: None (performance enhancement)
- **Related**: Web Workers API, transferable objects

## Deliverables
1. `/lib/graph-worker-manager.ts` - Main worker management
2. `/workers/graph-computation-worker.ts` - Worker implementation
3. `/lib/types/worker-types.ts` - Worker communication types
4. `/tests/graph-worker-manager.test.ts` - Comprehensive test suite
5. Worker performance analysis and optimization guide
6. Browser compatibility documentation

## Risk Mitigation
- **Browser Support**: Comprehensive fallback for non-worker environments
- **Data Serialization**: Careful handling of complex object serialization
- **Memory Usage**: Monitor worker memory consumption
- **Error Handling**: Robust error recovery and reporting

## Success Metrics
- **UI Responsiveness**: Zero frame drops during heavy computations
- **Parallel Speedup**: 2x+ improvement for multi-core systems
- **Memory Isolation**: No memory leaks in main thread during worker operations
- **Compatibility**: 100% functionality in fallback mode