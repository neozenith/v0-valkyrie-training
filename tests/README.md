# Playwright E2E Tests

End-to-end tests for the Valkyrie Training application using Playwright.

## Setup

Tests are already configured and ready to run. Playwright browsers were installed during setup.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in UI mode (recommended for development)
pnpm test:ui

# Debug tests
pnpm test:debug

# Show test report
pnpm test:report

# Run specific test file
pnpm test tests/equipment-selection.spec.ts

# Run tests in headed mode (see browser)
pnpm test --headed
```

## Test Structure

```
tests/
├── equipment-selection.spec.ts  # Equipment selection page tests
├── workout-timer.spec.ts       # Timer functionality tests
└── workout-flow.spec.ts        # Complete user flow tests
```

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.getByRole('button', { name: /Click Me/i }).click();
    
    // Act & Assert
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Common Selectors
```typescript
// By role (preferred)
page.getByRole('button', { name: /Continue/i })
page.getByRole('heading', { name: /Workout Setup/i })

// By text
page.getByText('Bodyweight')

// By test id (add data-testid to elements)
page.getByTestId('timer-display')

// By CSS/XPath (avoid if possible)
page.locator('.timer-display')
```

### Waiting Strategies
```typescript
// Wait for element
await expect(page.getByText('Loading')).toBeVisible();

// Wait for navigation
await page.waitForURL('/workout');

// Wait for timeout (avoid if possible)
await page.waitForTimeout(1000);

// Wait for element state
await expect(button).toBeEnabled();
await expect(input).toHaveValue('expected');
```

## Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByText` over CSS selectors
2. **Keep tests independent**: Each test should work in isolation
3. **Use descriptive names**: Test names should explain what they test
4. **Avoid hard waits**: Use `expect` assertions instead of `waitForTimeout`
5. **Test user flows**: Focus on real user scenarios, not implementation details

## CI/CD Integration

The tests are configured to:
- Run in parallel locally
- Run sequentially in CI
- Retry failed tests twice in CI
- Generate HTML reports
- Collect traces on failure

## Debugging Failed Tests

1. **Run in UI mode**: `pnpm test:ui` to see tests run visually
2. **Use debug mode**: `pnpm test:debug` to step through tests
3. **Check traces**: Failed tests generate traces in `test-results/`
4. **View report**: `pnpm test:report` shows detailed failure info

## Mobile Testing

Tests include mobile viewports:
- iPhone 12 (Mobile Safari)
- Pixel 5 (Mobile Chrome)

Run mobile tests only:
```bash
pnpm test --project="Mobile Chrome"
```

## Configuration

See `playwright.config.ts` for:
- Browser settings
- Base URL configuration
- Test timeouts
- Reporter settings
- Web server configuration

## Troubleshooting

Stuck Playwright processes can be found (and stopped) with the following:

```sh
# Check for any running Playwright, Node, or npm processes
ps aux | grep -E "(playwright|node|npm)" | grep -v grep

# List Playwright processes specifically
pgrep -fl "playwright" | head -10

# Check what process is using port 3000
lsof -ti:3000

# One-liner to kill running process
lsof -ti:3000 | xargs kill -9
```