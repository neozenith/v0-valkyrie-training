# Browser Support

This application is tested and supported on the following browsers:

## ✅ Supported Browsers

- **Chrome/Chromium** (Desktop & Mobile)
- **Firefox** (Desktop)
- **Edge** (Chromium-based)

## ❌ Not Supported

- **Safari** (Desktop & Mobile) - Dropped due to URL parameter handling inconsistencies
- **Internet Explorer** - Legacy browser

## Testing Configuration

Our Playwright test suite runs against:
- Chromium (Desktop)
- Firefox (Desktop)  
- Mobile Chrome (Pixel 5 viewport)

## Known Issues

### Safari URL Parameter Handling
Safari and Mobile Safari have been removed from our test suite due to inconsistent handling of client-side URL parameter updates. While the application may still function in Safari, we do not guarantee full compatibility or test against these browsers.

The specific issue involves:
- URL parameters not updating when using Next.js router's `replace()` method
- Timing differences in `history.replaceState()` execution
- Mobile Safari's unique handling of client-side routing

## Development Notes

When making changes to routing or URL handling, only test against supported browsers. Do not spend time debugging Safari-specific issues.