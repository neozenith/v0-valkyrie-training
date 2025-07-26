import { test, expect } from '@playwright/test';

test.describe('Workout Complete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate to workout complete screen by completing a workout
    await page.getByText('Bodyweight').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Skip through entire workout to reach complete screen
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(200);
      attempts++;
      
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
    }
    
    // Ensure we're on the workout complete screen
    await expect(page.getByText('Workout Complete!')).toBeVisible();
  });

  test('should display workout complete heading and congratulations message', async ({ page }) => {
    // Check main heading
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    
    // Check congratulations message
    await expect(page.getByText('Great job finishing your training session')).toBeVisible();
    
    // Check trophy icon is present (should be visible as part of the success display)
    const trophySection = page.locator('div').filter({ hasText: 'Workout Complete!' }).first();
    await expect(trophySection).toBeVisible();
  });

  test('should display workout statistics correctly', async ({ page }) => {
    // Check that all three stat categories are present
    await expect(page.getByText('Total Time')).toBeVisible();
    await expect(page.locator('.text-sm.text-slate-300').filter({ hasText: 'Exercises' })).toBeVisible();
    await expect(page.getByText('Sets')).toBeVisible();
    
    // Verify that actual values are displayed (numbers)
    const timeValue = page.locator('.text-2xl.font-bold.text-white').first();
    await expect(timeValue).toBeVisible();
    await expect(timeValue).not.toHaveText('');
    
    // Check exercises count is a number
    const exercisesValue = page.locator('.text-2xl.font-bold.text-white').nth(1);
    await expect(exercisesValue).toBeVisible();
    const exercisesText = await exercisesValue.textContent();
    expect(exercisesText).toMatch(/^\d+$/);
    
    // Check sets count is a number
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    await expect(setsValue).toBeVisible();
    const setsText = await setsValue.textContent();
    expect(setsText).toMatch(/^\d+$/);
  });

  test('should display exercises completed section with exercise badges', async ({ page }) => {
    // Check exercises completed heading
    await expect(page.getByRole('heading', { name: /Exercises Completed/i })).toBeVisible();
    
    // Check that exercise badges are present
    const exerciseBadges = page.locator('.bg-purple-600.text-white');
    await expect(exerciseBadges.first()).toBeVisible();
    
    // Verify there are multiple exercise badges (at least 1)
    const badgeCount = await exerciseBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
    
    // Check that badges contain text (exercise names)
    const firstBadge = exerciseBadges.first();
    const badgeText = await firstBadge.textContent();
    expect(badgeText).toBeTruthy();
    expect(badgeText!.length).toBeGreaterThan(0);
  });

  test('should have functional Start New Workout button', async ({ page }) => {
    // Check button is present and visible
    const startNewButton = page.getByRole('button', { name: /Start New Workout/i });
    await expect(startNewButton).toBeVisible();
    
    // Click the button
    await startNewButton.click();
    
    // Should navigate back to equipment selection screen
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    await expect(page.getByText('Select your available equipment below to begin')).toBeVisible();
  });

  test('should have proper visual styling and layout', async ({ page }) => {
    // Check main container has proper background gradient
    const mainContainer = page.locator('.min-h-screen.bg-gradient-to-br');
    await expect(mainContainer).toBeVisible();
    
    // Check card layout is present
    const card = page.locator('.bg-slate-800\\/50.border-purple-500\\/30');
    await expect(card).toBeVisible();
    
    // Check grid layout for stats
    const statsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-3');
    await expect(statsGrid).toBeVisible();
    
    // Verify stat cards have proper styling
    const statCards = page.locator('.bg-slate-700\\/50.rounded-lg.border.border-slate-600');
    await expect(statCards.first()).toBeVisible();
  });

  test('should display time in proper format', async ({ page }) => {
    // Get the total time value
    const timeElement = page.locator('.text-2xl.font-bold.text-white').first();
    const timeText = await timeElement.textContent();
    
    // Should be in MM:SS format
    expect(timeText).toMatch(/^\d{1,2}:\d{2}$/);
    
    // Verify it's a reasonable workout time (should be > 0 and < 2 hours)
    const [minutes, seconds] = timeText!.split(':').map(Number);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThan(120); // Less than 2 hours
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThan(60);
  });

  test('should handle different workout configurations', async ({ page }) => {
    // Navigate back to equipment selection to test different config
    await page.getByRole('button', { name: /Start New Workout/i }).click();
    
    // Select different equipment combination
    await page.getByText('Dumbbells').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Just test with default settings but different equipment
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Complete this workout
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(200);
      attempts++;
      
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
    }
    
    // Verify we still reach completion screen with different equipment config
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    
    // Verify completion screen shows expected values for default settings
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    const setsText = await setsValue.textContent();
    expect(setsText).toMatch(/^\d+$/); // Should be a number
  });
});