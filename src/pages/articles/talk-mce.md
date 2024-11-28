---
layout: ../../layouts/ArticleLayout.astro
title: Meta-circular Evaluators & Infinite Towers of Interpreters
description:
    A talk for Lambda Knights on meta-circular evaluators and infinite towers of interpreters,
    mostly in the context of Lisp.
tags: ['lisp', 'lang-en', 'talk']
publish_date: 2024/11/28
---

# Meta-circle Evaluators & Infinite Towers of Interpreters

This is the post form of a talk I gave for Lambda Knights on meta-circular evaluators and infinite
towers of interpreters, mostly just to talk to people about Lisp.

## What are interpreters?

Let's start with the basics. What is an interpreter?

> An **interpreter (or evaulator)** is a program that executes programs written in some programming
> language.

In other words, an interpreter is a program that takes a program written in some language and runs
it.

There are many interpreters for many languages. For example, Python has the
[CPython](https://en.wikipedia.org/wiki/CPython) interpreter, Ruby has one, JavaScript has multiple
such as [V8](https://v8.dev/) (used by Chrome and NodeJS), [SpiderMonkey](https://spidermonkey.dev/)
(Firefox), [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore) (Safari and
Bun), etc.

For example the following is also an
[interpreter for the Brain\*\*\*\* language](https://rosettacode.org/wiki/Execute_Brain****/Python):

```python
def brainfuck(source):
    loop_ptrs = {}
    loop_stack = []
    for ptr, opcode in enumerate(source):
        if opcode == '[': loop_stack.append(ptr)
        if opcode == ']':
            if not loop_stack:
                source = source[:ptr]
                break
            sptr = loop_stack.pop()
            loop_ptrs[ptr], loop_ptrs[sptr] = sptr, ptr
    if loop_stack:
        raise SyntaxError ("unclosed loops at {}".format(loop_stack))
    tape = collections.defaultdict(int)
    cell = 0
    ptr = 0
    while ptr < len(source):
        opcode = source[ptr]
        if   opcode == '>': cell += 1
        elif opcode == '<': cell -= 1
        elif opcode == '+': tape[cell] += 1
        elif opcode == '-': tape[cell] -= 1
        elif opcode == ',': tape[cell] = ord(sys.stdin.read(1))
        elif opcode == '.': sys.stdout.write(chr(tape[cell]))
        elif (opcode == '[' and not tape[cell]) or \
             (opcode == ']' and tape[cell]): ptr = loop_ptrs[ptr]
        ptr += 1
```

## And what is a meta-circular evaluator?

> A **meta-circular interpreter (or evaluator)** is an interpreter for a language that is written in
> the language itself.

In other words, a meta-circular evaluator is an interpreter for a language that is written in that
same language.

Some examples of meta-circular interpreters:

-   [Java in Java (on Truffle)](https://medium.com/graalvm/java-on-truffle-going-fully-metacircular-215531e3f840)

-   [A tiny self-hosted Forth implementation](https://github.com/kragen/stoneknifeforth)

-   [Lisp in Lisp](https://paulgraham.com/rootsoflisp.html) (this is us)

-   Any language with an `eval` function (gne gne gne)

We are actually going to omit the last one, using the
[**meta-circular evaluator** definition from C2](https://wiki.c2.com/?MetaCircularEvaluator)

> An **evaluator** written in the same language it evaluates is said to be **metacircular** iff
> doing so short-circuits the need to specify the precise semantics, because the key language
> constructs are implemented by themselves, exactly like looking up a word in a dictionary and
> finding that the definition uses the original word. That's the "metacircular" part.

they also say

> A **C compiler written in C** is not a **meta-cirular evaluator**, because the compiler must
> specify extremely detailed and precise semantics for each and every construct. The fact that the
> compiler is written in the target language does not help at all; the same algorithms could be
> translated into Pascal or Java or Ada or Cobol, and it would still be a perfectly good C compiler.

as we will see, this is not the case for Lisp.

## Introduction to Lisp

Lisps have a very simple syntax, which is based on S-expressions. Here are some examples of the most
common syntax elements in Lisp:

-   **Booleans**: `#t`, `#f`

-   **Numbers**: `42`, `3.14`, `-1`, `0`

-   **Strings**: `"Hello, world!"`

-   **Symbols**: `'foo`, `'bar`, `'baz`

-   **Function calls**: `(f (g a b) c d)`, using the convention from other programming languages
    this is equivalent to `f(g(a, b), c, d)`.

### Data structures

Lisp has a few basic data structures:

-   Cons cells

-   Cons cells

-   Cons cells

yeah that's it, so let's talk about cons cells.

A **cons cell** is a pair of values, usually called `car` and `cdr` (that stand for "Contents of the
Address Register" and "Contents of the Decrement Register", respectively due to some historical
reasons this remains the name of the fields in the cons cell).

A cons cell can be created using the `cons` function, and accessed using the `car` and `cdr`

```scm
(define x (cons 1 2)) ; => (1 . 2)
(car x) ; => 1
(cdr x) ; => 2
```

the syntax `(1 . 2)` is used to represent a cons cell. Often we don't use `cons` directly, but we
create chains using the `list` function:

```scm
(define x (list 1 2 3)) ; => (1 2 3)
(car x) ; => 1
(cdr x) ; => (2 3)
```

internally `(1 2 3)` is represented as `(1 . (2 . (3 . ())))` where the `cdr` of each cons cell is a
pointer to the next cons cell and `()` is the empty list or null.

### Functions

In Lisp, functions are first-class citizens, which means that they can be passed as arguments to
other functions, returned from functions, and assigned to variables. Functions are defined using the
`lambda` keyword, which creates an anonymous function.

```scm
(define add (lambda (x y) (+ x y)))
(add 1 2) ; => 3
```

### Environment

When writing a variable name explicitly, the interpreter will look up the value of that variable in
the current environment. The environment is a mapping from variable names to values. For example in
the previous call `x` got bound to the value `1`. There is also a global environment that can be
extended with `define` and updated with `set!`.

```scm
(define x 1)
(set! x 2)
x ; => 2
```

### Quoting

In Lisp, the `quote` function or the `'` character can used to quote a form, which means that the
form is not evaluated. For example:

```scm
(+ 1 2) ; => 3
(quote (+ 1 2)) ; => (+ 1 2)
'(1 2 3) ; => (1 2 3)
```

internally the second expression is represented as a list

```scm
(+ . (1 . (2 . ())))
```

where `+` is the literal symbol `+` and `1`, `2` are the literal numbers `1`, `2`.

## A simple Meta-circular Evaluator

Let's start with a simple calculator that can evaluate simple arithmetic expressions.

```scm
(define (eval expr)
    (cond
        ((number? expr) expr)
        ((eq? (car expr) '+) (+ (eval (cadr expr)) (eval (caddr expr))))
        ((eq? (car expr) '-) (- (eval (cadr expr)) (eval (caddr expr))))
        ((eq? (car expr) '*) (* (eval (cadr expr)) (eval (caddr expr))))
        ((eq? (car expr) '/) (/ (eval (cadr expr)) (eval (caddr expr))))
        (else (error "Unknown operator"))))

(eval '(+ 1 2)) ; => 3
(eval '(* 2 (+ 1 2))) ; => 6
```

Here we are using the `cond` function that will evaluate each condition in order and evaluate the
corresponding expression for the first true condition. The `number?` function is a built-in function
that checks if a value is a number. (Functions like `caddr` are just shortcuts for
`(car (cdr (cdr ...)))`). Let's replace `cond` with the
[`pmatch` macro from @webyrd](https://raw.githubusercontent.com/webyrd/quines/refs/heads/master/pmatch.scm)
that just simplifies the code a bit:

```scm
(define (eval expr)
    (pmatch expr
        (,n (guard (number? n)) n)
        ((+ ,a ,b) (+ (eval a) (eval b)))
        ((* ,a ,b) (* (eval a) (eval b)))
        ((- ,a ,b) (- (eval a) (eval b)))
        ((/ ,a ,b) (/ (eval a) (eval b)))
        (_ (error "Unknown operator"))))
```

### Variables

To add support for variables we need some way to store and retrieve values from an "environment". We
can represent and environment as a function that maps variable names to values. Let's define the two
following helper functions:

```scm
(define empty-env
    (lambda (var) (error "Unbound variable"))
)

(define bind-env
    (lambda (env var val)
        (lambda (v) (if (eq? v var) val (env v)))
    )
)
```

then we can modify the `eval` function to take an environment as an argument:

```scm
(define (eval expr env)
    (pmatch expr
        (,v (guard (symbol? v)) (env v))

        ; rest as before
        ...))
```

and call this for example as

```scm
(eval '(+ x 2) (bind-env empty-env 'x 1)) ; => 3
```

### Functions

We will use a trick to represent functions as native scheme functions, then application will just
become a call to the function

```scm
(define (eval expr env)
    (pmatch expr
        ; ... as before

        ((lambda ,param ,body)
            (lambda (arg) (eval body (bind-env env param arg))))
        ((,f ,arg)
            ((eval f env) (eval arg env)))
        ...))
```

and call this for example as

```scm
(eval '((lambda (x) (+ x 1)) 2) empty-env) ; => 3
```

### Meta-circularity

Actually that's it, we already have a meta-circular evaluator. Let's recap

```scm
(define (eval expr env)
    (pmatch expr
        (,n (guard (number? n)) n)
        (,v (guard (symbol? v)) (env v))

        ((if ,cond-expr ,then-body ,else-body)
            (if (eval cond-expr env) (eval then-body env) (eval else-body env)))

        ((+ ,a ,b) (+ (eval a env) (eval b env)))
        ((* ,a ,b) (* (eval a env) (eval b env)))
        ((- ,a ,b) (- (eval a env) (eval b env)))
        ((/ ,a ,b) (/ (eval a env) (eval b env)))

        ((eq? ,a ,b) (eq? (eval a env) (eval b env)))

        ((lambda (,param) ,body)
            (lambda (arg) (eval body (bind-env env param arg))))
        ((,f ,arg)
            ((eval f env) (eval arg env)))

        (_ (error "Unknown operator"))))
```

If you don't believe me, let's try to compute the factorial using a variation of the Y-combinator
for anonymous recursive functions:

```scm
(define fact-5
  '(((lambda (!)
       (lambda (n)
         ((! !) n)))
      (lambda (!)
        (lambda (n)
          (if (eq? n 0)
            1
            (* n ((! !) (- n 1))))))) 5))

(eval fact-5 empty-env) ; => 120
```

Now let's strip unnecessary things from our beautiful evaluator, things like numbers and arithmetic
(one could still encode them as Church numerals, if and booleans can be encoded as well).

```scm
(define (eval expr env)
    (pmatch expr
        (,v (guard (symbol? v)) (env v))
        ((lambda (,param) ,body)
            (lambda (arg) (eval body (bind-env env param arg))))
        ((,f ,arg)
            ((eval f env) (eval arg env)))))
```

and now we have a somewhat minimal meta-circular evaluator for a lambda calculus like language.

## Code as Data as Code

One of the most interesting things about Lisp is that using quotation and evaluation we can treat
treat code as data we can manipulate (this is what `pmatch` does to add a new construct to the
language through macros). Another view is to treat data as code, that is, to interpret data as code
by defining a specialized interpreter for giving it semantics.

For example we could represent moves on a 2D grid as the following data structure:

```scm
(define moves-example
  '((up 1)
    (right 2)
    (down 3)
    (left 4)))
```

and then interpret this data as code to move a point on a 2D grid:

```scm
(define move (lambda (point moves)
    (let ((x (car point)) (y (cadr point)))
        (pmatch moves
            ((up ,n) (cons x (- y n))
            ((right ,n) (cons (+ x n) y))
            ((down ,n) (cons x (+ y n))
            ((left ,n) (cons (- x n) y))
            (_ (error "Unknown move"))))))))
```

and then we can move a point on the grid using the `move` function:

```scm
(move '(0 0) moves-example) ; => (-2 -2)
```

We will call the process of interpreting code as data as **reification** (bringing code to a _real_
inspectable value) and the process of treating data as code as **reflection** (I have no idea about
why this is called reflection as the terminology is not consistent with the term from OOP).

## Infinite Towers of Interpreters

TODO

## References

-   [Compiling a reflective language using MetaOCaml](https://dl.acm.org/doi/10.1145/2658761.2658775)
    by Kenichi Asai

-   [Collapsing Towers of Interpreters](https://dl.acm.org/doi/10.1145/3158140) by Nada Amin

-   [The most beautiful program ever written by William Byrd](https://www.youtube.com/watch?v=OyfBQmvr2Hc&t=3600s&pp=ugMICgJpdBABGAHKBRZtZXRhY2lyY3VsYXIgZXZhbHVhdG9y)

-   https://github.com/nikitadanilov/3-lisp

-   https://github.com/namin/reflective-towers

-   [3-Lisp: An Infinite Tower of Meta-circular Interpreters](https://www.cofault.com/2022/08/3-lisp-infinite-tower-of-meta-circular.html)

-   [Collapsing Towers of Interpreters by Nada Amin](https://www.youtube.com/watch?v=Ywy_eSzCLi8) by
    Nada Amin (video)

-   [Reflective Towers of Interpreters](https://blog.sigplan.org/2021/08/12/reflective-towers-of-interpreters/)
