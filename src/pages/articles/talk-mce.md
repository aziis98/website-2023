---
layout: ../../layouts/ArticleLayout.astro
title: Meta-circular Evaluators & Infinite Towers of Interpreters
description:
    A talk for Lambda Knights on meta-circular evaluators and infinite towers of interpreters,
    mostly in the context of Lisp.
tags: ['lisp', 'mce', 'talk', 'lang-en']
publish_date: 2024/11/28
---

# Meta-circle Evaluators & Infinite Towers of Interpreters

This is the post form of a talk I gave for Lambda Knights on meta-circular evaluators and infinite
towers of interpreters, mostly just to talk to people about Lisp. You can also
[download the original slides](https://static.aziis98.com/website/mce-slides.pdf).

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
[interpreter for the Brain\*\*\*\* language](https://rosettacode.org/wiki/Execute_Brain****/Python)

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

-   Any language with an `eval` function (like Python, Ruby, JavaScript, etc.)

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

as we will see, Lisp is a language that is particularly well-suited for writing meta-circular
evaluators.

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

well yeah that's it, so let's talk about cons cells.

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
following helper functions

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

then we can modify the `eval` function to take an environment as an argument

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

For example we could represent moves on a 2D grid as the following data structure

```scm
(define moves-example
  '((up 1)
    (right 2)
    (down 3)
    (left 4)))
```

and then interpret this data as code to move a point on a 2D grid

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

and then we can move a point on the grid using the `move` function

```scm
(move '(0 0) moves-example) ; => (-2 -2)
```

We will call the process of interpreting code as data as **reification** (bringing code to a _real_
inspectable value) and the process of treating data as code as **reflection** (I have no idea about
why this is called reflection as the terminology is not consistent with the term from OOP).

## Infinite Towers of Interpreters

This section is inspired by a talk I saw by Nada Amin called
"[Programming Should Eat Itself](https://www.youtube.com/watch?v=SrKj4hYic5A)" where she talks about
the concept of "collapsing towers of interpreters" and "reflective towers of interpreters".

Interpreters can be composed with one another, for example if we have an interpreter of Javascript
written in Python and an interpreter of Bash written in Javascript, we can compose them to have an
interpreter of Bash that is run by Python.

We just talked about how Lisp is a language that is particularly well-suited for writing
meta-circular evaluators, so we can write an interpreter for Lisp in Lisp.

Suppose now the follwing, we start with some Lisp code at level $0$: this code is interpreted by the
Lisp interpreter written at level $1$. Nothing special here. But now suppose that the code at level
$1$ is interpreted by another Lisp interpreter written at level $2$, and so on. We can keep going on
and on, and we can have an infinite tower of interpreters. Can this even be run on a computer? In
the '80s, [Brian C. Smith in his PhD thesis](https://dspace.mit.edu/handle/1721.1/15961) showed that
this is possible, briefly, by lazily synthetizing new meta-levels on demand.

### Black

An implementation of this concept is the [Black](github.com/readevalprintlove/black) language. For
example we can try it out on top of Chez Scheme as follows

```bash shell
$ git clone https://github.com/readevalprintlove/black
$ cd black

$ rlwrap -n chez

# Load the Black interpreter on top of Chez Scheme
> (load "init.scm")

# The first number is the level, the second is prompt counter
0-0: start
0-1>
```

We can use this as a normal interpreter, for example

```
0-1> (+ 1 2)
3
0-2> ((lambda (x) x) 42)
42
0-3>
```

But we can also go up a level up using the `eval-at-metalevel` function (also aliased as `EM`)

```
0-1> (EM (+ 1 2))
3
```

Here the expression `(+ 1 2)` is evaluated at the meta-level $1$. We can keep going up for example
with `(EM (EM (+ 1 2)))`. At each level we have a reference to the interpreter that runs the code
below called `base-eval`, this in turn calls various functions like `eval-var` that evaluates
variables, ...

Nothing limits us from changing this functions, for example the following _instruments_ variable
evaluation to count how many times variables are resolved

```scm
(EM
  (begin
    (define counter 0)
    (define old-eval-var eval-var)
    (set! eval-var
      (lambda (exp env cont)
        (set! counter (+ counter 1))
        (old-eval-var exp env cont)))))
```

This show how powerful this concept is, this let's us change the semantics of the language at any
level.

### Collapsing Towers

In other papers Kenichi Asai and Nada Amin talk about the concept of _collapsing_ these towers of
interpreters to a single optimized interpreter. I've not yet read how this is done precisely and if
this uses more advanced techniques than inlining or partial evaluation.

In [Collapsing Towers of Interpreters](https://dl.acm.org/doi/10.1145/3158140) they develop Pink and
Purple, two languages that are designed to be able to collapse these towers of interpreters
efficiently.

What are the implications of this? This is actually a very powerful concept in the context of
virtualization and sandboxing, for example citing the abstract of the paper

> In the real world, a use case might be Python code executed by an x86 runtime, on a CPU emulated
> in a JavaScript VM, running on an ARM CPU. Collapsing such a tower can not only exponentially
> improve runtime performance, but also enable the use of base-language tools for interpreted
> programs, e.g., for analysis and verification. In this paper, we lay the foundations in an
> idealized but realistic setting.

## Conclusion

In this talk we have introduced the concept of meta-circular evaluators and infinite towers of
interpreters. Maybe you are now convinced that Lisps have very profound and interesting properties,
and that they are a very powerful tool for writing and studying programming languages.

## References

-   [Compiling a reflective language using MetaOCaml](https://dl.acm.org/doi/10.1145/2658761.2658775)
    by Kenichi Asai

-   [Collapsing Towers of Interpreters](https://dl.acm.org/doi/10.1145/3158140) by Nada Amin et al.

-   [The most beautiful program ever written by William Byrd](https://www.youtube.com/watch?v=OyfBQmvr2Hc&t=3600s&pp=ugMICgJpdBABGAHKBRZtZXRhY2lyY3VsYXIgZXZhbHVhdG9y)

-   https://github.com/nikitadanilov/3-lisp

-   https://github.com/namin/reflective-towers

-   [3-Lisp: An Infinite Tower of Meta-circular Interpreters](https://www.cofault.com/2022/08/3-lisp-infinite-tower-of-meta-circular.html)

-   [Collapsing Towers of Interpreters by Nada Amin](https://www.youtube.com/watch?v=Ywy_eSzCLi8) by
    Nada Amin (video)

-   [Reflective Towers of Interpreters](https://blog.sigplan.org/2021/08/12/reflective-towers-of-interpreters/)
