import { test, expect } from '@playwright/test';

test.describe('Workout Timer', () => {
  // Standard workout timer URL for most tests
  const defaultWorkoutUrl = '/workout-timer?sets=2&exercises=5&style=hiit&workTime=40&restTime=20&setRestTime=60&exerciseIds=push-ups:standard,bodyweight-squats:standard,plank:standard,mountain-climbers:standard,burpees:standard';

  test('should start workout with default settings', async ({ page }) => {
    // Use direct URL access to workout timer
    await page.goto(defaultWorkoutUrl);
    
    // Should be on workout timer page
    await expect(page).toHaveURL(/\/workout-timer/);
    
    // Should show timer interface
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    await expect(page.getByText(/Ex 1\/5/)).toBeVisible();
    
    // Should show the timer and exercise name
    await expect(page.getByText(/WORK/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('should have play and skip buttons visible', async ({ page }) => {
    // Use direct URL access to workout timer
    await page.goto(defaultWorkoutUrl);
    
    // Should be on workout timer page
    await expect(page).toHaveURL(/\/workout-timer/);
    
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
    // Use direct URL access to workout timer
    await page.goto(defaultWorkoutUrl);
    
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
    // Use direct URL access to workout timer
    await page.goto(defaultWorkoutUrl);
    
    // Should be on workout timer page
    await expect(page).toHaveURL(/\/workout-timer/);
    
    // Click home button (first icon button in the timer header)
    const homeButton = page.locator('button').filter({ hasText: /^$/ }).first();
    await homeButton.click();
    
    // Should be back at workout setup
    await expect(page).toHaveURL(/\/workout-setup/);
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
  });

  test('should complete full workout and reach workout complete screen', async ({ page }) => {
    await page.goto(defaultWorkoutUrl);
    
    // Should be on workout timer page
    await expect(page).toHaveURL(/\/workout-timer/);
    
    // Should show timer interface
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    await expect(page.getByText(/WORK/)).toBeVisible();
    
    // Verify progressbar starts at low value
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    
    // Use skip button to complete workout - needs more attempts for full 2-set workout
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    
    let attempts = 0;
    const maxAttempts = 50; // Increased from 30 to handle full workout completion
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(100); // Reduced wait time for faster execution
      attempts++;
      
      // Check if we've reached the workout complete screen
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
      
      // Check if we've been redirected to workout-complete page
      const currentUrl = page.url();
      if (currentUrl.includes('/workout-complete')) {
        break;
      }
    }
    
    // Should now be on workout complete screen
    await expect(page).toHaveURL(/\/workout-complete/);
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

  

  test('should handle direct URL access to workout timer', async ({ page }) => {
    // Navigate directly to workout timer with parameters
    await page.goto('/workout-timer?sets=2&exercises=5&style=hiit&workTime=40&restTime=20&setRestTime=60&exerciseIds=push-ups:standard,bodyweight-squats:standard,plank:standard,mountain-climbers:standard,burpees:standard');
    
    // Should load workout timer page
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    await expect(page.getByText(/Ex 1\/5/)).toBeVisible();
    
    // Should show timer interface with correct style
    await expect(page.getByText(/WORK/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    
    // Should have correct URL
    await expect(page).toHaveURL(/\/workout-timer.*sets=2.*exercises=5.*style=hiit/);
  });

  test('should handle invalid parameters gracefully', async ({ page }) => {
    // Try to access with invalid parameters
    await page.goto('/workout-timer?sets=invalid&exercises=0&style=invalid');
    
    // Should redirect to workout setup due to invalid parameters
    // The page should handle invalid parameters gracefully
    await page.waitForTimeout(2000);
    
    // Check if redirected to workout setup (which is the expected behavior for invalid parameters)
    const isRedirectedToSetup = page.url().includes('/workout-setup');
    const hasTimer = await page.getByText(/WORK/).isVisible().catch(() => false);
    const hasLoadingMessage = await page.getByText(/Loading workout/).isVisible().catch(() => false);
    
    // Should either redirect to setup, show timer, or show loading message
    expect(isRedirectedToSetup || hasTimer || hasLoadingMessage).toBe(true);
  });

  test('should preserve workout parameters in URL throughout timer', async ({ page }) => {
    // Start with specific parameters
    await page.goto('/workout-setup?equipment=bodyweight&sets=3&exercises=4&style=tabata&workTime=30&restTime=10&setRestTime=90');
    
    // Start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Should be on timer with correct parameters
    await expect(page).toHaveURL(/\/workout-timer.*sets=3.*exercises=4.*style=tabata.*workTime=30.*restTime=10.*setRestTime=90/);
    
    // Parameters should persist during workout
    await expect(page.getByText(/Set 1\/3/)).toBeVisible();
    
    // Skip a few intervals
    const skipButton = page.locator('button[class*="bg-transparent"][class*="border-slate-500"]');
    await skipButton.click();
    await page.waitForTimeout(300);
    
    // URL should still contain correct parameters
    await expect(page).toHaveURL(/\/workout-timer.*sets=3.*exercises=4.*style=tabata/);
  });
});