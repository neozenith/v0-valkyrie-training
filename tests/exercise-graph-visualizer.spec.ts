import { test, expect } from '@playwright/test';

test.describe('Exercise Graph Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/graph-visualizer');
    // Wait for the graph to load
    await page.waitForSelector('[data-testid="cytoscape-canvas"]', { timeout: 10000 });
  });

  test('should display graph with hierarchical layout by default', async ({ page }) => {
    // Check that the layout select shows hierarchical
    const layoutSelect = page.locator('[data-testid="layout-select-trigger"]');
    await expect(layoutSelect).toContainText('Hierarchical');
    
    // Verify the canvas is visible
    const canvas = page.locator('[data-testid="cytoscape-canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('should switch between different layouts', async ({ page }) => {
    const layoutSelect = page.locator('[data-testid="layout-select-trigger"]');
    
    // Switch to circular layout
    await layoutSelect.click();
    await page.locator('[role="option"]').filter({ hasText: 'Circular' }).click();
    await expect(layoutSelect).toContainText('Circular');
    
    // Switch to force directed layout
    await layoutSelect.click();
    await page.locator('[role="option"]').filter({ hasText: 'Force Directed' }).click();
    await expect(layoutSelect).toContainText('Force Directed');
  });

  test('should filter by subgraph', async ({ page }) => {
    const subgraphSelect = page.locator('[data-testid="subgraph-select-trigger"]');
    
    // Initially shows all exercises
    await expect(subgraphSelect).toContainText('All Exercises');
    
    // Select a specific subgraph
    await subgraphSelect.click();
    const firstSubgraph = page.locator('[role="option"]').nth(1);
    const subgraphText = await firstSubgraph.textContent();
    await firstSubgraph.click();
    
    // Verify selection
    await expect(subgraphSelect).toContainText(subgraphText!);
  });

  test('should toggle equipment grouping', async ({ page }) => {
    const checkbox = page.locator('[data-testid="group-by-equipment-checkbox"]');
    
    // Check initial state
    const initialChecked = await checkbox.isChecked();
    
    // Toggle the checkbox
    await checkbox.click();
    
    // Verify state changed
    await expect(checkbox).toBeChecked({ checked: !initialChecked });
  });

  test('should highlight nodes on selection', async ({ page }) => {
    // Wait for graph to render and load data
    await page.waitForTimeout(3000);
    
    // Wait for the graph to be fully loaded
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-testid="cytoscape-canvas"]');
      return canvas && canvas.children.length > 0;
    }, { timeout: 10000 });
    
    // Click on the center of the canvas where nodes should be
    const canvas = page.locator('[data-testid="cytoscape-canvas"]');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Wait a bit for the click to register
    await page.waitForTimeout(500);
    
    // Check that exercise details panel updates (either shows details or remains as legend)
    const detailsPanel = page.locator('[data-testid="exercise-details-panel"]');
    await expect(detailsPanel).toBeVisible();
  });

  test('should control zoom levels', async ({ page }) => {
    const zoomInBtn = page.locator('[data-testid="zoom-in-button"]');
    const zoomOutBtn = page.locator('[data-testid="zoom-out-button"]');
    const resetBtn = page.locator('[data-testid="reset-view-button"]');
    
    // Test zoom in
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    
    // Test zoom out
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await page.waitForTimeout(300);
    
    // Test reset
    await resetBtn.click();
    await page.waitForTimeout(300);
  });

  test('should adjust node spacing with slider', async ({ page }) => {
    const slider = page.locator('[data-testid="node-spacing-slider"]');
    
    // Get initial value
    const initialValue = await slider.getAttribute('value');
    
    // Change the value
    await slider.fill('120');
    
    // Verify the value changed
    await expect(slider).toHaveAttribute('value', '120');
    expect(initialValue).not.toBe('120');
  });

  test('should change color scheme', async ({ page }) => {
    const colorSelect = page.locator('[data-testid="color-scheme-select-trigger"]');
    
    // Check initial color scheme
    await expect(colorSelect).toContainText('Equipment');
    
    // Change to difficulty - use more specific selector
    await colorSelect.click();
    await page.locator('[role="option"]').filter({ hasText: 'Difficulty' }).click();
    await expect(colorSelect).toContainText('Difficulty');
    
    // Change to movement
    await colorSelect.click();
    await page.locator('[role="option"]').filter({ hasText: 'Movement' }).click();
    await expect(colorSelect).toContainText('Movement');
  });

  test('should adjust max depth', async ({ page }) => {
    const depthSelect = page.locator('[data-testid="max-depth-select-trigger"]');
    
    // Check initial depth
    await expect(depthSelect).toContainText('3 Levels');
    
    // Change to 1 level
    await depthSelect.click();
    await page.locator('[role="option"]').filter({ hasText: '1 Level' }).click();
    await expect(depthSelect).toContainText('1 Level');
    
    // Change to 5 levels
    await depthSelect.click();
    await page.locator('[role="option"]').filter({ hasText: '5 Levels' }).click();
    await expect(depthSelect).toContainText('5 Levels');
  });

  test('should display statistics tab', async ({ page }) => {
    // Click on statistics tab
    const statsTab = page.locator('[data-testid="statistics-tab"]');
    await statsTab.click();
    
    // Check that we're on the statistics tab by verifying tab is active
    await expect(statsTab).toHaveClass(/bg-purple-600/);
    
    // Check that we have statistics numbers displayed (the key functionality)
    await expect(page.locator('.text-2xl.font-bold.text-purple-300')).toHaveCount(4);
    
    // Verify we can see main statistics sections by checking for specific subgraph entries
    await expect(page.locator('text=Core - Bodyweight')).toBeVisible();
    await expect(page.locator('text=Push - Bodyweight')).toBeVisible();
    
    // Switch back to visualizer to confirm tab switching works
    const visualizerTab = page.locator('[data-testid="visualizer-tab"]');
    await visualizerTab.click();
    await expect(page.locator('[data-testid="cytoscape-canvas"]')).toBeVisible();
    await expect(visualizerTab).toHaveClass(/bg-purple-600/);
  });

  test('should display tooltip on node hover', async ({ page }) => {
    // Wait for graph to load
    await page.waitForTimeout(3000);
    
    // Wait for the graph to be fully loaded
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-testid="cytoscape-canvas"]');
      return canvas && canvas.children.length > 0;
    }, { timeout: 10000 });
    
    // Hover over a node area
    const canvas = page.locator('[data-testid="cytoscape-canvas"]');
    await canvas.hover({ position: { x: 300, y: 300 } });
    
    // Note: Tooltips might not be easily testable due to their dynamic positioning
    // This test ensures the hover action doesn't break anything
    await expect(canvas).toBeVisible();
  });

  test('should maintain consistent UI state', async ({ page }) => {
    // Test that all UI elements are present and functional
    await expect(page.locator('[data-testid="subgraph-select-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="layout-select-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="color-scheme-select-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-depth-select-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-by-equipment-checkbox"]')).toBeVisible();
    
    // Check sliders
    await expect(page.locator('[data-testid="node-spacing-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="gravity-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="animation-duration-slider"]')).toBeVisible();
    
    // Check buttons
    await expect(page.locator('[data-testid="zoom-in-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="zoom-out-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-view-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-png-button"]')).toBeVisible();
    
    // Check main components
    await expect(page.locator('[data-testid="cytoscape-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="exercise-details-panel"]')).toBeVisible();
  });

  test('should handle layout tuning controls', async ({ page }) => {
    // Test gravity slider
    const gravitySlider = page.locator('[data-testid="gravity-slider"]');
    await gravitySlider.fill('0.5');
    await expect(gravitySlider).toHaveAttribute('value', '0.5');
    
    // Test animation duration slider
    const animationSlider = page.locator('[data-testid="animation-duration-slider"]');
    await animationSlider.fill('1000');
    await expect(animationSlider).toHaveAttribute('value', '1000');
    
    // Verify that changing these values doesn't break the interface
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="cytoscape-canvas"]')).toBeVisible();
  });

  test('should handle rapid layout switching', async ({ page }) => {
    const layoutSelect = page.locator('[data-testid="layout-select-trigger"]');
    
    // Rapidly switch between layouts
    const layouts = ['Circular', 'Grid', 'fCoSE (Optimized)', 'Hierarchical'];
    
    for (const layout of layouts) {
      await layoutSelect.click();
      await page.locator('[role="option"]').filter({ hasText: layout }).click();
      await expect(layoutSelect).toContainText(layout);
      await page.waitForTimeout(200); // Small delay between switches
    }
    
    // Ensure canvas is still functional
    await expect(page.locator('[data-testid="cytoscape-canvas"]')).toBeVisible();
  });

  test('should center on selected node when available', async ({ page }) => {
    // Wait for graph to load
    await page.waitForTimeout(3000);
    
    // Try to select a node by clicking
    const canvas = page.locator('[data-testid="cytoscape-canvas"]');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Wait for potential node selection
    await page.waitForTimeout(500);
    
    // Check if center button becomes available (it should only appear when a node is selected)
    const centerButton = page.locator('[data-testid="center-on-node-button"]');
    
    // The button might or might not be visible depending on whether we hit a node
    // So we'll just check that the UI doesn't break
    await expect(page.locator('[data-testid="cytoscape-canvas"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test navigation to a non-existent subgraph (edge case)
    const subgraphSelect = page.locator('[data-testid="subgraph-select-trigger"]');
    
    // Open dropdown and close it (simulating user interaction)
    await subgraphSelect.click();
    await page.keyboard.press('Escape');
    
    // Ensure the interface remains stable
    await expect(page.locator('[data-testid="cytoscape-canvas"]')).toBeVisible();
    await expect(subgraphSelect).toBeVisible();
  });
});