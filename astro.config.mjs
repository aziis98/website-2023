import { defineConfig } from 'astro/config'
import preact from '@astrojs/preact'

import mdx from '@astrojs/mdx'

import remarkMath from 'remark-math'
// import rehypeKatex from 'rehype-katex'

// https://astro.build/config
export default defineConfig({
    outDir: 'out/',
    markdown: {
        remarkPlugins: [remarkMath],
        // rehypePlugins: [rehypeKatex],
        shikiConfig: {
            theme: 'github-light',
        },
    },
    integrations: [
        preact(),
        mdx({
            remarkPlugins: [remarkMath],
            // rehypePlugins: [rehypeKatex],
        }),
    ],
})
