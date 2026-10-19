# Initial milestone verification

Verified on 2026-10-19 with Bun 1.4.3, Node 24.10.0, Astro 7.4.0, and Wrangler 4.151.1 on macOS arm64.

## Passed

- `bun ci`: reproducible frozen-lockfile install; no dependency changes.
- `bun run check`: Astro and TypeScript report zero errors, warnings, or hints.
- `bun run test`: nine tests, including origin rejection, missing configuration, rate limits, model/role/body validation, sanitized provider failures, direct streaming, byte-fragmented Chinese SSE, truncated streams, and bounded Chinese conversation history.
- `bun run build`: successful Cloudflare workerd prerender; 17 static HTML pages plus two RSS feeds. Only the API routes need dynamic execution (Astro also emits its standard image endpoint).
- `bunx wrangler deploy --dry-run`: successful bundle validation, assets manifest, and rate limiter binding. Approximately 692 KiB Worker upload / 181 KiB gzipped.
- `bunx wrangler preview --help`: current Wrangler supports Worker Previews.
- `bun run dev --ignore-lock --host 127.0.0.1`: local Astro development serves the homepage. `--ignore-lock` only keeps this agent's preview in the foreground.
- Local `bunx wrangler dev`: English/Chinese home, section, article, and chat routes, RSS and sitemap return HTTP 200; an unknown route returns 404. `/api/models` returns an empty list without secrets, same-origin chat returns 503, and cross-origin chat returns 403.
- Built HTML internal links resolve to generated files; no missing local targets.
- All CJK characters used in source/content fall within the self-hosted Noto Sans SC unicode ranges. No external font URLs occur in generated HTML.
- Chrome desktop visual inspection: light homepage and About page render with the intended spacing, typography, navigation, and decoration. Chinese About route content and controls are present in the accessibility tree.

## Not yet verified

- Live provider streaming: no RWKV endpoint or credentials were supplied. Streaming behavior is tested with OpenAI-compatible fixtures; production API access requires real secrets.
- Actual Cloudflare deployment, custom domain routing, and Workers Builds execution: no remote deployment was performed.
- Full Safari/Firefox/mobile screenshot and keyboard matrix; dark/system theme persistence and OS appearance switching in a controlled browser test; browser-console hydration audit. The implementation includes these behaviors and documented fallbacks, but they still need device verification. Browser automation access became available for desktop review while the user was also navigating the preview; no claim is made that the full interactive acceptance matrix was exercised.

## Local runtime finding

This machine initially had Bun but no Node executable. Running Cloudflare's Miniflare CLI stack under the implicit Bun fallback caused refused loopback requests and stalled workerd prerendering. Installing the official checksum-verified Node 24.10.0 runtime fixed development, production builds, and local Worker requests. The runtime is installed at `~/.local/lib/node-v24.10.0-darwin-arm64`, linked from `~/.local/bin/node`. No npm/yarn/pnpm installation or lockfile is used; Bun remains canonical.

When rebuilding while Wrangler is serving `dist`, restart Wrangler afterward so its asset index reflects the new build.

## Resume and visual refinement — 2026-10-19

- `bun run check`: zero errors, warnings, or hints; TypeScript succeeds.
- `bun run test`: all nine existing tests pass.
- `bun run build`: Cloudflare build and all prerendered routes succeed.
- Built HTML smoke check: local links resolve across all 17 pages; all six projects and the publication link appear in both languages. Published raven bytes match the supplied image exactly.
- Chrome desktop: visually reviewed the light and dark homepage, raven panel, segmented controls, and theme menu. The default System choice and selection of Dark were confirmed through the accessibility tree and screenshot.
- Mobile, Safari/Firefox, reduced-motion emulation, language interaction, and the full keyboard matrix have not been visually verified in this pass. Native Chrome inspection became unavailable while opening responsive tools. Responsive CSS, native-link fallbacks, Motion reduced-motion handling, and Radix menu behavior remain in the implementation.
