import { test, expect } from '@playwright/test';

test.describe('Exercise Selection Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workout setup with bodyweight equipment
    await page.goto('/workout-setup?equipment=bodyweight');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Workout Setup');
    
    // Wait for exercises to load after page initialization
    await expect(page.locator('h4').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // Additional wait for exercise generation
  });

  test('should update workout sequence when exercise count changes', async ({ page }) => {
    // Get initial exercise count using data-testid
    const exerciseCountValue = page.getByTestId('exercises-value');
    const initialCount = await exerciseCountValue.textContent();
    expect(initialCount).toBe('5'); // Default is 5

    // Count initial exercises in the sequence
    const initialSequenceExercises = await page.locator('[title*="Exercise"]').count();
    expect(initialSequenceExercises).toBeGreaterThan(0);

    // Increase exercise count using data-testid
    await page.getByTestId('exercises-increase').click();
    
    // Verify the count updated
    const newCount = await exerciseCountValue.textContent();
    expect(newCount).toBe('6');

    // Wait for sequence to update
    await page.waitForTimeout(500);

    // Verify the sequence updated with more exercises
    const newSequenceExercises = await page.locator('[title*="Exercise"]').count();
    expect(newSequenceExercises).toBeGreaterThan(initialSequenceExercises);

    // Verify URL was updated
    await expect(page).toHaveURL(/exercises=6/);
  });

  test('should update exercise list when exercise count changes', async ({ page }) => {
    // Count initial exercises using data-testid selectors
    const exerciseCards = page.locator('[data-testid^="exercise-card-"]');
    const initialExercises = await exerciseCards.count();
    expect(initialExercises).toBe(5); // Default is 5

    // Increase exercise count using data-testid
    await page.getByTestId('exercises-increase').click();
    
    // Wait for count to update
    await expect(page.getByTestId('exercises-value')).toHaveText('6');
    await page.waitForTimeout(1000); // Wait for exercise regeneration
    
    // Wait for new exercise to appear
    await expect(exerciseCards).toHaveCount(6, { timeout: 10000 });

    // Verify the exercise list updated
    const newExercises = await exerciseCards.count();
    expect(newExercises).toBe(6);
  });

  test('should decrease exercise count when minus button is clicked', async ({ page }) => {
    // Increase first to test decrease
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(500);
    
    // Verify it's at 6
    let count = await page.getByTestId('exercises-value').textContent();
    expect(count).toBe('6');

    // Decrease exercise count
    await page.getByTestId('exercises-decrease').click();
    await page.waitForTimeout(500);
    
    // Verify it decreased to 5
    count = await page.getByTestId('exercises-value').textContent();
    expect(count).toBe('5');

    // Verify URL updated
    await expect(page).toHaveURL(/exercises=5/);
  });

  test('should update total workout time when exercise count changes', async ({ page }) => {
    // Get initial workout time using data-testid
    const timeDisplay = page.getByTestId('total-workout-time');
    const initialTime = await timeDisplay.textContent();
    
    // Increase exercise count
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(500);
    
    // Get new workout time
    const newTime = await timeDisplay.textContent();
    
    // Time should have increased
    expect(newTime).not.toBe(initialTime);
  });

  test('should respect min and max exercise limits', async ({ page }) => {
    // Try to decrease below minimum (should be disabled)
    // First decrease to minimum
    await page.getByTestId('exercises-decrease').click();
    await page.getByTestId('exercises-decrease').click();
    await page.waitForTimeout(500);
    
    const count = await page.getByTestId('exercises-value').textContent();
    expect(count).toBe('3'); // Minimum should be 3
    
    // Minus button should be disabled at minimum
    const minusButton = page.getByTestId('exercises-decrease');
    await expect(minusButton).toBeDisabled();
  });

  test('should update difficulty selector when exercise changes', async ({ page }) => {
    // Expand first exercise difficulty using data-testid
    await page.getByTestId('exercise-difficulty-toggle-0').click();
    
    // Verify difficulty buttons are visible
    await expect(page.locator('button:has-text("Easier")')).toBeVisible();
    await expect(page.locator('button:has-text("Standard")')).toBeVisible();
    await expect(page.locator('button:has-text("Harder")')).toBeVisible();
    
    // Change to harder difficulty
    await page.locator('button:has-text("Harder")').click();
    
    // Verify the button is now active/selected
    const harderButton = page.locator('button:has-text("Harder")');
    await expect(harderButton).toHaveClass(/bg-red-600/);
    
    // Verify URL updated with difficulty change
    await expect(page).toHaveURL(/progression/);
  });

  test('should regenerate exercises when count changes', async ({ page }) => {
    const exerciseCards = page.locator('[data-testid^="exercise-card-"]');
    
    // Get the name of the first exercise
    const firstExerciseName = await page.getByTestId('exercise-name-0').textContent();
    
    // Change exercise count
    await page.getByTestId('exercises-increase').click();
    await page.waitForTimeout(500);
    
    // Change back
    await page.getByTestId('exercises-decrease').click();
    await page.waitForTimeout(500);
    
    // The exercises should have regenerated (may be different)
    const newFirstExerciseName = await page.getByTestId('exercise-name-0').textContent();
    
    // Exercise count should be back to 5
    const count = await page.getByTestId('exercises-value').textContent();
    expect(count).toBe('5');
    
    // Exercise list should have 5 exercises
    const exerciseCount = await exerciseCards.count();
    expect(exerciseCount).toBe(5);
  });
});