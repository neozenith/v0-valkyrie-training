# Task 4.1: Implement Performance Testing Suite

## Overview
Create a comprehensive performance testing framework that validates all optimization targets, detects regressions, and provides automated benchmarking for the Exercise Graph Visualizer.

## Context
Performance optimizations need continuous validation to prevent regressions and ensure targets are met. This task creates an automated testing suite that monitors performance metrics and provides detailed benchmarking.

## Technical Requirements

### Core Performance Testing Interface
```typescript
interface PerformanceTest {
  name: string
  description: string
  target: PerformanceTarget
  setup: () => Promise<TestContext>
  execute: (context: TestContext) => Promise<PerformanceResult>
  teardown: (context: TestContext) => Promise<void>
  category: 'loading' | 'interaction' | 'memory' | 'rendering'
}

interface PerformanceTarget {
  metric: 'time' | 'memory' | 'fps' | 'operations'
  threshold: number
  unit: 'ms' | 'mb' | 'fps' | 'ops/sec'
  tolerance: number // Percentage tolerance for flaky tests
}

interface PerformanceResult {
  metric: string
  value: number
  unit: string
  passed: boolean
  details: Record<string, any>
  timestamp: number
  environment: TestEnvironment
}

interface TestEnvironment {
  browser: string
  device: 'desktop' | 'mobile' | 'tablet'
  cpuSlowdown?: number
  networkThrottling?: 'fast3g' | 'slow3g' | 'offline'
}

interface BenchmarkSuite {
  tests: PerformanceTest[]
  baseline: PerformanceBaseline
  environment: TestEnvironment
  iterations: number
}
```

### Implementation Location
- **File**: `/tests/performance/performance-test-suite.ts`
- **Integration**: CI/CD pipeline and development testing

### Core Performance Test Suite
```typescript
class PerformanceTestSuite {
  private baseline: PerformanceBaseline
  private results: PerformanceResult[] = []
  
  constructor(baseline?: PerformanceBaseline) {
    this.baseline = baseline || this.loadBaseline()
  }
  
  async runSuite(tests: PerformanceTest[]): Promise<PerformanceSummary> {
    const summary: PerformanceSummary = {
      total: tests.length,
      passed: 0,
      failed: 0,
      regressions: 0,
      improvements: 0,
      results: []
    }
    
    for (const test of tests) {
      const result = await this.runPerformanceTest(test)
      summary.results.push(result)
      
      if (result.passed) {
        summary.passed++
      } else {
        summary.failed++
      }
      
      this.analyzeRegression(result, summary)
    }
    
    return summary
  }
  
  private async runPerformanceTest(test: PerformanceTest): Promise<PerformanceResult> {
    const iterations = 5 // Multiple runs for statistical significance
    const measurements: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const context = await test.setup()
      
      try {
        // Warm up
        await test.execute(context)
        
        // Actual measurement
        const start = performance.now()
        await test.execute(context)
        const duration = performance.now() - start
        
        measurements.push(duration)
        
      } finally {
        await test.teardown(context)
      }
      
      // Cool down between iterations
      await this.cooldown()
    }
    
    const result = this.calculateStatistics(measurements, test)
    this.results.push(result)
    
    return result
  }
  
  private calculateStatistics(
    measurements: number[],
    test: PerformanceTest
  ): PerformanceResult {
    const median = this.calculateMedian(measurements)
    const mean = measurements.reduce((a, b) => a + b) / measurements.length
    const stdDev = this.calculateStandardDeviation(measurements, mean)
    
    const passed = median <= test.target.threshold * (1 + test.target.tolerance / 100)
    
    return {
      metric: test.name,
      value: median,
      unit: test.target.unit,
      passed,
      details: {
        mean,
        median,
        stdDev,
        measurements,
        target: test.target.threshold
      },
      timestamp: Date.now(),
      environment: this.getCurrentEnvironment()
    }
  }
}
```

## Specific Performance Tests

### 1. Loading Performance Tests
```typescript
const loadingTests: PerformanceTest[] = [
  {
    name: 'initial-load-500-exercises',
    description: 'Time to load 500 exercises from cold start',
    target: { metric: 'time', threshold: 2000, unit: 'ms', tolerance: 10 },
    category: 'loading',
    
    async setup() {
      return {
        graph: generateTestGraph(500),
        config: getDefaultConfig()
      }
    },
    
    async execute(context) {
      const component = new ExerciseGraphVisualizer()
      const start = performance.now()
      await component.loadGraph(context.graph, context.config)
      return { duration: performance.now() - start }
    },
    
    async teardown(context) {
      context.component?.destroy()
    }
  },
  
  {
    name: 'configuration-change-speed',
    description: 'Time to apply configuration changes',
    target: { metric: 'time', threshold: 200, unit: 'ms', tolerance: 15 },
    category: 'interaction',
    
    async setup() {
      const component = new ExerciseGraphVisualizer()
      const graph = generateTestGraph(500)
      await component.loadGraph(graph, getDefaultConfig())
      return { component, graph }
    },
    
    async execute(context) {
      const newConfig = { ...getDefaultConfig(), colorScheme: 'equipment' }
      const start = performance.now()
      await context.component.updateConfiguration(newConfig)
      return { duration: performance.now() - start }
    },
    
    async teardown(context) {
      context.component?.destroy()
    }
  }
]
```

### 2. Memory Performance Tests
```typescript
const memoryTests: PerformanceTest[] = [
  {
    name: 'memory-usage-500-exercises',
    description: 'Memory consumption for 500 exercise graph',
    target: { metric: 'memory', threshold: 100, unit: 'mb', tolerance: 20 },
    category: 'memory',
    
    async setup() {
      // Force garbage collection before test
      if (window.gc) window.gc()
      const baseline = this.getMemoryUsage()
      return { baseline }
    },
    
    async execute(context) {
      const component = new ExerciseGraphVisualizer()
      const graph = generateTestGraph(500)
      await component.loadGraph(graph, getDefaultConfig())
      
      const memoryUsage = this.getMemoryUsage()
      return { 
        memoryDelta: memoryUsage.usedJSHeapSize - context.baseline.usedJSHeapSize 
      }
    },
    
    async teardown(context) {
      context.component?.destroy()
      if (window.gc) window.gc()
    }
  },
  
  {
    name: 'memory-leak-detection',
    description: 'Detect memory leaks during repeated operations',
    target: { metric: 'memory', threshold: 10, unit: 'mb', tolerance: 5 },
    category: 'memory',
    
    async setup() {
      if (window.gc) window.gc()
      return { initialMemory: this.getMemoryUsage() }
    },
    
    async execute(context) {
      // Perform 10 load/destroy cycles
      for (let i = 0; i < 10; i++) {
        const component = new ExerciseGraphVisualizer()
        await component.loadGraph(generateTestGraph(100), getDefaultConfig())
        component.destroy()
      }
      
      if (window.gc) window.gc()
      
      const finalMemory = this.getMemoryUsage()
      return {
        memoryGrowth: finalMemory.usedJSHeapSize - context.initialMemory.usedJSHeapSize
      }
    }
  }
]
```

### 3. Rendering Performance Tests
```typescript
const renderingTests: PerformanceTest[] = [
  {
    name: 'frame-rate-during-interaction',
    description: 'Maintain 60fps during user interactions',
    target: { metric: 'fps', threshold: 55, unit: 'fps', tolerance: 10 },
    category: 'rendering',
    
    async setup() {
      const component = new ExerciseGraphVisualizer()
      await component.loadGraph(generateTestGraph(500), getDefaultConfig())
      return { component, frameCount: 0, totalFrameTime: 0 }
    },
    
    async execute(context) {
      return new Promise(resolve => {
        let lastFrame = performance.now()
        let frameCount = 0
        let totalFrameTime = 0
        
        const measureFrames = () => {
          const now = performance.now()
          const frameTime = now - lastFrame
          frameCount++
          totalFrameTime += frameTime
          lastFrame = now
          
          if (frameCount < 120) { // Measure for 2 seconds at 60fps
            requestAnimationFrame(measureFrames)
          } else {
            const avgFps = 1000 / (totalFrameTime / frameCount)
            resolve({ fps: avgFps })
          }
        }
        
        // Start interaction simulation
        this.simulateUserInteraction(context.component)
        requestAnimationFrame(measureFrames)
      })
    },
    
    private simulateUserInteraction(component: ExerciseGraphVisualizer) {
      // Simulate rapid configuration changes
      const configs = [
        { colorScheme: 'difficulty' },
        { colorScheme: 'equipment' },
        { layout: 'hierarchical' },
        { layout: 'fcose' }
      ]
      
      let configIndex = 0
      const changeConfig = () => {
        component.updateConfiguration(configs[configIndex % configs.length])
        configIndex++
        setTimeout(changeConfig, 500)
      }
      
      changeConfig()
    }
  }
]
```

## Automated Benchmarking

### CI Integration
```typescript
interface CIPerformanceConfig {
  baseline: string // Git commit or version
  tolerance: number
  failOnRegression: boolean
  reportFormat: 'json' | 'html' | 'markdown'
}

class CIPerformanceRunner {
  async runInCI(config: CIPerformanceConfig): Promise<void> {
    const suite = new PerformanceTestSuite()
    const allTests = [...loadingTests, ...memoryTests, ...renderingTests]
    
    const summary = await suite.runSuite(allTests)
    
    // Generate reports
    await this.generateReport(summary, config.reportFormat)
    
    // Check for regressions
    if (config.failOnRegression && summary.regressions > 0) {
      throw new Error(`Performance regression detected: ${summary.regressions} tests`)
    }
    
    // Update baseline if all tests pass
    if (summary.failed === 0) {
      await this.updateBaseline(summary)
    }
  }
  
  private async generateReport(
    summary: PerformanceSummary,
    format: 'json' | 'html' | 'markdown'
  ): Promise<void> {
    switch (format) {
      case 'json':
        await writeFile('performance-report.json', JSON.stringify(summary, null, 2))
        break
      case 'html':
        await this.generateHTMLReport(summary)
        break
      case 'markdown':
        await this.generateMarkdownReport(summary)
        break
    }
  }
}
```

## Performance Requirements
- **Test Execution**: Complete suite runs in <5 minutes
- **Statistical Accuracy**: 5 iterations minimum for stable results
- **Regression Detection**: 95% confidence in identifying true regressions
- **Report Generation**: <30 seconds for all formats

## Implementation Steps
1. Create `PerformanceTestSuite` class with measurement framework
2. Implement loading performance tests
3. Add memory leak detection tests
4. Create rendering/FPS measurement tests
5. Build automated regression detection
6. Integrate with CI/CD pipeline
7. Add performance report generation
8. Create baseline management system

## Acceptance Criteria

### ✅ Test Coverage
- [ ] All optimization targets have corresponding performance tests
- [ ] Loading, memory, and rendering performance measured
- [ ] Edge cases and stress scenarios included
- [ ] Cross-browser compatibility testing
- [ ] Mobile performance validation

### ✅ Statistical Reliability
- [ ] Multiple iterations provide stable measurements
- [ ] Statistical significance calculated for results
- [ ] Outlier detection and handling implemented
- [ ] Confidence intervals reported for measurements
- [ ] Baseline comparison with trend analysis

### ✅ Automation & CI Integration
- [ ] Tests run automatically in CI/CD pipeline
- [ ] Regression detection triggers build failures
- [ ] Performance reports generated automatically
- [ ] Baseline updates managed automatically
- [ ] Test results archived for historical analysis

### ✅ Reporting & Analysis
- [ ] Clear performance reports in multiple formats
- [ ] Trend analysis shows performance over time
- [ ] Regression identification with root cause hints
- [ ] Performance budget tracking and alerts
- [ ] Detailed timing breakdown for optimization guidance

## Testing Strategy

### Unit Tests
```typescript
describe('PerformanceTestSuite', () => {
  test('should detect performance regressions accurately', async () => {
    const mockBaseline = {
      'test1': { median: 100, threshold: 150 },
      'test2': { median: 200, threshold: 250 }
    }
    
    const suite = new PerformanceTestSuite(mockBaseline)
    
    // Simulate regression
    const mockTest: PerformanceTest = {
      name: 'test1',
      target: { threshold: 150, tolerance: 10 },
      execute: async () => ({ duration: 180 }) // 20% regression
    }
    
    const result = await suite.runPerformanceTest(mockTest)
    expect(result.passed).toBe(false)
    expect(suite.isRegression(result)).toBe(true)
  })
  
  test('should handle statistical variance correctly', async () => {
    const measurements = [98, 102, 99, 101, 100] // Low variance
    const stats = suite.calculateStatistics(measurements, mockTest)
    
    expect(stats.details.stdDev).toBeLessThan(2)
    expect(stats.value).toBeCloseTo(100, 1) // Median should be ~100
  })
  
  test('should generate accurate performance reports', async () => {
    const summary = await suite.runSuite(performanceTests)
    const report = await suite.generateReport(summary, 'json')
    
    expect(report).toContain('total')
    expect(report).toContain('passed')
    expect(report).toContain('regressions')
  })
})
```

### Integration Tests
- Test with real graph data and configurations
- Verify CI integration works correctly
- Cross-browser performance validation

## Dependencies
- **Blocked by**: Phase 1-3 completion (optimizations to test)
- **Blocks**: None (testing infrastructure)
- **Related**: CI/CD pipeline, performance monitoring tools

## Deliverables
1. `/tests/performance/performance-test-suite.ts` - Core testing framework
2. `/tests/performance/loading-tests.ts` - Loading performance tests
3. `/tests/performance/memory-tests.ts` - Memory performance tests
4. `/tests/performance/rendering-tests.ts` - Rendering performance tests
5. CI integration scripts and configuration
6. Performance baseline data and management tools
7. Automated reporting templates

## Risk Mitigation
- **Test Flakiness**: Statistical methods and multiple iterations
- **Environment Variance**: Baseline adjustment for different environments
- **CI Performance**: Parallel test execution and caching
- **Maintenance**: Automated baseline updates and test validation

## Success Metrics
- **Test Reliability**: <5% false positive regression detection
- **Coverage**: 100% of performance targets validated
- **CI Integration**: <5 minute test execution in pipeline
- **Trend Analysis**: Clear performance progression tracking