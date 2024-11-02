---
layout: ../../layouts/ArticleLayout.astro
title: (WIP) Pangenome Graphs in Rust
description: Recently I've done a project in Rust for a course at my university called "Algorithms and Data Structures" about Pangenome Graphs.
tags: ["rust", "pangenome", "graphs", "lang-en"]
publish_date: 2024/11/02
---

# (WIP) Pangenome Graphs in Rust

I recently did a project for a course at my university called "Algorithms and Data Structures". It was about "Pangenome Graphs", we had to implement parsing for a specific format and then implement some algorithms on top of it.

~Mostly for the meme~ I decided to do the project in Rust, and I'm quite happy with the result. I almost never have the chance to write Rust code, so it was nice for a change.

The project is open-source and you can find it on my GitHub profile at [aziis98/asd-2024](https://github.com/aziis98/asd-2024).

## What are Pangenome Graphs?

Pangenome Graphs are a data structure used in bioinformatics to represent the genetic information of a population. They are are used to store multiple genomes in a single file, and this is almost all I know about them.

## Parsing the GFA format

We had to implement a small parser for the [GFA format](http://gfa-spec.github.io/GFA-spec/GFA1.html), which is a simple text format that describes a Pangenome Graph, here is an example:

```
H	VN:Z:1.0
S	11	G
S	12	A
S	13	T
S	14	T
S	15	A
S	16	C
S	17	A
S	21	G
S	22	A
S	23	T
S	24	T
S	25	A
L	11	+	12	+	*
L	11	+	13	+	*
L	12	+	14	+	*
L	13	+	14	+	*
L	14	+	15	+	*
L	14	+	16	+	*
L	15	+	17	+	*
L	16	+	17	+	*
L	21	+	22	+	*
L	21	+	23	+	*
L	22	+	24	+	*
L	23	+	24	-	*
L	24	+	25	+	*
P	A	11+,12+,14+,15+,17+	*,*,*,*
P	B	21+,22+,24+,25+	*,*,*
W	sample	1	A	0	5	>11>12>14>15>17
W	sample	2	A	0	5	>11>13>14>16>17
W	sample	1	B	0	5	>21>22>24<23<21
W	sample	2	B	0	4	>21>22>24>25
```

Here is a brief explanation of the format:

- `H` is the header, it contains an id for this graph.

- `S` are the sequences, each node in the graph is a sequence of DNA bases.

- `L` are the links, they connect two nodes in the graph. Nodes can be followed in forward or reverse direction (indicated by `+` or `-`). If the node is followed in the reverse direction then its sequence is reversed and complemented (A -> T, T -> A, G -> C, C -> G).

- `P` are "example" paths, I think they are used to tell how to reconstruct each specific genome sequence from the graph.

Actuall I'm not really sure about the difference between the `P` and `W` records, they seem to be doing mostly the same thing.

### The parser

The dataset we were given were quite large, so I decided to use extensively the [indicatif](https://crates.io/crates/indicatif) crate to show a progress bar while doing the various operations. For example, the parser takes a reader and the number of lines in the file to process.

```rust
pub fn parse_source<R: Read>(reader: R, line_count: u64) -> io::Result<Vec<Entry>> {
    let mut entries = Vec::new();
    let mut skipped = Vec::new();

    for line in BufReader::new(reader).lines().progress_count(line_count) {
        ...

        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let entry = match line.chars().next().unwrap() {
            'H' => parse_header(line),
            'S' => parse_segment(line),
            'L' => parse_link(line),
            _ => {
                skipped.push(line.chars().next().expect("got empty line"));
                continue;
            }
        };

        entries.push(entry);
    }
    ...
    Ok(entries)
}
```

#### Skipped Line Compaction

I thing I really like about Web Browser's DevTools is the ability to automatically count repeated `console.log` messages, I wanted to do something similar for the parser. I wanted to see how many lines of each type were skipped without flooding the console with messages.

```rust
for (s, count) in skipped.iter().fold(Vec::new(), |mut acc, s| {
    if let Some((last, count)) = acc.last_mut() {
        if *last == s {
            *count += 1;
        } else {
            acc.push((s, 1));
        }
    } else {
        acc.push((s, 1));
    }

    acc
}) {
    eprintln!("Skipped {} lines of type: {}", count, s);
}
```

I think this is a nice way to compact the skipped lines and print them in a single message. Some day I might try to write a nice logging library that does this and maybe supports pushing indentation scopes (really useful for recursive functions and nice output formatting).

TODO: ...

## `Copy` vs `Clone`

Initially I didn't really know the difference between `Copy` and `Clone` in Rust. I thought that `Copy` was more efficient than `Clone` and so I should always use `Copy` when possible.

This made me end up trying to write specializations for being `Copy` or `Clone`, but I later found out that `Copy: Clone`. Actually Rust is smart enough to know that if a type is `Copy` then it can be `Clone`d without any overhead. This means that to write a generic function that works with both `Copy` and `Clone` types one can simply use `T: Clone` as a bound.

## Edge Type Classification

The next step was to classify the edge types (tree, forward, backward, cross) in the graph. To do this I found an implementation using node visit times.

After some wrong attempts I finally found a working solution, here is the code:

```python
def dfs(g):
    results = DFSResult()
    for vertex in g.vertices():
        if vertex not in results.parent:
            dfs_visit(g, vertex, results)
    
    return results

def dfs_visit(g, v, results, parent=None):
    results.parent[v] = parent
    results.t += 1
    results.start_time[v] = results.t
    if parent is not None:
        results.edges[(parent, v)] = 'tree'

    for n in g.neighbors(v):
        if n not in results.parent:  # n is not visited
            dfs_visit(g, n, results, v)
        elif n not in results.finish_time:
            results.edges[(v, n)] = 'back'
        elif results.start_time[v] < results.start_time[n]:
            results.edges[(v, n)] = 'forward'
        else:
            results.edges[(v, n)] = 'cross'

    results.t += 1
    results.finish_time[v] = results.t
    results.order.append(v)
```

I tried to naively translate this to Rust, but this function is recursive and ended up in stack overflow for the large test datasets. So I tried to rewrite it using an iterative approach.

Let's first notice the following about the call stack of the recursive function:

```
> call to dfs(g)
    > call to dfs_visit(g, v_1)
    . for n in g.neighbors(v_1)
        . n = n_1 (not visited)
        > call to dfs_visit(g, n_1)
            ...
        
        . n = n_2 (not visited)
        > call to dfs_visit(g, n_2)
            ...
        
        . n = n_3 (maybe this now is already visited)
        > skipping the call to dfs_visit
            
        . n = n_4 (not visited)
        > call to dfs_visit(g, n_4)
            ...
```

As we can see when we call `dfs_visit` we are actually pausing the current function, doing the recursive call with new arguments and then resuming the current function from where we left off in the for loop. So to convert this to an iterative function we need to keep track of how to resume and _"continue"_ the previous function.

The extreme of doing this is the style of ["continuation-passing style" (CPS)](https://en.wikipedia.org/wiki/Continuation-passing_style) where each statement is a function that takes a continuation function as an argument that the statement will call with the new state.

The main idea is to convert the recursive function to an iterative one using a stack of continuations represented as a state machine. Firstly I converted the recursive Python function to an iterative (Rust is not a good language for fast prototyping):

```python
def classify_iter(g):
    edges = {}
    visited = set()
    t = 0
    start_time = {}
    finish_time = {}

    for u in g.vertices():
        if u in visited:
            continue

        continuations = [('node:start', u, None)]

        while len(continuations) > 0:
            state, u, more = continuations.pop()

            if state == 'node:start':
                continuations.append(('node:end', u, None))

                parent = more

                visited.add(u)
                t += 1
                start_time[u] = t

                if parent is not None:
                    edges[(parent, u)] = 'tree'

                continuations.append(('node:neighbors', u, 0))
            elif state == 'node:neighbors':
                i = more
                
                neighbors = g.neighbors(u)[i:]
                for i in range(len(neighbors)):
                    v = neighbors[i]

                    if v not in visited:
                        continuations.append(('node:neighbors', u, i + 1))
                        continuations.append(('node:start', v, u))
                        break
                    elif v not in finish_time:
                        edges[(u, v)] = 'back'
                    elif start_time[u] < start_time[v]:
                        edges[(u, v)] = 'forward'
                    else:
                        edges[(u, v)] = 'cross'

            elif state == 'node:end':
                t += 1
                finish_time[u] = t

    return edges
```

Here the continuation stack is a list of tuples (this will later become a nice enum in Rust). The `more` parameter is used to pass additional information between states.

TODO: ...

## Libraries

### argh

I initially tried to use `clap` for the CLI, but I found it a bit too complex for my use case as I initally wanted to have multiple sub-commands. Then I found `argh` from Google that has a really nice annotation-based API for defining CLI arguments.

```rust
#[derive(FromArgs, PartialEq, Debug)]
/// Strumento CLI per il progetto di Algoritmi e Strutture Dati 2024
struct CliTool {
    #[argh(option, short = 'i')]
    /// file to read
    input: String,

    #[argh(option, short = 'c', default = "1")]
    /// number of paths to visit
    path_count: usize,

    #[argh(option, short = 'p', default = "\"ACGT\".to_string()")]
    /// k-mer pattern to search
    pattern: String,

    #[argh(option, short = 'k', default = "4")]
    /// k-mer length
    kmer_size: usize,
}
```

even for sub-commands it's quite simple, previously I had the following

```rust
#[derive(FromArgs, PartialEq, Debug)]
struct CliTool {
    #[argh(subcommand)]
    nested: CliSubcommands,
}

#[derive(FromArgs, PartialEq, Debug)]
#[argh(subcommand)]
enum CliSubcommands {
    Show(CommandShow),
}

#[derive(FromArgs, PartialEq, Debug)]
/// Parse and show the content of a file
#[argh(subcommand, name = "show")]
struct CommandShow {
    #[argh(option, short = 'i')]
    /// file to read
    input: String,
    #[argh(option, short = 'c', default = "1")]
    /// number of paths to visit
    path_count: usize,
    #[argh(option, short = 'p', default = "\"ACGT\".to_string()")]
    /// k-mer pattern to search
    pattern: String,
    #[argh(option, short = 'k', default = "4")]
    /// k-mer length
    k: usize,
}
```

that was very nice to use with match statements.

### indicatif

I knew Rust had a crate similar to `tqdm` in Python, so I searched for it and found `indicatif`. It's quite simple to use for iterators that have a known length as one can simply call `.iter().progress()` on any iterator using the provided extension trait.

I don't know how much overhead this adds to the program, but I have multiple functions that take some minutes to run and this lets me know if the program is still running or if it's stuck without flooding the console with `println!` messages.

The only problem I had was that I wanted to show a progress bar even for the parsing of the file, but I didn't know the length of the file before reading it. I solved this by simply doing a first scan of the file for `\n` followed by the actualy parsing. I'm not too sure but when I added this the second run seemed a bit faster then before maybe because the first scan brings the file into the filesystem cache.

## Conclusion

TODO: ...
