---
layout: ../../layouts/ArticleLayout.astro
title: Service Locator in Go (with Generics)
description: In this article I will talk about "sl", my small service locator library written in Go.
tags: ["go", "library", "sl", "lang-en"]
publish_date: 2023/07/02
draft: true
---

# Service Locator in Go (with Generics)

> This is a complementary post to the GitHub repo I recently published
>
> <> 

Recently we are working on a new website for [PHC](https://poisson.phc.dm.unipi.it/) as the current one is relatively old. 

[...]

As writing this whole project in Go would be relatively complex, we want to try and use dependency injection and test our code as much as possible.

[...]

## The Problem

So to simplify writing various services I opted for using a **service locator** instead of simple _dependency injection_.

### Recap about _Dependency Injection_

[...]

### Recap about _Service Locators_

[...]

### Other existing projects

I was amazed when I saw <https://github.com/uber-go/dig>, the way they do things with reflection and anonymous functions is extremely sophisticated. They also made a more advanced framework that uses _dig_ called <https://uber-go.github.io/fx/> with more options for hooking into the lifecycle of services.

The thing I didn't like about these two is that they both use reflection and are "pre-generics" libraries so use strings and `interface{}` in many places.

So I made `sl` with the following features in mind

-   Ability to create various services without telling the service locator explicitly about dependencies. The system should solve them on it's own

-   Use generics to have a type-safe interface (internally I still use a `map[any]any` but it's access is made safe by the "slot pattern" as we will see later)

-   A plugin system to easily compose the full application during production or compose a partial for tests. We should also be able to execute some setup operations in order in a deterministic order.

## How SL works

### Slots

### Hooks

## Conclusion

This is just a small library but this shows that now we can make safer libraries with the use of generics.

[...]