---
layout: ../../layouts/ArticleLayout.astro
title: Let's Build a JS Framework from Scratch
description: |
  In this post we will create a small clone of VueJS and Preact to understand how they work internally.
tags: ["js", "frontend", "lang-en"]
publish_date: 2024/12/23
draft: true
---

# Let's Build a JS Framework from Scratch

There are two main factions in web development, the one that prefer [React and JSX-based approaches](https://legacy.reactjs.org/docs/introducing-jsx.html) and the one that prefer [VueJS approach of single file components](https://vuejs.org/guide/scaling-up/sfc.html) with a custom extension of HTML syntax (for example Svelte also falls in this category). There is also the Lit-approach of using string literals to write jsx-like code in vanilla js

<!-- prettier-ignore -->
```html
<ul>
  <li v-for="{ id, text } in items" :key="id">
    {{ text }}
  </li>
</ul>
```

```jsx
<ul>
  {items.value.map(({ id, text }) => (
    <li key={id}>{text}</li>
  ))}
</ul>
```

<!-- prettier-ignore -->
```js
html`<ul>
  ${items.value.map(({ id, text }) => html`
    <li key=${id}>${text}</li>
  `)}
</ul>`
```

Who am I for deciding what's the best, let's try to support all of them! If we don't want to keep rewriting all the things we should try write a generic framework where we can plug-in our favorite template system.

> I'm not going to care too much about speed in this project because this is mostly for fun and educational purposes. Also all work that could be done using a compilation step that is not trivial jsx to js transpilation is going to be banned (_this is post_ isn't about compilers, maybe one about compilation will come later).
