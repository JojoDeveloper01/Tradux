import { initTradux } from "tradux";

const { t } = await initTradux();

// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = t.site.title;
export const SITE_DESCRIPTION = t.site.description;
