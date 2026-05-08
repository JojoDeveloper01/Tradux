import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { createTraduxFromGlob } from 'tradux/astro';
import { availableLanguages as languageDefinitions } from 'tradux/languages';
import { availableLanguageCodes, translationFiles } from '../../consts';

export async function GET(context) {
	const lang = availableLanguageCodes.includes(context.params.lang)
		? context.params.lang
		: 'en';
	const { t } = await createTraduxFromGlob({
		files: translationFiles,
		lang,
		defaultLanguage: 'en',
		availableLanguages: availableLanguageCodes,
		languageDefinitions: [...languageDefinitions],
	});
	const posts = await getCollection('blog');

	return rss({
		title: t.site.title,
		description: t.site.description,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/${lang}/blog/${post.id}/`,
		})),
	});
}
