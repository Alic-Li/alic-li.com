# Architecture and dependency decisions

Astro generates English and Chinese pages at build time. React islands handle preferences, the decorative hero, and chat. Only `/api/models` and `/api/chat` run on demand. The production runtime is workerd; Bun is only the package/build/test toolchain.

The supplied checkout and remote were empty on inspection, so this implementation establishes the foundation in that repository. No existing starter files were overwritten.

## Versions and compatibility

Use Bun 1.4.3, pinned in package.json and `.bun-version`. Dependencies use exact versions and bun.lock. Astro 7.4.0 is the registry's stable release at initialization. Its checker supports TypeScript 6, not TypeScript 7; TypeScript 6.0.3 is deliberately pinned. Astro 7 uses the explicit `unified()` processor from `@astrojs/markdown-remark` for remark-math/KaTeX support.

The local machine initially had no Node executable. Falling back to Bun as the CLI runtime caused Miniflare loopback ECONNREFUSED and a hanging workerd prerender. Installing the official, checksum-verified Node 24.10.0 runtime resolved both; Bun continues to own all packages and scripts. Production and prerendering run on workerd. Source maps are explicitly disabled because Tailwind’s Vite transform does not emit them correctly in this combination.

## Visual components

- [React Bits](https://reactbits.dev/) was evaluated. Its source-owned components are useful, but GPU-heavy backgrounds add unnecessary dependencies and continuous rendering to this editorial page. No WebGL background is used.
- [liquid-glass-react](https://github.com/rdev/liquid-glass-react) 1.1.1 supplies an optional decorative lens. The upstream README explicitly documents missing displacement in Safari and Firefox. The repository has a small commit history, so adoption is isolated behind a lazy import, not a foundational layout dependency. No custom displacement or shader code is implemented.
- Chromium desktop can load the lens. Other browsers, mobile, reduced-motion, increased-contrast, and forced-colors use the static decoration. The navigation always uses a readable CSS frosted surface; unsupported backdrop-filter uses an opaque surface. Browser detection is only an enhancement gate, never a functional requirement.
- Motion animates a single transform for three slow cycles and honors reduced motion. There is no perpetual canvas or expensive animated backdrop filter.
- Preferences use Radix Dropdown Menu for keyboard/focus behavior. The local shadcn-style Button uses Radix Slot, CVA, and Tailwind class merging. Mobile navigation is native details/summary and works without JavaScript.

## Content and typography

Translation strings live in `src/lib/i18n.ts`, with Chinese checked against the English dictionary shape. Astro i18n maps Simplified Chinese to `/zh`. Language choice is saved but never causes an automatic redirect. Shared translation keys connect blog articles; a missing translation links to the destination language's blog index.

Geist, Noto Sans SC, and JetBrains Mono are self-hosted Fontsource variable fonts. Noto's distributed unicode-range subsets let browsers fetch only needed character blocks. No runtime Google Fonts request. Fonts use swap, and no entire CJK collection is preloaded.

MDX uses Astro content collections, Shiki dual themes, remark-math, and rehype-katex. KaTeX CSS is only imported on article pages. Content belongs to the site author; chat Markdown never permits raw HTML.

## Chat boundary

Worker secrets configure the exact HTTPS Chat Completions URL, API key, and model allowlist. The browser cannot choose a URL or send a system message. The proxy validates origin, media type, maximum body bytes, message count, roles, per-message length, and model. Cloudflare's rate limit binding allows ten requests per minute per IP. This is basic approximate per-location abuse protection, not a global quota; add provider spending limits and Cloudflare WAF/Turnstile before exposing costly public models.

Requests have a 90-second timeout and 2048-token output cap. Redirects are rejected. Upstream errors are replaced with generic codes. Secrets and conversations are never logged by application code. The response body streams directly; client cancellation propagates via the request signal. Browser history stores at most 30 messages and supports clearing. Storage failure is visible without breaking chat.

Without configured secrets or the limiter, the API fails closed and the UI explains that chat is unavailable. No inference server is included.
