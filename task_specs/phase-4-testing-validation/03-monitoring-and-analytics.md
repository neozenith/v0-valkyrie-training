# Task 4.3: Implement Monitoring and Analytics

## Overview
Create a comprehensive monitoring and analytics system to track performance metrics, user behavior, and optimization effectiveness in production environments.

## Context
Performance optimizations need continuous monitoring to ensure they're working effectively in real-world conditions. This task implements telemetry, performance monitoring, and analytics to track the success of optimizations and identify areas for improvement.

## Technical Requirements

### Core Monitoring Interface
```typescript
interface PerformanceMetrics {
  // Loading Performance
  initialLoadTime: number
  timeToFirstGraph: number
  timeToInteractive: number
  progressiveLoadingStages: LoadingStage[]
  
  // Interaction Performance
  configurationChangeTime: number
  colorSchemeChangeTime: number
  layoutChangeTime: number
  filterChangeTime: number
  
  // Resource Usage
  memoryUsage: MemoryMetrics
  cpuUsage: number
  networkRequests: NetworkMetrics[]
  
  // User Experience
  frameRate: FrameRateMetrics
  errorRate: number
  userSatisfactionScore?: number
}

interface LoadingStage {
  stage: 'core' | 'secondary' | 'background' | 'complete'
  timestamp: number
  exerciseCount: number
  duration: number
}

interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  heapLimit: number
  external: number
  timestamp: number
}

interface NetworkMetrics {
  url: string
  method: string
  duration: number
  size: number
  cached: boolean
  timestamp: number
}

interface FrameRateMetrics {
  average: number
  minimum: number
  p95: number
  dropCount: number
  measurementPeriod: number
}

interface UserAnalytics {
  sessionId: string
  userId?: string
  graphSize: number
  interactions: UserInteraction[]
  performance: PerformanceMetrics
  errors: ErrorEvent[]
  satisfactionScore?: number
}
```

### Implementation Location
- **File**: `/lib/monitoring/performance-monitor.ts`
- **Analytics**: `/lib/monitoring/analytics-collector.ts`
- **Integration**: Integrated into visualization component

### Core Performance Monitor
```typescript
class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private observers: PerformanceObserver[] = []
  private startTime: number = performance.now()
  
  constructor(private config: MonitoringConfig) {
    this.metrics = this.initializeMetrics()
    this.setupObservers()
  }
  
  startLoadingMeasurement(): void {
    this.startTime = performance.now()
    this.metrics.progressiveLoadingStages = []
  }
  
  recordLoadingStage(
    stage: LoadingStage['stage'],
    exerciseCount: number
  ): void {
    const timestamp = performance.now()
    const duration = timestamp - this.startTime
    
    this.metrics.progressiveLoadingStages.push({
      stage,
      timestamp,
      exerciseCount,
      duration
    })
    
    if (stage === 'core') {
      this.metrics.timeToFirstGraph = duration
    } else if (stage === 'complete') {
      this.metrics.initialLoadTime = duration
      this.metrics.timeToInteractive = duration
    }
  }
  
  measureInteraction<T>(
    interactionType: 'colorScheme' | 'layout' | 'filter' | 'configuration',
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    
    return operation().then(result => {
      const duration = performance.now() - start
      
      switch (interactionType) {
        case 'colorScheme':
          this.metrics.colorSchemeChangeTime = duration
          break
        case 'layout':
          this.metrics.layoutChangeTime = duration
          break
        case 'filter':
          this.metrics.filterChangeTime = duration
          break
        case 'configuration':
          this.metrics.configurationChangeTime = duration
          break
      }
      
      return result
    })
  }
  
  private setupObservers(): void {
    // Memory usage observer
    if ('memory' in performance) {
      setInterval(() => {
        this.recordMemoryUsage()
      }, 5000) // Every 5 seconds
    }
    
    // Frame rate observer
    this.setupFrameRateMonitoring()
    
    // Network observer
    this.setupNetworkMonitoring()
    
    // Long task observer
    this.setupLongTaskObserver()
  }
  
  private setupFrameRateMonitoring(): void {
    let frameCount = 0
    let lastFrame = performance.now()
    let frameRates: number[] = []
    let droppedFrames = 0
    
    const measureFrame = () => {
      const now = performance.now()
      const frameTime = now - lastFrame
      const fps = 1000 / frameTime
      
      frameRates.push(fps)
      frameCount++
      
      if (fps < 30) { // Consider <30fps as dropped
        droppedFrames++
      }
      
      // Calculate metrics every 60 frames (1 second at 60fps)
      if (frameCount >= 60) {
        this.metrics.frameRate = {
          average: frameRates.reduce((a, b) => a + b) / frameRates.length,
          minimum: Math.min(...frameRates),
          p95: this.calculatePercentile(frameRates, 95),
          dropCount: droppedFrames,
          measurementPeriod: frameCount
        }
        
        // Reset for next measurement
        frameRates = []
        frameCount = 0
        droppedFrames = 0
      }
      
      lastFrame = now
      requestAnimationFrame(measureFrame)
    }
    
    requestAnimationFrame(measureFrame)
  }
  
  private setupNetworkMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordNetworkRequest(entry as PerformanceResourceTiming)
          }
        }
      })
      
      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    }
  }
  
  private setupLongTaskObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.recordLongTask(entry as PerformanceLongTaskTiming)
          }
        }
      })
      
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    }
  }
}
```

## Analytics Collection System

### User Behavior Analytics
```typescript
class AnalyticsCollector {
  private sessionData: UserAnalytics
  private interactionBuffer: UserInteraction[] = []
  
  constructor(private endpoint: string) {
    this.sessionData = this.initializeSession()
    this.setupEventListeners()
  }
  
  trackInteraction(
    type: 'colorSchemeChange' | 'layoutChange' | 'filterChange' | 'nodeSelection' | 'graphLoad',
    details: Record<string, any>
  ): void {
    const interaction: UserInteraction = {
      type,
      timestamp: Date.now(),
      details,
      performanceImpact: this.calculatePerformanceImpact()
    }
    
    this.interactionBuffer.push(interaction)
    
    // Batch send interactions
    if (this.interactionBuffer.length >= 10) {
      this.sendInteractions()
    }
  }
  
  trackOptimizationEffectiveness(
    optimization: string,
    before: number,
    after: number,
    metric: string
  ): void {
    const effectiveness = {
      optimization,
      metric,
      improvement: ((before - after) / before) * 100,
      beforeValue: before,
      afterValue: after,
      timestamp: Date.now()
    }
    
    this.sendOptimizationData(effectiveness)
  }
  
  trackError(error: Error, context: string): void {
    const errorEvent: ErrorEvent = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    this.sessionData.errors.push(errorEvent)
    this.sendErrorData(errorEvent)
  }
  
  trackUserSatisfaction(score: number, feedback?: string): void {
    this.sessionData.satisfactionScore = score
    
    this.sendSatisfactionData({
      score,
      feedback,
      sessionDuration: Date.now() - this.sessionData.startTime,
      interactionCount: this.sessionData.interactions.length
    })
  }
  
  private calculatePerformanceImpact(): number {
    // Measure performance impact of the interaction
    const memoryBefore = this.getMemoryUsage()
    
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        const memoryAfter = this.getMemoryUsage()
        const impact = memoryAfter - memoryBefore
        resolve(impact)
      })
    })
  }
}
```

### Real User Monitoring (RUM)
```typescript
class RealUserMonitoring {
  private vitals: WebVitals = {}
  
  constructor() {
    this.setupWebVitals()
    this.setupCustomMetrics()
  }
  
  private setupWebVitals(): void {
    // Core Web Vitals monitoring
    this.observeMetric('LCP', this.onLCP.bind(this))
    this.observeMetric('FID', this.onFID.bind(this))
    this.observeMetric('CLS', this.onCLS.bind(this))
    this.observeMetric('FCP', this.onFCP.bind(this))
    this.observeMetric('TTFB', this.onTTFB.bind(this))
  }
  
  private onLCP(metric: Metric): void {
    this.vitals.LCP = metric.value
    
    // Analyze LCP contributors
    const lcpElement = metric.entries[metric.entries.length - 1]
    this.analyzeLCPElement(lcpElement)
  }
  
  private onFID(metric: Metric): void {
    this.vitals.FID = metric.value
    
    // Track input delay causes
    if (metric.value > 100) { // Poor FID
      this.investigateInputDelay(metric)
    }
  }
  
  private onCLS(metric: Metric): void {
    this.vitals.CLS = metric.value
    
    // Identify layout shift sources
    if (metric.value > 0.1) { // Poor CLS
      this.investigateLayoutShifts(metric)
    }
  }
  
  private setupCustomMetrics(): void {
    // Graph-specific performance metrics
    this.observeCustomMetric('graph-load-time')
    this.observeCustomMetric('configuration-change-time')
    this.observeCustomMetric('interaction-response-time')
  }
  
  private observeCustomMetric(name: string): void {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === name) {
          this.recordCustomMetric(name, entry.duration)
        }
      }
    })
    
    observer.observe({ entryTypes: ['measure'] })
  }
}
```

## Performance Dashboard

### Metrics Visualization
```typescript
interface DashboardMetrics {
  // Performance Trends
  loadTimeTrend: TimeSeriesData[]
  interactionTimeTrend: TimeSeriesData[]
  memoryUsageTrend: TimeSeriesData[]
  
  // Optimization Impact
  optimizationEffectiveness: OptimizationMetric[]
  performanceRegression: RegressionAlert[]
  
  // User Experience
  satisfactionTrend: TimeSeriesData[]
  errorRateTrend: TimeSeriesData[]
  usagePatterns: UsagePattern[]
  
  // System Health
  serverPerformance: ServerMetrics
  clientPerformance: ClientMetrics
  alertStatus: AlertStatus[]
}

interface OptimizationMetric {
  name: string
  targetImprovement: number
  actualImprovement: number
  impactScore: number
  rolloutPercentage: number
}

interface RegressionAlert {
  metric: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  threshold: number
  currentValue: number
  trend: 'improving' | 'degrading' | 'stable'
  detectedAt: Date
}

class PerformanceDashboard {
  async generateReport(timeRange: TimeRange): Promise<DashboardMetrics> {
    const metrics = await this.aggregateMetrics(timeRange)
    
    return {
      loadTimeTrend: this.calculateTrend(metrics, 'loadTime'),
      interactionTimeTrend: this.calculateTrend(metrics, 'interactionTime'),
      memoryUsageTrend: this.calculateTrend(metrics, 'memoryUsage'),
      
      optimizationEffectiveness: this.analyzeOptimizations(metrics),
      performanceRegression: this.detectRegressions(metrics),
      
      satisfactionTrend: this.calculateTrend(metrics, 'satisfaction'),
      errorRateTrend: this.calculateTrend(metrics, 'errorRate'),
      usagePatterns: this.analyzeUsagePatterns(metrics),
      
      serverPerformance: await this.getServerMetrics(timeRange),
      clientPerformance: this.aggregateClientMetrics(metrics),
      alertStatus: this.getActiveAlerts()
    }
  }
  
  private analyzeOptimizations(metrics: RawMetrics[]): OptimizationMetric[] {
    const optimizations = [
      'progressive-loading',
      'incremental-updates',
      'layout-caching',
      'style-optimization'
    ]
    
    return optimizations.map(opt => {
      const beforeData = metrics.filter(m => m.timestamp < opt.deploymentDate)
      const afterData = metrics.filter(m => m.timestamp >= opt.deploymentDate)
      
      const beforeAvg = this.calculateAverage(beforeData, opt.targetMetric)
      const afterAvg = this.calculateAverage(afterData, opt.targetMetric)
      
      const actualImprovement = ((beforeAvg - afterAvg) / beforeAvg) * 100
      
      return {
        name: opt,
        targetImprovement: opt.target,
        actualImprovement,
        impactScore: this.calculateImpactScore(actualImprovement, opt.target),
        rolloutPercentage: opt.rolloutPercentage
      }
    })
  }
  
  private detectRegressions(metrics: RawMetrics[]): RegressionAlert[] {
    const alerts: RegressionAlert[] = []
    const thresholds = {
      loadTime: 3000, // 3 seconds
      interactionTime: 200, // 200ms
      memoryUsage: 100 * 1024 * 1024, // 100MB
      errorRate: 0.01 // 1%
    }
    
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const recent = this.getRecentMetrics(metrics, metric, '1h')
      const baseline = this.getBaselineMetrics(metrics, metric, '7d')
      
      const recentAvg = this.calculateAverage(recent, metric)
      const baselineAvg = this.calculateAverage(baseline, metric)
      
      if (recentAvg > threshold || recentAvg > baselineAvg * 1.2) {
        alerts.push({
          metric,
          severity: this.calculateSeverity(recentAvg, threshold, baselineAvg),
          threshold,
          currentValue: recentAvg,
          trend: this.calculateTrend(recent, metric),
          detectedAt: new Date()
        })
      }
    }
    
    return alerts
  }
}
```

## Alerting System
```typescript
interface Alert {
  id: string
  type: 'performance' | 'error' | 'availability' | 'user-experience'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metric: string
  threshold: number
  currentValue: number
  timestamp: Date
  acknowledged: boolean
}

class AlertingSystem {
  private alerts: Map<string, Alert> = new Map()
  private subscribers: AlertSubscriber[] = []
  
  setupAlerts(): void {
    // Performance alerts
    this.createAlert('load-time-high', {
      metric: 'loadTime',
      threshold: 3000,
      condition: 'greater-than',
      severity: 'high',
      message: 'Graph load time exceeds 3 seconds'
    })
    
    this.createAlert('interaction-time-high', {
      metric: 'interactionTime',
      threshold: 200,
      condition: 'greater-than',
      severity: 'medium',
      message: 'Interaction response time exceeds 200ms'
    })
    
    this.createAlert('memory-usage-high', {
      metric: 'memoryUsage',
      threshold: 100 * 1024 * 1024,
      condition: 'greater-than',
      severity: 'high',
      message: 'Memory usage exceeds 100MB'
    })
    
    // Error rate alerts
    this.createAlert('error-rate-high', {
      metric: 'errorRate',
      threshold: 0.05,
      condition: 'greater-than',
      severity: 'critical',
      message: 'Error rate exceeds 5%'
    })
    
    // User experience alerts
    this.createAlert('satisfaction-low', {
      metric: 'satisfactionScore',
      threshold: 3.0,
      condition: 'less-than',
      severity: 'medium',
      message: 'User satisfaction score below 3.0'
    })
  }
  
  checkMetrics(metrics: PerformanceMetrics): void {
    for (const alert of this.alerts.values()) {
      const currentValue = this.getMetricValue(metrics, alert.metric)
      
      if (this.conditionMet(currentValue, alert.threshold, alert.condition)) {
        this.triggerAlert(alert, currentValue)
      } else {
        this.resolveAlert(alert.id)
      }
    }
  }
  
  private triggerAlert(alert: AlertConfig, currentValue: number): void {
    const alertInstance: Alert = {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      metric: alert.metric,
      threshold: alert.threshold,
      currentValue,
      timestamp: new Date(),
      acknowledged: false
    }
    
    this.alerts.set(alert.id, alertInstance)
    this.notifySubscribers(alertInstance)
  }
}
```

## Performance Requirements
- **Data Collection**: <1% overhead on application performance
- **Real-time Updates**: Metrics updated within 30 seconds
- **Alert Latency**: Critical alerts trigger within 1 minute
- **Data Retention**: 90 days of detailed metrics, 1 year of aggregated data

## Implementation Steps
1. Create `PerformanceMonitor` class with comprehensive metrics
2. Implement `AnalyticsCollector` for user behavior tracking
3. Add Real User Monitoring with Web Vitals
4. Create performance dashboard and visualization
5. Implement alerting system with intelligent thresholds
6. Add data aggregation and retention policies
7. Create performance regression detection
8. Integrate with external monitoring tools

## Acceptance Criteria

### ✅ Metrics Collection
- [ ] All performance metrics captured accurately
- [ ] User behavior analytics implemented
- [ ] Real-time monitoring operational
- [ ] Minimal performance overhead (<1%)
- [ ] Cross-browser compatibility maintained

### ✅ Performance Analysis
- [ ] Optimization effectiveness measured and reported
- [ ] Performance regression detection functional
- [ ] Trend analysis provides actionable insights
- [ ] Comparison with baseline metrics available
- [ ] Statistical significance calculated for changes

### ✅ Alerting and Monitoring
- [ ] Intelligent alerting system operational
- [ ] Critical performance issues detected quickly
- [ ] False positive rate minimized (<5%)
- [ ] Alert escalation procedures defined
- [ ] Dashboard provides clear visual insights

### ✅ Data Management
- [ ] Data retention policies implemented
- [ ] Historical data analysis available
- [ ] Performance reports generated automatically
- [ ] Data export capabilities functional
- [ ] Privacy compliance maintained

## Testing Strategy

### Unit Tests
```typescript
describe('PerformanceMonitor', () => {
  test('should accurately measure loading performance', async () => {
    const monitor = new PerformanceMonitor()
    
    monitor.startLoadingMeasurement()
    await simulateLoading()
    monitor.recordLoadingStage('core', 100)
    
    expect(monitor.metrics.timeToFirstGraph).toBeGreaterThan(0)
    expect(monitor.metrics.progressiveLoadingStages).toHaveLength(1)
  })
  
  test('should detect performance regressions', () => {
    const monitor = new PerformanceMonitor()
    const alerting = new AlertingSystem()
    
    const metrics = {
      loadTime: 5000, // Above threshold
      interactionTime: 150,
      memoryUsage: 50 * 1024 * 1024
    }
    
    alerting.checkMetrics(metrics)
    
    const alerts = alerting.getActiveAlerts()
    expect(alerts).toContainEqual(
      expect.objectContaining({
        metric: 'loadTime',
        severity: 'high'
      })
    )
  })
})
```

### Integration Tests
- Test with real application performance data
- Verify dashboard accuracy with known metrics
- Validate alerting system with controlled scenarios

## Dependencies
- **Blocked by**: Phase 1-3 optimizations (features to monitor)
- **Blocks**: None (monitoring infrastructure)
- **Related**: Performance testing suite, production deployment

## Deliverables
1. `/lib/monitoring/performance-monitor.ts` - Core monitoring system
2. `/lib/monitoring/analytics-collector.ts` - User analytics
3. `/lib/monitoring/real-user-monitoring.ts` - RUM implementation
4. `/lib/monitoring/alerting-system.ts` - Alert management
5. Performance dashboard and visualization tools
6. Monitoring configuration and deployment guide
7. Alert runbook and escalation procedures

## Risk Mitigation
- **Performance Impact**: Minimal overhead monitoring and sampling
- **Data Privacy**: Anonymized data collection and GDPR compliance
- **Alert Fatigue**: Intelligent thresholds and alert correlation
- **Data Accuracy**: Validation against known performance benchmarks

## Success Metrics
- **Monitoring Coverage**: 100% of critical performance metrics tracked
- **Alert Accuracy**: >95% of alerts are actionable
- **Performance Insight**: Clear visibility into optimization effectiveness
- **User Experience**: Improved satisfaction scores through proactive monitoring