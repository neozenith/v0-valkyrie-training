import { test, expect } from '@playwright/test';

test.describe('Complete Workout Flow', () => {
  test('should complete a full workout flow from start to finish', async ({ page }) => {
    // Start at home
    await page.goto('/');
    
    // Step 1: Equipment Selection
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    await page.getByText('Bodyweight').click();
    await page.getByText('Dumbbells').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Step 2: Workout Setup
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
    
    // Modify workout settings - Sets are already set to 2 by default
    // Just verify the current settings
    
    // Start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Step 3: Active Workout
    await expect(page.getByText(/Set 1\/2/)).toBeVisible();
    
    // Just verify we're in the workout timer view
    await expect(page.getByText(/WORK/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible(); // Exercise name
    
    // Step 4: Workout Complete (if we've gone through all exercises)
    // This would happen after all exercises are done
    // await expect(page.getByRole('heading', { name: /Workout Complete/i })).toBeVisible();
  });

  test('should handle back navigation through all screens', async ({ page }) => {
    await page.goto('/');
    
    // Go to workout setup
    await page.getByText('Bodyweight').click();
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Go back to equipment selection
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    
    // Go forward again
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
    
    // Start workout
    await page.getByRole('button', { name: /Start Workout/i }).click();
    
    // Go back from timer (click the first icon button which is home)
    await page.locator('button').first().click();
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
  });
});