---
layout: ../../layouts/ArticleLayout.astro
title: Math of Zoom & Pan
description: Zoom and Pan should be a simple feature but implemented naively can get out of hand. In this article I will try and explain how to implement it simply also giving a more in depth look at the math behind this. 
tags: ["math", "zoom", "pan", "lang-en"]
publish_date: 2023/08/15
draft: true
---

# Math of Zoom & Pan

TODO: Make this article interactive

Let's start by defining the problem. We want to build a simple image viewer with the ability to pan with the mouse and also zoom relative to the mouse. 

Let's give some names to various things we will use, these values are provided from the start

- `image` is a structure that will store properties and methods about the image to be displayed (we will exclude file names and rendering stuff as that is out of the scope of this post)

    - `image.dimension` is a vector of the image width and height

        - `image.dimension.width` is an alias for the width of the image

        - `image.dimension.height` and for the height respectively

- `canvas` is a structure that will store properties and methods about the canvas

    - `canvas.dimension` is a vector of the canvas width and height

        - `canvas.dimension.width` is an alias for the width of the canvas

        - `canvas.dimension.height` and for the height respectively

- `pan` is a 2d point telling the screen position of the top-left of the image.

- `zoom` is a number, let's say in the range $[1, +\inf)$.

A reasonable thing to ask is to have the image centered inside the canvas, we will see later how to add this feature.




## A bit more in depth math

Bla bla bla conjugation.

