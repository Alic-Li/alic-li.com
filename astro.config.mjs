import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export default defineConfig({
  site: 'https://alic-li.com',
  output: 'static',
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  integrations: [
    react(),
    mdx(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', zh: 'zh-CN' } },
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', { path: 'zh', codes: ['zh-CN'] }],
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()], build: { sourcemap: false } },
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
