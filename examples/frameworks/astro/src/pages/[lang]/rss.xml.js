import rss from '@astrojs/rss';
import { createTraduxFromGlob } from 'tradux/astro';
import { availableLanguages as languageDefinitions } from 'tradux/languages';
import { availableLanguageCodes, translationFiles } from '../../consts';

export function getStaticPaths() {
	return availableLanguageCodes.map((lang) => ({ params: { lang } }));
}

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

	return rss({
		title: t.site.title,
		description: t.site.description,
		site: context.site,
		items: Object.entries(t.blog.posts).map(([slug, post]) => ({
			title: post.title,
			description: post.description,
			pubDate: new Date(post.pubDate),
			link: `/${lang}/blog/${slug}/`,
		})),
	});
}
