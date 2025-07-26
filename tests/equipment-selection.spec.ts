import { test, expect } from '@playwright/test';

test.describe('Equipment Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/equipment-selection');
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
    await expect(page).toHaveURL(/\/workout-setup/);
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

  test('should update URL parameters when equipment is selected', async ({ page }) => {
    // Select dumbbells
    await page.getByText('Dumbbells').click();
    
    // URL should include equipment parameter
    await expect(page).toHaveURL(/equipment=.*dumbbells/);
    
    // Select resistance bands
    await page.getByText('Resistance Bands').click();
    
    // URL should include both equipment items
    await expect(page).toHaveURL(/equipment=.*dumbbells.*resistance-bands/);
  });

  test('should preselect equipment from URL parameters', async ({ page }) => {
    // Navigate with preselected equipment
    await page.goto('/equipment-selection?equipment=bodyweight,dumbbells,kettlebells');
    
    // Equipment should be preselected
    await expect(page.getByText(/3 items selected/)).toBeVisible();
    
    // Verify specific equipment is selected (visual indicators)
    const dumbbellCard = page.locator('[data-testid="equipment-dumbbells"], .group:has-text("Dumbbells")').first();
    await expect(dumbbellCard).toHaveClass(/scale-105/);
  });

  test('should navigate to workout setup with equipment parameters', async ({ page }) => {
    // Select equipment
    await page.getByText('Dumbbells').click();
    await page.getByText('Kettlebells').click();
    
    // Click continue
    await page.getByRole('button', { name: /Build My Workout/i }).click();
    
    // Should navigate to workout setup with equipment parameters
    await expect(page).toHaveURL(/\/workout-setup.*equipment=.*dumbbells.*kettlebells/);
  });

  test('should redirect from root to equipment selection', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to equipment selection
    await expect(page).toHaveURL(/\/equipment-selection/);
    await expect(page.getByRole('heading', { name: /Valkyrie Training/i })).toBeVisible();
  });
});