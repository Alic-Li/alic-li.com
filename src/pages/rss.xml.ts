import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => data.lang === 'en');
  return rss({
    title: 'Alic Li — Writing',
    description: 'Notes on software, systems, and design.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.data.translationKey}`,
    })),
    customData: '<language>en</language>',
  });
}
