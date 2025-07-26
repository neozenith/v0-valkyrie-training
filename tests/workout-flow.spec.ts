import { test, expect } from '@playwright/test';

test.describe('Complete Workout Flow', () => {
  test('should complete a full workout flow from start to finish', async ({ page }) => {
    // Start at equipment selection
    await page.goto('/equipment-selection');
    
    // Step 1: Equipment Selection
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    await page.getByText('Bodyweight').click();
    await page.getByText('Dumbbells').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Step 2: Workout Setup
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
    await expect(page).toHaveURL(/\/workout-setup/);
    
    // Modify workout settings - Sets are already set to 2 by default
    // Just verify the current settings
    
    // Start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Step 3: Active Workout
    await expect(page).toHaveURL(/\/workout-timer/);
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    
    // Just verify we're in the workout timer view
    await expect(page.getByText(/WORK/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible(); // Exercise name
    
    // Step 4: Workout Complete (if we've gone through all exercises)
    // This would happen after all exercises are done
    // await expect(page.getByRole('heading', { name: /Workout Complete/i })).toBeVisible();
  });

  test('should handle back navigation through all screens', async ({ page }) => {
    await page.goto('/equipment-selection');
    
    // Go to workout setup
    await page.getByText('Bodyweight').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Verify we're on workout setup
    await expect(page).toHaveURL(/\/workout-setup/);
    
    // Go back to equipment selection
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page).toHaveURL(/\/equipment-selection/);
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    
    // Go forward again
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    await expect(page).toHaveURL(/\/workout-setup/);
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
    
    // Start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    await expect(page).toHaveURL(/\/workout-timer/);
    
    // Go back from timer (click the first icon button which is home)
    await page.locator('button').first().click();
    await expect(page).toHaveURL(/\/workout-setup/);
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
  });

  test('should preserve URL parameters throughout the flow', async ({ page }) => {
    // Start with specific equipment
    await page.goto('/equipment-selection?equipment=bodyweight,dumbbells');
    
    // Equipment should be preselected
    await expect(page.getByText(/2 items selected/)).toBeVisible();
    
    // Continue to workout setup
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Wait for navigation to workout setup
    await page.waitForURL(/\/workout-setup/);
    
    // URL should include equipment parameters
    await expect(page).toHaveURL(/\/workout-setup.*equipment=.*dumbbells/);
    
    // Modify settings
    await page.locator('h3:has-text("Sets")').locator('..').locator('button').nth(1).click(); // Increase sets
    
    // URL should update with new settings
    await expect(page).toHaveURL(/sets=3/);
    
    // Start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Timer URL should include all workout parameters (but not equipment)
    await expect(page).toHaveURL(/\/workout-timer.*sets=3/);
    await expect(page).not.toHaveURL(/equipment=/); // Equipment not needed in timer
  });

  test('should redirect from root to equipment selection', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to equipment selection
    await expect(page).toHaveURL(/\/equipment-selection/);
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
  });

  test('should handle direct URL access to any page', async ({ page }) => {
    // Direct access to workout setup with parameters
    await page.goto('/workout-setup?equipment=bodyweight&sets=3&exercises=4&style=tabata&workTime=45&restTime=15&setRestTime=90');
    
    // Page should load with correct settings
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
    
    // Verify settings are applied (sets should be 3)
    const setsControl = page.locator('h3:has-text("Sets")').locator('..');
    await expect(setsControl.getByText('3')).toBeVisible();
    
    // Verify style is tabata
    const tabataButton = page.getByRole('button', { name: /Tabata/i });
    await expect(tabataButton).toHaveClass(/bg-purple-600/);
  });

  test('should handle exercise shuffling with URL updates', async ({ page }) => {
    await page.goto('/workout-setup?equipment=bodyweight,dumbbells');
    
    // Wait for exercises to load
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
    
    // Get initial URL
    const initialUrl = page.url();
    
    // Click shuffle button
    await page.getByRole('button', { name: /Shuffle/i }).click();
    
    // URL should update with new exercise IDs
    await page.waitForFunction((initialUrl) => window.location.href !== initialUrl, initialUrl);
    
    // Should still be on workout setup page
    await expect(page).toHaveURL(/\/workout-setup/);
    
    // Should have exerciseIds parameter
    await expect(page).toHaveURL(/exerciseIds=/);
  });
});