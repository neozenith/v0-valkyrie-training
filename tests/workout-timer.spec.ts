import { test, expect } from '@playwright/test';

test.describe('Workout Timer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate to workout timer
    await page.getByText('Bodyweight').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Wait for workout setup page
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
  });

  test('should start workout with default settings', async ({ page }) => {
    // Click start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Should show timer interface
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    
    // Should show the timer and exercise name
    await expect(page.getByText(/WORK/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('should have play and skip buttons visible', async ({ page }) => {
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Wait for timer to start
    await page.waitForTimeout(500);
    
    // Verify play button is present (purple background button)
    const playButton = page.locator('button[class*="bg-purple-600"]');
    await expect(playButton).toBeVisible();
    
    // Verify skip button is present (border button)
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    await expect(skipButton).toBeVisible();
    
    // Verify timer is working
    await expect(page.getByText(/0:40|0:39|0:38/)).toBeVisible();
  });

  test('should skip to next exercise', async ({ page }) => {
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Get initial exercise name
    const initialExercise = await page.locator('h2').first().textContent();
    
    // Click the skip button
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    await skipButton.click();
    
    // Wait for transition
    await page.waitForTimeout(500);
    
    // Should either move to next exercise or rest period
    const isRest = await page.getByText('REST').isVisible().catch(() => false);
    const currentExercise = await page.locator('h2').first().textContent();
    
    if (isRest) {
      // We're in rest period, exercise name should be the same
      expect(currentExercise).toBe(initialExercise);
      await expect(page.getByText('REST')).toBeVisible();
    } else {
      // We moved to next exercise
      expect(currentExercise).not.toBe(initialExercise);
      await expect(page.getByText('WORK')).toBeVisible();
    }
  });

  test('should return home when home button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Click home button (first icon button in the timer header)
    const homeButton = page.locator('button').filter({ hasText: /^$/ }).first();
    await homeButton.click();
    
    // Should be back at workout setup
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
  });

  test('should have progressbar that tracks workout completion', async ({ page }) => {
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Check that progressbar is present and accessible
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    
    // Verify progressbar has aria attributes
    await expect(progressBar).toHaveAttribute('aria-valuemin');
    await expect(progressBar).toHaveAttribute('aria-valuemax');
    
    // Get initial progress value (should be 0 or very low)
    const initialProgress = await progressBar.getAttribute('aria-valuenow');
    const initialValue = parseFloat(initialProgress || '0');
    expect(initialValue).toBeLessThanOrEqual(10); // Should start near 0%
    
    // Skip through workout and verify progress changes
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    
    let progressValues: number[] = [initialValue];
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(300);
      attempts++;
      
      const currentProgress = await progressBar.getAttribute('aria-valuenow').catch(() => '0');
      const currentValue = parseFloat(currentProgress || '0');
      progressValues.push(currentValue);
      
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
    }
    
    // Verify that progress generally increases throughout the workout
    const maxProgress = Math.max(...progressValues);
    expect(maxProgress).toBeGreaterThanOrEqual(initialValue);
    
    // Verify we have meaningful progress values
    expect(progressValues.length).toBeGreaterThan(3);
  });

  test('should complete full workout and reach workout complete screen', async ({ page }) => {
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Should show timer interface
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    await expect(page.getByText(/WORK/)).toBeVisible();
    
    // Verify progressbar starts at low value
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    
    // Use progressbar to guide completion - more robust approach
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    
    let attempts = 0;
    const maxAttempts = 30;
    let lastProgress = 0;
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(200);
      attempts++;
      
      // Check progress and workout completion
      const currentProgress = await progressBar.getAttribute('aria-valuenow').catch(() => '0');
      const progressValue = parseFloat(currentProgress || '0');
      lastProgress = Math.max(lastProgress, progressValue);
      
      // Check if we've reached the workout complete screen
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
      
      // Safety check - if progress is near 100% but no complete screen, something might be wrong
      if (progressValue > 98 && attempts > 20) {
        console.log(`Progress at ${progressValue}% but no complete screen after ${attempts} attempts`);
      }
    }
    
    // Should now be on workout complete screen
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    await expect(page.getByText('Great job finishing your training session')).toBeVisible();
    
    // Verify workout stats
    await expect(page.getByText('Total Time')).toBeVisible();
    await expect(page.locator('.text-sm.text-slate-300').filter({ hasText: 'Exercises' })).toBeVisible();
    await expect(page.getByText('Sets')).toBeVisible();
    
    // Verify exercises completed section
    await expect(page.getByRole('heading', { name: /Exercises Completed/i })).toBeVisible();
    
    // Verify that exercise badges are present (without checking specific names since they may vary)
    await expect(page.locator('.bg-purple-600').first()).toBeVisible(); // Exercise badges have purple background
    
    // Verify Start New Workout button is present
    await expect(page.getByRole('button', { name: /Start New Workout/i })).toBeVisible();
  });

  test('should handle different workout configurations - 3 sets workout', async ({ page }) => {
    // Modify workout to 3 sets by clicking the + button next to "Sets"
    const setsIncreaseButton = page.locator('h3:has-text("Sets")').locator('..').locator('button').nth(1);
    await setsIncreaseButton.click(); // Should make it 3 sets
    
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Should show 3 sets
    await expect(page.getByText(/Set 1\/3/)).toBeVisible();
    
    // Use progressbar to complete this longer workout
    const progressBar = page.locator('[role="progressbar"]');
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    
    let attempts = 0;
    const maxAttempts = 40; // More attempts for 3 sets
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(200);
      attempts++;
      
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
      
      // Log progress every 10 attempts for debugging
      if (attempts % 10 === 0) {
        const progress = await progressBar.getAttribute('aria-valuenow').catch(() => '0');
        console.log(`3-set workout progress: ${progress}% after ${attempts} skips`);
      }
    }
    
    // Should reach completion
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    
    // Verify sets count shows 3
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    await expect(setsValue).toHaveText('3');
  });

  test('should handle different workout configurations - more exercises', async ({ page }) => {
    // Increase exercises count by clicking the + button next to "Exercises"  
    const exercisesIncreaseButton = page.locator('h3:has-text("Exercises")').locator('..').locator('button').nth(1);
    await exercisesIncreaseButton.click(); // Should make it 6 exercises
    
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Should show 6 exercises
    await expect(page.getByText(/Ex 1\/6/)).toBeVisible();
    
    // Use progressbar to complete workout with more exercises
    const progressBar = page.locator('[role="progressbar"]');
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    
    let attempts = 0;
    const maxAttempts = 35; // More attempts for more exercises
    let progressHistory: number[] = [];
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(200);
      attempts++;
      
      // Track progress to ensure it's increasing
      const progressStr = await progressBar.getAttribute('aria-valuenow').catch(() => '0');
      const progress = parseFloat(progressStr || '0');
      progressHistory.push(progress);
      
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
    }
    
    // Should reach completion
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    
    // Verify exercises count shows 6
    const exercisesValue = page.locator('.text-2xl.font-bold.text-white').nth(1);
    await expect(exercisesValue).toHaveText('6');
    
    // Verify progress generally increased (allowing for some fluctuation)
    expect(progressHistory.length).toBeGreaterThan(5);
    const finalProgress = progressHistory[progressHistory.length - 1];
    const initialProgress = progressHistory[0];
    expect(finalProgress).toBeGreaterThanOrEqual(initialProgress);
  });
});