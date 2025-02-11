---
layout: ../../layouts/ArticleLayout.astro
title: Using Spack for a C project
description:
    Review of using Spack for managing a C project I'm working on for a uni
    project
tags: ['spack', 'c', 'mpi', 'cluster', 'lang-en']
publish_date: 2025/02/11
---

# Using Spack

## Introduction

Recently I've been working on an university C project. In this project I have to
implement the Arnoldi Iteration for a beowulf cluster we have in our department.
This project is written in C and uses MPI through PETSc, a library that provides
distributed matrix and vector math operations.

In this post I will describe how I setup my project using Spack, a package
manager for scientific computing and how I've integrated it with VSCode for a
better development experience.

### TL;DR

#### IDE integration

-   In your `CMakeLists.txt` add the following

    ```
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
    ```

    or call CMake by passing that option directly as
    `cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..` when doing a build.

-   `.vscode/settings.json`

    ```json
    {
        "clangd.arguments": [
            "-background-index",
            "-compile-commands-dir=build/"
        ]
    }
    ```

#### Spack

-   Install Spack

    ```bash shell
    $ git clone -c feature.manyFiles=true --depth=2 https://github.com/spack/spack.git
    $ source spack/share/spack/setup-env.sh
    ```

-   Spack command cheatsheet

    ```bash shell
    # Discover available compilers
    $ spack compiler list
    $ spack compiler find

    # Install needed deps to local cache (then available in all envs)
    $ spack install <spec>

    # Create and activate an environment
    $ spack env create ./my-env
    $ spack env activate ./my-env

    # Add dependency to this environment
    $ spack add <spec>

    # Install missing dependencies
    $ spack concretize

    # Load package in current shell (exposes binaries in bin/, libs in lib/, ...)
    $ spack load <package>
    ```

#### CMake

After the first run of `cmake ..` you can just run `make` and it will also
rebuild cmake related files if needed.

```bash shell
# To build a CMake project
$ mkdir build
$ cd build
$ cmake ..
$ make

# To run an MPI program
$ mpirun -n 4 ./my-program
```

---

### Setup & Package Installation

First you need to install Spack, you can do this by cloning the repository and
sourcing the setup script for your shell. After that you can install the needed
dependencies to your local cache. Many dependencies I used took a long time to
compile so this was a good way to avoid recompiling them in every environment.

```bash shell
# Manually install spack
$ git clone -c feature.manyFiles=true --depth=2 https://github.com/spack/spack.git
$ . spack/share/spack/setup-env.sh # or the one for your shell

# First discover available compilers
$ spack compiler list
$ spack compiler find

# Install needed deps to local cache (then available in all envs)
$ spack install <spec>
```

### Environments

I really like modern package managers that have a file with all needed
dependencies (NodeJS has `package.json`, Python has `requirements.txt`, Rust has
`Cargo.toml` and so on). Spack has a similar concept called "environments" that
mostly work like virtualenvs in Python. This is how you can create and activate
an environment.

```bash shell
$ spack env create ./my-env
$ spack env activate ./my-env

# Add dependency to this environment
$ spack add <spec>

# Magic...
$ spack concretize

# Load package in current shell (exposes binaries in bin/, libs in lib/, ...)
$ spack load <package>
```

The major difference from classical package managers is that one can install the
same package with different options, _dependencies_ and even compiled with
different compilers.

A **spec** is a string that describes a package and its dependencies. For
example to cite the Spack documentation, an example spec is the following

```
mpileaks @1.2:1.4 %gcc@4.7.5 +debug -qt target=x86_64 ^callpath @1.1 %gcc@4.7.2
```

> If provided to `spack install`, this will install the `mpileaks` library at
> some version between `1.2` and `1.4` (inclusive), built using `gcc` at version
> `4.7.5` for a generic `x86_64` architecture, with `debug` options enabled, and
> without `qt` support. Additionally, it says to link it with the `callpath`
> library (which it depends on), and to build `callpath` with `gcc` version
> `4.7.2`. Most specs will not be as complicated as this one, but this is a good
> example of what is possible with specs.

For clarity, here is the breakdown of the spec in a yaml-like format

```
mpileaks:
  version: 1.2:1.4
  compiler:
    name: gcc
    version: 4.7.5
  options:
    - debug
    - ~qt
  target: x86_64
  dependencies:
    callpath:
      version: 1.1
      compiler:
        name: gcc
        version: 4.7.2
```

In the C world it is a common practice to have interfaces "at the project
level". For example spack has an `mpi` _virtual_ package that has various
implementations (e.g. `openmpi` or `mpich`). So we can actually build the same
package using different dependencies.

### VSCode Integration

After various attempts I found that PETSc has good support for compiling with
Makefiles and CMake. I experimented a bit with raw makefiles but had no success
making IDE integration work with VSCode.

Then I found
[this article](https://medium.com/@shreyashgupta910/vscode-setup-for-c-c-cmake-project-b1dc6aa8e7b8)
about `compile_commands.json` and the
[clangd extension for VSCode](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd).
To be short this is all the config to setup after installing that extension

-   In your `CMakeLists.txt` add the following

    ```
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
    ```

    or call CMake by passing that option directly as
    `cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..` when doing a build.

-   `.vscode/settings.json`

    ```json
    {
        "clangd.arguments": [
            "-background-index",
            "-compile-commands-dir=build/"
        ]
    }
    ```

### Conclusion

I'm really happy with the setup I have now that auto-completion is working in my
IDE. I can now focus on the actual project. Maybe in a future post I will write
a bit about the Arnoldi Iteration and how I implemented it in C using PETSc.
