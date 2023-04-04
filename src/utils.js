import _ from "lodash";

export async function getRandomRelatedArticles(allArticles, { url, tags }) {
	const allRelated = allArticles.filter(a => a.url !== url && tags.some(t => a.frontmatter.tags.includes(t)))
	return _.shuffle(allRelated).slice(0, 3)
}