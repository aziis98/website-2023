---
layout: ../../layouts/ArticleLayout.astro
title: Holed HTML Parser
description: |
    Let's write a small parser for js string template literals containing HTML
tags: ['js', 'frontend', 'lang-en']
publish_date: 2024/12/23
draft: true
---

# Holed HTML Parser

I want to learn how to parse string template literals like

<!-- prettier-ignore -->
```js
html`<ul>
  ${items.value.map(({ id, text }) => html`
    <li key=${id}>${text}</li>
  `)}
</ul>`
```

This is a case of a slightly more advanced parsing where the input can contain holes or already
parsed segments.

Let's start by writing a simple HTML parser that we will later change to support holed parsing

## Basic HTML Parser

Here is the basic structure of our simple parser. Our main parser returns a `ParseResult` containing
all parsed nodes and the remaining text that could not be parsed.

```ts
type Node = {
  tag: string;
  attributes: Record<string, string>;
  children: (Node | string)[];
}

type ParseResult = {
  children: (Node | string)[];
  remaining: string;
}

function parseHTML(source: string): ParseResult {
  ...
}
```

For example parsing the string `Hello <em>World</em>!</p>` returns the `ParseResult`

```js
{
  children: [
    "Hello",
    {
      tag: "em",
      attributes: {},
      children: [
        "World"
      ],
    },
    "!"
  ],
  remaining: "</p>",
}
```

This is a really nice technique as it allows us to have a stateless parser, we can write smaller
parsers following this same signature and then compose them easily.

```ts
const children: (Node | string)[] = []
let rest = source

while (rest.length > 0) {
    rest = rest.trim()

    if (rest.startsWith('<')) {
        if (rest.startsWith('</')) break

        const [tag, afterTag] = parseTagName(rest)
        const [attributes, afterAttributes] = parseAttributes(afterTag)

        if (afterAttributes.startsWith('/>')) {
            children.push({ tag, attributes, children: [] })
            rest = afterAttributes.slice(2)
        } else if (afterAttributes.startsWith('>')) {
            const { children: innerChildren, remaining } = parseHTML(afterAttributes.slice(1))
            children.push({ tag, attributes, children: innerChildren })

            const endTag = `</${tag}>`
            if (!remaining.startsWith(endTag)) throw new Error(`Unclosed tag: ${tag}`)
            rest = remaining.slice(endTag.length)
        } else {
            throw new Error('Malformed tag')
        }
    } else {
        const [textNode, afterText] = parseTextNode(rest)
        if (textNode) children.push(textNode)
        rest = afterText
    }
}

return { children, remaining: rest }
```

## Holed HTML Parser

```ts
type Node = {
    tag: string
    attributes: Record<string, any>
    children: Node[]
}

function html(strings: string[], ...values: any[]): Node[] {
    const nodes = strings.flatMap((s, i) => (i === 0 ? [s] : [values[i - 1], s]))
    return parseNodes(nodes)
}

function parseNodes(nodes) {}
```
