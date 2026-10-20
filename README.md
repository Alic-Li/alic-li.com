# ALIC-LI.COM

A bilingual, static-first personal website. Astro + React islands + Tailwind CSS, deployed to Cloudflare Workers.

## Local development

Use **Bun 1.4.3** (the project requires Bun 1.4.x), with **Node.js 24 LTS** available on PATH for Astro and Wrangler’s supported CLI runtime. All installation and scripts still run through Bun. This machine lacked Node; the official checksum-verified Node 24.10.0 runtime was installed under `~/.local/lib` with `~/.local/bin/node`.

```sh
bun ci
bun run dev
bun run check
bun run test
bun run build
bun run preview
```

`bun run dev` starts Astro; `bun run preview` starts Wrangler against the built Worker. Build before preview. Use only bun.lock; do not generate other package-manager lockfiles.

## Configure chat

Copy `.env.example` to `.dev.vars` for local use. Configure `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` as **Worker runtime secrets**, then restart the dev server. Build-time variables alone do not populate a deployed Worker's runtime bindings; the static frontend must never contain these values.

Production secrets (or set the same names under Worker Settings → Variables and Secrets):

```sh
bunx wrangler secret put CF_ACCESS_CLIENT_ID
bunx wrangler secret put CF_ACCESS_CLIENT_SECRET
```

The playground routes four fixed model choices to their respective origins:

| Choice    | Upstream                     |
| --------- | ---------------------------- |
| RWKV 1.5B | `https://api-1b5.rwkvos.com` |
| RWKV 3B   | `https://api-3b.rwkvos.com`  |
| RWKV 7B   | `https://api-7b.rwkvos.com`  |
| RWKV 13B  | `https://api-13b.rwkvos.com` |

The Worker sends the two `CF-Access-Client-*` headers to `/v1/batch/completions` with a single raw prompt in `contents`; it does not use Chat Completions message templating. Model choices are stable routing aliases; each server uses its loaded model. `/api/models` returns the four choices once both secrets and the declared `CHAT_RATE_LIMITER` binding exist.

Thinking is off by default. The exact continuation prefixes are `Assistant: <think></think` (off) and `Assistant: <think` (on), intentionally without a final `>`, matching the supplied model format. Historical assistant turns retain complete think tags. CRLF is normalized; runs of two or more newlines, including whitespace-only blank lines, collapse to one newline within each message. Turns are separated by `\n\n`. Reasoning is shown in an expandable section when enabled.

The proxy preserves the backend's default token stops and removes generated next-turn labels / end-of-text markers across SSE boundaries. Output is limited to 2048 tokens with a 90-second timeout. No live credentials belong in this repository, frontend assets, or build logs.

## Deploy

```sh
bun run check
bun run test
bun run build
bunx wrangler deploy --dry-run
bun run deploy
```

Authenticate Wrangler with your Cloudflare account before actual deployment. Configure `alic-li.com` as a Worker custom domain in that account once domain ownership and routing are ready. This repository does not modify DNS automatically.

### Workers Builds

Connect this repository and set:

- Environment: `BUN_VERSION=1.4.3`, `NODE_VERSION=24.10.0`, `SKIP_DEPENDENCY_INSTALL=true`
- Build command: `bun ci && bun run check && bun run test && bun run build`
- Deploy command: `bun run deploy`
- Preview command: `bunx wrangler preview`

Automatic dependency installation is disabled so `bun ci` is the single reproducible install. If your dashboard supports Bun 1.4.3 automatic installation directly, use it and change the build command to `bun run build` to avoid duplicate installs. Wrangler 4.151.1 supports `wrangler preview` (open beta); its command availability was verified.

## Content

- `/` and `/zh/`: home
- `/about`, `/blog`, `/projects`, `/publications`, `/lab`, `/lab/chat` and corresponding `/zh/` routes
- `src/content/blog/*.mdx`: articles; require title, description, date, lang, translationKey, tags
- `src/lib/i18n.ts`: centralized English and Chinese interface copy
- `src/styles/global.css`: design tokens, responsive layout, themes, accessibility fallbacks

Keep a matching translationKey for translated articles. If the counterpart is missing, the language control opens the destination blog index. Biography, project descriptions, and research details are based on Alic’s supplied resume. Project entries live in `src/lib/projects.ts`; interface and biography translations live in `src/lib/i18n.ts`. The supplied artwork is served as lossless `public/raven.webp` and `public/water.webp`. Both retain the original dimensions and exact RGBA pixels; About places the water illustration behind the content with CSS feathering and rounded corners.

See [architecture decisions](docs/architecture.md) and [verification](docs/verification.md).
