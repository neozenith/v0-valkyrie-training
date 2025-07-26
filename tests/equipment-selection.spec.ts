import { test, expect } from '@playwright/test';

test.describe('Equipment Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display equipment selection page on load', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/v0 App/);
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
    
    // Check for equipment options
    await expect(page.getByText('Bodyweight')).toBeVisible();
    await expect(page.getByText('Dumbbells')).toBeVisible();
  });

  test('should enable continue button when equipment is selected', async ({ page }) => {
    // Button should be enabled (bodyweight is always selected)
    const continueButton = page.getByRole('button', { name: /Build My Workout/i });
    await expect(continueButton).toBeEnabled();
    
    // Select bodyweight
    await page.getByText('Bodyweight').click();
    
    // Button should still be enabled
    await expect(continueButton).toBeEnabled();
  });

  test('should navigate to workout setup when continue is clicked', async ({ page }) => {
    // Select equipment
    await page.getByText('Bodyweight').click();
    await page.getByText('Dumbbells').click();
    
    // Click continue
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Should now be on workout setup page
    await expect(page.getByRole('heading', { name: /Workout Setup/i })).toBeVisible();
  });

  test('should allow multiple equipment selection', async ({ page }) => {
    // Select multiple equipment
    await page.getByText('Bodyweight').click();
    await page.getByText('Dumbbells').click();
    await page.getByText('Resistance Bands').click();
    
    // All should be selected (verify the selection count)
    // Instead of checking individual checkboxes, verify the selection count increased
    await expect(page.getByText(/3 items selected/)).toBeVisible();
  });
});