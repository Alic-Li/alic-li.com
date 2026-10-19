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

Copy `.env.example` to `.dev.vars` for local use. Set `RWKV_API_URL` to the full HTTPS OpenAI-compatible Chat Completions endpoint, `RWKV_API_KEY` to the provider key, and `RWKV_MODELS` to a comma-separated model allowlist. Restart the dev server after changing configuration.

Production secrets:

```sh
bunx wrangler secret put RWKV_API_URL
bunx wrangler secret put RWKV_API_KEY
bunx wrangler secret put RWKV_MODELS
```

The `CHAT_RATE_LIMITER` binding is declared in wrangler.jsonc. Chat remains unavailable until configuration is complete. Never expose provider credentials through PUBLIC_ variables.

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
