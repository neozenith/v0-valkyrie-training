import { test, expect } from '@playwright/test';

test.describe('Number Controls - Exercise Count', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workout setup with bodyweight equipment
    await page.goto('/workout-setup?equipment=bodyweight');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Workout Setup');
    
    // Wait for exercises to load after page initialization
    await expect(page.locator('h4').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // Additional wait for exercise generation
  });

  test('should change exercise count when plus/minus buttons are clicked', async ({ page }) => {
    // Get the current exercise count using data-testid
    const exerciseValue = page.getByTestId('exercises-value');
    const exerciseText = await exerciseValue.textContent();
    expect(exerciseText).toBe('5');

    // Click plus button to increase to 6
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(300);

    // Verify count changed to 6
    const newExerciseText = await exerciseValue.textContent();
    expect(newExerciseText).toBe('6');

    // Verify URL updated
    await expect(page).toHaveURL(/exercises=6/);

    // Click minus button to decrease back to 5
    await page.getByTestId('exercises-decrease').click();
    await page.waitForTimeout(300);

    // Verify count changed back to 5
    const finalExerciseText = await exerciseValue.textContent();
    expect(finalExerciseText).toBe('5');

    // Verify URL updated
    await expect(page).toHaveURL(/exercises=5/);
  });

  test('should update exercise list when count changes', async ({ page }) => {
    // Count initial exercise cards using data-testid
    const exerciseCards = page.locator('[data-testid^="exercise-card-"]');
    const initialCards = await exerciseCards.count();
    expect(initialCards).toBe(5);

    // Increase exercise count
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(500);

    // Count new exercise cards
    const newCards = await exerciseCards.count();
    expect(newCards).toBe(6);
  });

  test('should update workout sequence visualization', async ({ page }) => {
    // Count exercise numbers in sequence (should be 10 for 2 sets of 5 exercises)
    const initialExerciseNumbers = await page.locator('[title*="Exercise"]:has-text("1"), [title*="Exercise"]:has-text("2"), [title*="Exercise"]:has-text("3"), [title*="Exercise"]:has-text("4"), [title*="Exercise"]:has-text("5")').count();
    expect(initialExerciseNumbers).toBeGreaterThan(8); // Should be 10 (2 sets × 5 exercises)

    // Increase exercise count
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(500);

    // Count exercise numbers in sequence (should now include exercise 6)
    const newExerciseNumbers = await page.locator('[title*="Exercise"]:has-text("6")').count();
    expect(newExerciseNumbers).toBeGreaterThanOrEqual(2); // Should appear in both sets
  });

  test('should update total workout time when exercise count changes', async ({ page }) => {
    // Get initial time using data-testid
    const timeDisplay = page.getByTestId('total-workout-time');
    const initialTime = await timeDisplay.textContent();
    expect(initialTime).toBe('12:00');

    // Increase exercise count
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(500);

    // Get new time (should be longer)
    const newTime = await timeDisplay.textContent();
    expect(newTime).toBe('14:00'); // Should increase by 2 minutes
  });
});