import rss from '@astrojs/rss';
import { createTraduxFromGlob } from 'tradux/astro';
import { availableLanguages as languageDefinitions } from 'tradux/languages';
import { availableLanguageCodes, translationFiles } from '../consts';

const { t } = await createTraduxFromGlob({
	files: translationFiles,
	lang: 'en',
	defaultLanguage: 'en',
	availableLanguages: availableLanguageCodes,
	languageDefinitions: [...languageDefinitions],
});


export async function GET(context) {
	return rss({
		title: t.site.title,
		description: t.site.description,
		site: context.site,
		items: Object.entries(t.blog.posts).map(([slug, post]) => ({
			title: post.title,
			description: post.description,
			pubDate: new Date(post.pubDate),
			link: `/en/blog/${slug}/`,
		})),
	});
}
