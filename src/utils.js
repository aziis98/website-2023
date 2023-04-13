import _ from "lodash";

export async function getRandomRelatedArticles(allArticles, { url, tags }) {
	const allRelated = allArticles.filter((a) => a.url !== url && tags.some((t) => a.frontmatter.tags.includes(t)));
	return _.shuffle(allRelated).slice(0, 3);
}

export function prependBaseUrl(url) {
	// Check if the URL is external
	if (/^(https?:)?\/\//.test(url)) {
		return url;
	}

	const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

	// Qui sto aggiungendo un leading slash al pathname e (ipotesi forte, però dai nessuno a una pagina "/~foo/~foo" ad esempio) sto togliendo il base url dall'href se per sbaglio Astro ce lo mette (succede in qualche caso)
	let newPathname = url;
	if (newPathname.startsWith(baseUrl)) newPathname = newPathname.substr(baseUrl.length);
	if (!newPathname.startsWith("/")) newPathname = "/" + newPathname;

	return baseUrl + newPathname;
}

export function websiteName() {
	if (import.meta.env.BASE_URL === "/") {
		return "aziis98.com";
	}
	if (import.meta.env.BASE_URL === "/~delucreziis/") {
		return "~delucreziis";
	}

	throw new Error(`Unknown website name for base url "${import.meta.env.BASE_URL}"`);
}
