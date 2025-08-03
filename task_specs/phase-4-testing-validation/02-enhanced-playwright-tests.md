# Task 4.2: Implement Enhanced Playwright Tests

## Overview
Expand the existing Playwright test suite to comprehensively validate all optimization features, performance characteristics, and edge cases for the Exercise Graph Visualizer.

## Context
Current Playwright tests cover basic functionality. With performance optimizations implemented, we need comprehensive end-to-end tests that validate optimization effectiveness, user experience improvements, and edge case handling.

## Technical Requirements

### Enhanced Test Architecture
```typescript
interface OptimizationTestCase {
  name: string
  description: string
  category: 'performance' | 'functionality' | 'regression' | 'edge-case'
  setup: PlaywrightSetup
  assertions: PlaywrightAssertion[]
  cleanup: PlaywrightCleanup
  performance?: PerformanceExpectation
}

interface PerformanceExpectation {
  maxLoadTime: number
  maxInteractionTime: number
  minFPS: number
  maxMemoryUsage: number
}

interface PlaywrightSetup {
  graphSize: number
  initialConfig: GraphConfiguration
  networkConditions?: 'fast' | 'slow' | 'offline'
  deviceType?: 'desktop' | 'mobile' | 'tablet'
}

interface PlaywrightAssertion {
  type: 'visual' | 'performance' | 'functional' | 'accessibility'
  target: string
  expectation: any
  timeout?: number
}
```

### Test Categories Implementation

### 1. Performance Validation Tests
```typescript
// Test optimization effectiveness
test.describe('Performance Optimizations', () => {
  test('should load large graphs quickly with progressive loading', async ({ page }) => {
    // Generate large test dataset
    await page.route('**/api/exercises/large', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(generateLargeExerciseSet(1000))
      })
    })
    
    await page.goto('/dev/graph-visualizer')
    
    // Monitor loading performance
    const startTime = Date.now()
    
    // Load large dataset
    await page.selectOption('[data-testid="dataset-selector"]', 'large')
    
    // Should show core content quickly
    await expect(page.locator('[data-testid="graph-container"]')).toBeVisible({ timeout: 1000 })
    
    const coreLoadTime = Date.now() - startTime
    expect(coreLoadTime).toBeLessThan(500) // Core content in <500ms
    
    // Wait for full loading
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: 5000 })
    
    const totalLoadTime = Date.now() - startTime
    expect(totalLoadTime).toBeLessThan(3000) // Full load in <3s
  })
  
  test('should switch configurations instantly with caching', async ({ page }) => {
    await page.goto('/dev/graph-visualizer')
    await waitForGraphLoad(page)
    
    // First color scheme switch (cache miss)
    const firstSwitchStart = Date.now()
    await page.click('[data-testid="color-scheme-difficulty"]')
    await waitForGraphUpdate(page)
    const firstSwitchTime = Date.now() - firstSwitchStart
    
    // Switch to another scheme
    await page.click('[data-testid="color-scheme-equipment"]')
    await waitForGraphUpdate(page)
    
    // Switch back to difficulty (cache hit)
    const cachedSwitchStart = Date.now()
    await page.click('[data-testid="color-scheme-difficulty"]')
    await waitForGraphUpdate(page)
    const cachedSwitchTime = Date.now() - cachedSwitchStart
    
    // Cached switch should be significantly faster
    expect(cachedSwitchTime).toBeLessThan(50) // <50ms for cached
    expect(cachedSwitchTime * 4).toBeLessThan(firstSwitchTime) // At least 4x faster
  })
  
  test('should maintain 60fps during interactions', async ({ page }) => {
    await page.goto('/dev/graph-visualizer')
    await waitForGraphLoad(page)
    
    // Monitor frame rate during interaction
    const fpsData = await page.evaluate(async () => {
      const frameRates: number[] = []
      let lastFrame = performance.now()
      let frameCount = 0
      
      const measureFrames = () => {
        const now = performance.now()
        const frameTime = now - lastFrame
        const fps = 1000 / frameTime
        frameRates.push(fps)
        lastFrame = now
        frameCount++
        
        if (frameCount < 180) { // 3 seconds of measurement
          requestAnimationFrame(measureFrames)
        }
      }
      
      // Start frame measurement
      requestAnimationFrame(measureFrames)
      
      // Simulate heavy interaction
      const colorSchemes = ['difficulty', 'equipment', 'subgraph', 'movement']
      for (let i = 0; i < 20; i++) {
        const scheme = colorSchemes[i % colorSchemes.length]
        document.querySelector(`[data-testid="color-scheme-${scheme}"]`)?.click()
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      
      // Wait for measurement to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      return frameRates
    })
    
    const averageFPS = fpsData.reduce((a, b) => a + b) / fpsData.length
    const minFPS = Math.min(...fpsData)
    
    expect(averageFPS).toBeGreaterThan(55) // Average >55fps
    expect(minFPS).toBeGreaterThan(45) // No severe drops
  })
})
```

### 2. Incremental Update Validation
```typescript
test.describe('Incremental Updates', () => {
  test('should update only changed elements during configuration changes', async ({ page }) => {
    await page.goto('/dev/graph-visualizer')
    await waitForGraphLoad(page)
    
    // Monitor DOM mutations during color scheme change
    const mutationData = await page.evaluate(async () => {
      let mutationCount = 0
      let addedNodes = 0
      let removedNodes = 0
      let modifiedNodes = 0
      
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutationCount++
          addedNodes += mutation.addedNodes.length
          removedNodes += mutation.removedNodes.length
          if (mutation.type === 'attributes') {
            modifiedNodes++
          }
        })
      })
      
      observer.observe(document.querySelector('[data-testid="graph-container"]'), {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      })
      
      // Change color scheme (should only modify classes, not add/remove nodes)
      document.querySelector('[data-testid="color-scheme-equipment"]')?.click()
      
      // Wait for update
      await new Promise(resolve => setTimeout(resolve, 200))
      
      observer.disconnect()
      
      return { mutationCount, addedNodes, removedNodes, modifiedNodes }
    })
    
    // Should modify existing elements, not add/remove
    expect(mutationData.addedNodes).toBe(0)
    expect(mutationData.removedNodes).toBe(0)
    expect(mutationData.modifiedNodes).toBeGreaterThan(0)
    expect(mutationData.mutationCount).toBeLessThan(100) // Efficient updates
  })
  
  test('should handle rapid configuration changes gracefully', async ({ page }) => {
    await page.goto('/dev/graph-visualizer')
    await waitForGraphLoad(page)
    
    // Rapidly change configurations
    const changes = [
      () => page.click('[data-testid="color-scheme-difficulty"]'),
      () => page.click('[data-testid="color-scheme-equipment"]'),
      () => page.selectOption('[data-testid="layout-selector"]', 'hierarchical'),
      () => page.selectOption('[data-testid="layout-selector"]', 'fcose'),
      () => page.click('[data-testid="equipment-filter-bodyweight"]'),
      () => page.click('[data-testid="equipment-filter-dumbbells"]')
    ]
    
    // Execute changes rapidly
    for (const change of changes) {
      await change()
      await page.waitForTimeout(50) // Very short delay
    }
    
    // Should stabilize without errors
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="graph-container"]')).toBeVisible()
    
    // Final state should be consistent
    await waitForGraphUpdate(page)
    const nodeCount = await page.locator('[data-cy="node"]').count()
    expect(nodeCount).toBeGreaterThan(0)
  })
})
```

### 3. Edge Case and Stress Tests
```typescript
test.describe('Edge Cases and Stress Tests', () => {
  test('should handle empty graphs gracefully', async ({ page }) => {
    await page.route('**/api/exercises', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ exercises: [], subgraphs: {} })
      })
    })
    
    await page.goto('/dev/graph-visualizer')
    
    // Should show appropriate empty state
    await expect(page.locator('[data-testid="empty-graph-message"]')).toBeVisible()
    
    // Controls should still be functional
    await expect(page.locator('[data-testid="color-scheme-difficulty"]')).toBeEnabled()
    
    // Should not crash or show errors
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
  })
  
  test('should handle network failures during loading', async ({ page }) => {
    let requestCount = 0
    
    await page.route('**/api/exercises', route => {
      requestCount++
      if (requestCount <= 2) {
        // Fail first two requests
        route.abort('failed')
      } else {
        // Succeed on third request
        route.fulfill({
          status: 200,
          body: JSON.stringify(generateTestExercises(100))
        })
      }
    })
    
    await page.goto('/dev/graph-visualizer')
    
    // Should eventually load after retries
    await expect(page.locator('[data-testid="graph-container"]')).toBeVisible({ timeout: 10000 })
    
    // Should show retry attempts in UI
    const retryMessages = page.locator('[data-testid="retry-indicator"]')
    await expect(retryMessages).toHaveText(/Retrying/)
  })
  
  test('should handle memory pressure gracefully', async ({ page }) => {
    // Simulate memory pressure by loading very large dataset
    await page.route('**/api/exercises/memory-test', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(generateLargeExerciseSet(5000)) // Very large
      })
    })
    
    await page.goto('/dev/graph-visualizer')
    
    // Load large dataset
    await page.selectOption('[data-testid="dataset-selector"]', 'memory-test')
    
    // Should either load successfully or show memory warning
    const loadSuccess = page.locator('[data-testid="graph-container"]')
    const memoryWarning = page.locator('[data-testid="memory-warning"]')
    
    await expect(loadSuccess.or(memoryWarning)).toBeVisible({ timeout: 15000 })
    
    // Should not crash the browser
    await expect(page.locator('body')).toBeVisible()
  })
})
```

### 4. Cross-Browser and Device Tests
```typescript
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browser => {
    test(`should work correctly in ${browser}`, async ({ page }) => {
      await page.goto('/dev/graph-visualizer')
      await waitForGraphLoad(page)
      
      // Test core functionality
      await page.click('[data-testid="color-scheme-equipment"]')
      await waitForGraphUpdate(page)
      
      await page.selectOption('[data-testid="layout-selector"]', 'hierarchical')
      await waitForGraphUpdate(page)
      
      // Should work without errors
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
      
      // Performance should be acceptable
      const interactionTime = await measureInteractionTime(page)
      expect(interactionTime).toBeLessThan(1000) // <1s for layout change
    })
  })
  
  test('should work on mobile devices', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dev/graph-visualizer')
    await waitForGraphLoad(page)
    
    // Test touch interactions
    await page.tap('[data-testid="color-scheme-difficulty"]')
    await waitForGraphUpdate(page)
    
    // Test mobile-specific UI
    await expect(page.locator('[data-testid="mobile-controls"]')).toBeVisible()
    
    // Should maintain performance on mobile
    const loadTime = await measureLoadTime(page)
    expect(loadTime).toBeLessThan(5000) // Allow more time for mobile
  })
})
```

### 5. Accessibility and UX Tests
```typescript
test.describe('Accessibility and User Experience', () => {
  test('should maintain accessibility during optimizations', async ({ page }) => {
    await page.goto('/dev/graph-visualizer')
    await waitForGraphLoad(page)
    
    // Check for accessibility violations
    const accessibilityViolations = await page.evaluate(async () => {
      // Assuming axe-core is loaded
      const results = await axe.run()
      return results.violations
    })
    
    expect(accessibilityViolations).toHaveLength(0)
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Should activate focused element
    
    // Test screen reader announcements
    const announcements = await page.locator('[aria-live="polite"]').textContent()
    expect(announcements).toContain('Graph updated')
  })
  
  test('should provide clear loading feedback', async ({ page }) => {
    await page.goto('/dev/graph-visualizer')
    
    // Should show loading indicator immediately
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    
    // Should show progress for long operations
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
    
    // Should provide estimated time
    const estimateText = await page.locator('[data-testid="time-estimate"]').textContent()
    expect(estimateText).toMatch(/\d+\s*seconds?/)
    
    // Should hide loading when complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: 10000 })
  })
})
```

## Utility Functions
```typescript
// Common test utilities
async function waitForGraphLoad(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="graph-container"]')).toBeVisible()
  await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden()
}

async function waitForGraphUpdate(page: Page): Promise<void> {
  // Wait for any pending updates to complete
  await page.waitForTimeout(100)
  await page.waitForFunction(() => {
    return !document.querySelector('[data-testid="updating-indicator"]')
  })
}

async function measureInteractionTime(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>(resolve => {
      const start = performance.now()
      
      // Trigger interaction
      document.querySelector('[data-testid="color-scheme-equipment"]')?.click()
      
      // Wait for completion
      const observer = new MutationObserver(() => {
        if (!document.querySelector('[data-testid="updating-indicator"]')) {
          observer.disconnect()
          resolve(performance.now() - start)
        }
      })
      
      observer.observe(document.body, { childList: true, subtree: true })
    })
  })
}

function generateTestExercises(count: number): ExerciseData {
  // Generate test exercise data
  return {
    exercises: Array.from({length: count}, (_, i) => ({
      id: `exercise-${i}`,
      name: `Test Exercise ${i}`,
      equipment: ['bodyweight'],
      difficulty: Math.floor(Math.random() * 5) + 1
    })),
    subgraphs: {}
  }
}
```

## Performance Requirements
- **Test Execution**: Complete suite runs in <10 minutes
- **Reliability**: <2% flaky test rate
- **Coverage**: 95% of optimization features tested
- **Cross-Browser**: All tests pass in Chrome, Firefox, Safari

## Implementation Steps
1. Extend existing Playwright test structure
2. Add performance measurement utilities
3. Implement optimization validation tests
4. Create stress and edge case tests
5. Add cross-browser compatibility tests
6. Implement accessibility validation
7. Create mobile device testing
8. Add visual regression testing

## Acceptance Criteria

### ✅ Optimization Validation
- [ ] All performance optimizations validated through E2E tests
- [ ] Incremental update behavior verified
- [ ] Cache effectiveness demonstrated
- [ ] Progressive loading tested with large datasets
- [ ] Memory usage patterns validated

### ✅ Edge Case Coverage
- [ ] Empty graph handling tested
- [ ] Network failure scenarios covered
- [ ] Memory pressure situations handled
- [ ] Rapid interaction sequences tested
- [ ] Invalid data inputs handled gracefully

### ✅ Cross-Platform Compatibility
- [ ] Tests pass in Chrome, Firefox, Safari
- [ ] Mobile device compatibility verified
- [ ] Touch interaction testing implemented
- [ ] Responsive design validation
- [ ] Performance acceptable across devices

### ✅ User Experience Validation
- [ ] Accessibility requirements met
- [ ] Loading feedback clear and helpful
- [ ] Error states informative
- [ ] Performance feels responsive to users
- [ ] Visual consistency maintained

## Testing Strategy

### Test Organization
```typescript
// Test structure
tests/
├── e2e/
│   ├── optimization/
│   │   ├── performance.spec.ts
│   │   ├── incremental-updates.spec.ts
│   │   └── caching.spec.ts
│   ├── edge-cases/
│   │   ├── empty-graphs.spec.ts
│   │   ├── network-failures.spec.ts
│   │   └── stress-tests.spec.ts
│   ├── cross-browser/
│   │   ├── compatibility.spec.ts
│   │   └── mobile.spec.ts
│   └── accessibility/
│       ├── a11y.spec.ts
│       └── keyboard-navigation.spec.ts
└── utilities/
    ├── graph-helpers.ts
    ├── performance-utils.ts
    └── test-data-generators.ts
```

### Continuous Integration
- Run full suite on all PRs
- Performance regression detection
- Cross-browser testing in CI
- Mobile device testing with cloud services

## Dependencies
- **Blocked by**: Phase 1-3 optimizations (features to test)
- **Blocks**: None (testing infrastructure)
- **Related**: Existing Playwright test suite, CI/CD pipeline

## Deliverables
1. Enhanced Playwright test suite with optimization coverage
2. Performance measurement utilities and helpers
3. Cross-browser and mobile testing infrastructure
4. Edge case and stress test scenarios
5. Accessibility and UX validation tests
6. Visual regression testing setup
7. CI integration and reporting

## Risk Mitigation
- **Test Flakiness**: Robust wait conditions and retry logic
- **Performance Variance**: Statistical methods for performance assertions
- **Browser Differences**: Isolated test environments and standardized conditions
- **Maintenance**: Modular test structure and shared utilities

## Success Metrics
- **Test Coverage**: 95% of optimization features tested
- **Reliability**: <2% flaky test rate
- **Performance Validation**: All targets verified in real browsers
- **Cross-Platform**: 100% compatibility across supported browsers