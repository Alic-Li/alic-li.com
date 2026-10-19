import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => data.lang === 'zh');
  return rss({
    title: 'Alic Li — 文章',
    description: '关于软件、系统与设计的笔记。',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/zh/blog/${post.data.translationKey}`,
    })),
    customData: '<language>zh-CN</language>',
  });
}
