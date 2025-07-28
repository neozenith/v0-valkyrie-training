import { test, expect } from '@playwright/test';

test.describe('Workout Complete', () => {
  // Helper function to complete a workout flow (for tests that need it)
  async function completeWorkoutFlow(page: any) {
    await page.goto('/equipment-selection');
    
    // Navigate to workout complete screen by completing a workout
    await page.getByText('Bodyweight').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Wait for workout setup page
    await expect(page).toHaveURL(/\/workout-setup/);
    
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Wait for workout timer page
    await expect(page).toHaveURL(/\/workout-timer/);
    
    // Skip through entire workout to reach complete screen
    const skipButton = page.getByTestId('skip-button');
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
    await expect(page).toHaveURL(/\/workout-complete/);
    await expect(page.getByText('Workout Complete!')).toBeVisible();
  }

  test('should display workout complete heading and congratulations message', async ({ page }) => {
    // Use direct URL access with sample data
    await page.goto('/workout-complete?totalTime=180&sets=2&exercises=Push-up,Squat,Plank');
    
    // Check main heading
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    
    // Check congratulations message
    await expect(page.getByText('Great job finishing your training session')).toBeVisible();
    
    // Check trophy icon is present (should be visible as part of the success display)
    const trophySection = page.locator('div').filter({ hasText: 'Workout Complete!' }).first();
    await expect(trophySection).toBeVisible();
  });

  test('should display workout statistics correctly', async ({ page }) => {
    // Use direct URL access with sample data
    await page.goto('/workout-complete?totalTime=240&sets=3&exercises=Push-up,Squat,Plank,Burpee');
    
    // Check that all three stat categories are present
    await expect(page.getByText('Total Time')).toBeVisible();
    await expect(page.locator('.text-sm.text-slate-300').filter({ hasText: 'Exercises' })).toBeVisible();
    await expect(page.getByText('Sets')).toBeVisible();
    
    // Verify that actual values are displayed (numbers)
    const timeValue = page.locator('.text-2xl.font-bold.text-white').first();
    await expect(timeValue).toBeVisible();
    await expect(timeValue).toHaveText('4:00'); // 240 seconds = 4:00
    
    // Check exercises count is a number
    const exercisesValue = page.locator('.text-2xl.font-bold.text-white').nth(1);
    await expect(exercisesValue).toBeVisible();
    await expect(exercisesValue).toHaveText('4'); // 4 exercises
    
    // Check sets count is a number
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    await expect(setsValue).toBeVisible();
    await expect(setsValue).toHaveText('3'); // 3 sets
  });

  test('should display exercises completed section with exercise badges', async ({ page }) => {
    // Use direct URL access with sample data
    await page.goto('/workout-complete?totalTime=150&sets=2&exercises=Push-up,Squat,Plank');
    
    // Check exercises completed heading
    await expect(page.getByRole('heading', { name: /Exercises Completed/i })).toBeVisible();
    
    // Check that exercise badges are present
    const exerciseBadges = page.locator('.bg-purple-600.text-white');
    await expect(exerciseBadges.first()).toBeVisible();
    
    // Verify there are multiple exercise badges (at least 3)
    const badgeCount = await exerciseBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(3);
    
    // Check specific exercise names
    await expect(page.getByText('Push-up')).toBeVisible();
    await expect(page.getByText('Squat')).toBeVisible();
    await expect(page.getByText('Plank')).toBeVisible();
  });

  test('should have functional Start New Workout button', async ({ page }) => {
    // Use direct URL access with sample data
    await page.goto('/workout-complete?totalTime=120&sets=2&exercises=Push-up,Squat');
    
    // Check button is present and visible
    const startNewButton = page.getByRole('button', { name: /Start New Workout/i });
    await expect(startNewButton).toBeVisible();
    
    // Click the button
    await startNewButton.click();
    
    // Should navigate back to equipment selection screen
    await expect(page).toHaveURL(/\/equipment-selection/);
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    await expect(page.getByText('Select your available equipment below to begin')).toBeVisible();
  });

  test('should have proper visual styling and layout', async ({ page }) => {
    // Use direct URL access with sample data
    await page.goto('/workout-complete?totalTime=200&sets=2&exercises=Push-up,Squat,Plank');
    
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
    // Use direct URL access with sample data (195 seconds = 3:15)
    await page.goto('/workout-complete?totalTime=195&sets=2&exercises=Push-up,Squat');
    
    // Get the total time value
    const timeElement = page.locator('.text-2xl.font-bold.text-white').first();
    const timeText = await timeElement.textContent();
    
    // Should be in MM:SS format and specifically 3:15
    expect(timeText).toBe('3:15');
    
    // Verify it's a reasonable workout time (should be > 0 and < 2 hours)
    const [minutes, seconds] = timeText!.split(':').map(Number);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThan(120); // Less than 2 hours
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThan(60);
  });

  test('should handle different workout configurations', async ({ page }) => {
    // Complete a full workout flow with different equipment to test the integration
    await page.goto('/equipment-selection');
    
    // Select different equipment combination
    await page.getByText('Dumbbells').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Should be on workout setup page
    await expect(page).toHaveURL(/\/workout-setup/);
    
    // Wait for exercises to load before starting workout
    await expect(page.getByTestId('exercise-card-0')).toBeVisible({ timeout: 10000 });
    
    // Start workout using data-testid
    await page.getByTestId('start-workout-button').click();
    
    // Should be on workout timer page
    await expect(page).toHaveURL(/\/workout-timer/);
    
    // Complete this workout quickly using improved skip button selector
    const skipButton = page.getByTestId('skip-button');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await skipButton.click();
      await page.waitForTimeout(200); // Slightly longer wait for more reliable clicking
      attempts++;
      
      // Check if we've reached the workout complete screen
      const workoutCompleteExists = await page.getByText('Workout Complete!').isVisible().catch(() => false);
      if (workoutCompleteExists) {
        break;
      }
      
      // Also check URL in case redirect happened
      const currentUrl = page.url();
      if (currentUrl.includes('/workout-complete')) {
        break;
      }
    }
    
    // Verify we still reach completion screen with different equipment config
    await expect(page).toHaveURL(/\/workout-complete/);
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    
    // Verify completion screen shows expected values for default settings
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    const setsText = await setsValue.textContent();
    expect(setsText).toMatch(/^\d+$/); // Should be a number
  });

  test('should handle direct URL access with workout results', async ({ page }) => {
    // Navigate directly to workout complete with parameters
    await page.goto('/workout-complete?totalTime=180&sets=2&exercises=Push-up,Squat,Plank,Jumping%20Jacks,Burpee');
    
    // Should show workout complete page
    await expect(page.getByText('Workout Complete!')).toBeVisible();
    await expect(page.getByText('Great job finishing your training session')).toBeVisible();
    
    // Should display provided statistics
    await expect(page.getByText('Total Time')).toBeVisible();
    const timeValue = page.locator('.text-2xl.font-bold.text-white').first();
    await expect(timeValue).toHaveText('3:00'); // 180 seconds = 3:00
    
    // Should display exercises count (5 exercises were provided)
    const exercisesValue = page.locator('.text-2xl.font-bold.text-white').nth(1);
    const exercisesText = await exercisesValue.textContent();
    expect(parseInt(exercisesText || '0')).toBeGreaterThan(0);
    
    // Should display sets count
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    await expect(setsValue).toHaveText('2');
    
    // Should display exercise badges with provided names
    await expect(page.getByText('Push-up')).toBeVisible();
    await expect(page.getByText('Squat')).toBeVisible();
    await expect(page.getByText('Plank')).toBeVisible();
  });

  test('should handle direct URL access with missing parameters', async ({ page }) => {
    // Navigate directly without parameters
    await page.goto('/workout-complete');
    
    // Should show the no data page when accessed without parameters
    await expect(page.getByText('No Workout Data').first()).toBeVisible();
    await expect(page.getByText('No workout data found. Please start a new workout.')).toBeVisible();
    
    // Should have functional start new workout button
    const startNewButton = page.getByRole('button', { name: /Start New Workout/i });
    await expect(startNewButton).toBeVisible();
    await expect(startNewButton).toBeEnabled();
  });

  test('should preserve URL parameters and handle navigation', async ({ page }) => {
    // Start with direct access with parameters
    await page.goto('/workout-complete?totalTime=240&sets=3&exercises=Burpee,Mountain%20Climbers,Push-up,Squat');
    
    // Verify URL contains parameters
    await expect(page).toHaveURL(/totalTime=240/);
    await expect(page).toHaveURL(/exercises=Burpee/);
    await expect(page).toHaveURL(/sets=3/);
    
    // Verify values are displayed correctly
    const timeValue = page.locator('.text-2xl.font-bold.text-white').first();
    await expect(timeValue).toHaveText('4:00'); // 240 seconds = 4:00
    
    const exercisesValue = page.locator('.text-2xl.font-bold.text-white').nth(1);
    await expect(exercisesValue).toHaveText('4'); // 4 exercises in the list
    
    const setsValue = page.locator('.text-2xl.font-bold.text-white').nth(2);
    await expect(setsValue).toHaveText('3');
    
    // Verify exercise names are displayed
    await expect(page.getByText('Burpee')).toBeVisible();
    await expect(page.getByText('Mountain Climbers')).toBeVisible();
    
    // Click Start New Workout
    await page.getByRole('button', { name: /Start New Workout/i }).click();
    
    // Should navigate to equipment selection
    await expect(page).toHaveURL(/\/equipment-selection/);
  });
});