---
layout: ../../layouts/ArticleLayout.astro
title: Creating a language in Go
description: First post in a series about creating a new programming language from scratch in Go
tags: ["go", "language", "parsers", "lang-en"]
publish_date: 2023/05/13
draft: true
---

# Creating a language in Go

I really like writing parsers and interpreters but most of my projects go unfinished so this time I will try to keep track of the process in a series of blog posts.

I'll start from a small hand written _lexer_ and _parser_, then we will work on the _interpreter_.

## Introduction

Let's introduce first the language we are going to write. It's going to be an [M-expression](https://en.wikipedia.org/wiki/M-expression) (lisp but with the first argument before the parenthesis) inspired language with operators and "command" function calls.

For example all the following are equivalent

```
println("Hello", "World!")

println "Hello", "World!"

println "Hello" "World!"
```

To keep the language simple we will add binary operators without precedence with right-associativity by default. This is so that assignment can be written like `a := 1 + 2` (equivalent to `(a := (1 + 2))`) and not like `a := (1 + 2)`.

One thing I want to borrow from lisps is the _quote operator_. In this language we will quote single expressions with `#`, for example `#foo` and `#bar` are just random symbols that evaluate to themself. 

Now we have the problem that we cannot represent lists just by `#(1 2 3)` because there's no valid callee. We must write something like `#list(1, 2, 3)` to quote a list of expressions at this point. 

For this reason we will add `{...}` as a quotation operator for more than one expression, for example `{ foo; bar }` is equivalent to `block(foo, bar)`.

Using this we will be able to implement at the interpreter level all basic control flow constructs as follows

```
if condition {
    ...
}

match value {
    case condition { ... }
    case condition { ... }
    default { ... }
}

for items (item) => {
    ...
}
```

that will get parsed correctly as

``` 
if(condition, {
    ...
})

match(value, {
    case(condition, { ... })
    case(condition, { ... })
    default({ ... })
})

for(items, (item) => {
    ...
})
``` 

We'll later implement `=>` as a _binary operator macro_ that produces a lambda function. 

One important thing to notice about function call precedence is that the parentheses-less syntax will be legal only if its the first thing in an expression, so for example 

```
foo bar 42 (baz 111 "example")
```

is equivalent to 

```
foo(bar, 42, baz(111, "example"))
```

## Notes

- Right associativity also gives us a nice way to implement map and filter, for example `items @* item => item * 2` or `items @/ item => item > 10` is equivalent to `(items @* (item => (item * 2)))`. 

    Chaining cannot be just done by `items @* timesTwo @/ geqTen` because this gets parsed as `(items @* (timesTwo @/ geqTen))` while in this case we want `((items @* timesTwo) @/ geqTen)` so we can add something like

    ```
    (* every line gets executed with "_" as previous value *)
    pipe items {
        _ @* timesTwo
        _ @/ geqTen
        _ @+ plus
    }
    ```

- `foo.bar.baz` is left associative and is equivalent to `of(of(foo, #bar), #baz)`

    - **Idea:** Make only operators _starting with_ "`.`" left-associative, for example `items .* timesTwo ./ geqTen` gets parses as expected. Also `..` can be used as a pipe operator

        ```
        value
        .. fnCall1
        .. fnCall2
        .. fnCall3
        ```

        would be the same as

        ```
        (((value .. fnCall1) .. fnCall2) .. fnCall3)
        ```

- as sad before `=>` can be an operator macro for _lambdas_, for example if "`+@^@+`" is some custom operator then `lhs +@^@+ rhs` is equivalent to `#"+@^@+"(lhs, rhs)`