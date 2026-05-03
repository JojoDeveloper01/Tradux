import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
const { t } = await initTradux(traduxCookie);


export async function GET(context) {
	const posts = await getCollection('blog');
	return rss({
		title: t.site.title,
		description: t.site.description,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
	});
}
