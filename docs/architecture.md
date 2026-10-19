# Architecture and dependency decisions

Astro generates English and Chinese pages at build time. React islands handle preferences, the decorative hero, and chat. Only `/api/models` and `/api/chat` run on demand. The production runtime is workerd; Bun is only the package/build/test toolchain.

The supplied checkout and remote were empty on inspection, so this implementation establishes the foundation in that repository. No existing starter files were overwritten.

## Versions and compatibility

Use Bun 1.4.3, pinned in package.json and `.bun-version`. Dependencies use exact versions and bun.lock. Astro 7.4.0 is the registry's stable release at initialization. Its checker supports TypeScript 6, not TypeScript 7; TypeScript 6.0.3 is deliberately pinned. Astro 7 uses the explicit `unified()` processor from `@astrojs/markdown-remark` for remark-math/KaTeX support.

The local machine initially had no Node executable. Falling back to Bun as the CLI runtime caused Miniflare loopback ECONNREFUSED and a hanging workerd prerender. Installing the official, checksum-verified Node 24.10.0 runtime resolved both; Bun continues to own all packages and scripts. Production and prerendering run on workerd. Source maps are explicitly disabled because Tailwind’s Vite transform does not emit them correctly in this combination.

## Visual components

- [React Bits](https://reactbits.dev/) was evaluated. Its source-owned components are useful, but GPU-heavy backgrounds add unnecessary dependencies and continuous rendering to this editorial page. No WebGL background is used.
- Navigation and language controls use Motion shared-layout indicators with spring transitions, on CSS glass surfaces with inset highlights and blur. Navigation supports horizontal pointer dragging, selecting on release and cancelling vertical exits. Native links work without hydration; modified clicks preserve browser behavior. Astro ClientRouter handles ordinary navigation and browser history. Navigation and preferences islands persist across swaps and receive updated route/locale props. Native View Transitions slide the main workspace in section order while the header stays still; unsupported browsers and reduced-motion users receive an immediate swap. Stable scrollbar space avoids horizontal shifts between pages.
- The same navigation wraps below the brand and preferences on mobile, with horizontal overflow available at very narrow widths. Touch targets are at least 44px tall.
- The theme button toggles directly between light and dark, using a native button and an accessible action label. Before an explicit choice, the existing System default remains in effect. Choices retain the existing storage key and theme event. Before each document swap the active theme is copied to the new document to prevent a light flash. Both palettes use independent design tokens.
- Reduced motion disables spring transitions and the raven’s short CSS float animation. The unchanged raven image renders without client hydration, with explicit dimensions. The supplied transparent raven sits behind the desktop hero copy, with a soft left-side mask for text legibility; mobile shows the complete illustration below the copy.
- Glass has opaque fallbacks for missing backdrop-filter and increased contrast; forced-colors mode preserves control outlines. No custom rendering or displacement engine is used. Existing dependencies are unchanged.

## Content and typography

Translation strings live in `src/lib/i18n.ts`, with Chinese checked against the English dictionary shape. Astro i18n maps Simplified Chinese to `/zh`. Language choice is saved but never causes an automatic redirect. Shared translation keys connect blog articles; a missing translation links to the destination language's blog index.

Geist, Noto Sans SC, and JetBrains Mono are self-hosted Fontsource variable fonts. Noto's distributed unicode-range subsets let browsers fetch only needed character blocks. No runtime Google Fonts request. Fonts use swap, and no entire CJK collection is preloaded.

MDX uses Astro content collections, Shiki dual themes, remark-math, and rehype-katex. KaTeX CSS is only imported on article pages. Content belongs to the site author; chat Markdown never permits raw HTML.

## Chat boundary

Worker secrets configure the exact HTTPS Chat Completions URL, API key, and model allowlist. The browser cannot choose a URL or send a system message. The proxy validates origin, media type, maximum body bytes, message count, roles, per-message length, and model. Cloudflare's rate limit binding allows ten requests per minute per IP. This is basic approximate per-location abuse protection, not a global quota; add provider spending limits and Cloudflare WAF/Turnstile before exposing costly public models.

Requests have a 90-second timeout and 2048-token output cap. Redirects are rejected. Upstream errors are replaced with generic codes. Secrets and conversations are never logged by application code. The response body streams directly; client cancellation propagates via the request signal. Browser history stores at most 30 messages and supports clearing. Storage failure is visible without breaking chat.

Without configured secrets or the limiter, the API fails closed and the UI explains that chat is unavailable. No inference server is included.
