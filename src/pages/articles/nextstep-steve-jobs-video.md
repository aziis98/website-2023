---
layout: ../../layouts/ArticleLayout.astro
title: NeXTStep Presentation from Steve Jobs
description: I saw an awesome presentation of the NeXTStep system from Steve Jobs and some ideas about it
tags: ["os", "presentation", "nextstep", "interactivity"]
publish_date: 2023/09/01
---

# NeXTStep: Object Linking

Recently I saw this video presentation on YouTube of the [NeXTStep](https://en.wikipedia.org/wiki/NeXTSTEP) system by Steve Jobs, the quality is what it is but he shows many cool things.

<iframe class="video" src="https://www.youtube-nocookie.com/embed/rf5o5liZxnA?si=M4Cc3LQHL5Uu-ecR" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

In particular, at [18:39](https://youtu.be/rf5o5liZxnA?si=FuIHKRIfyxhqWDLv&t=1119) he shows in a couple of minutes a feature of this system called "Object Linking".

Follows a text description of what's in the video, for those that can't watch the video at the moment; If you watched it feel free to skip the next paragraph.

He shows opening a [word processor](https://en.wikipedia.org/wiki/Word_processor) and inserting a diagram copied from another vector drawing program; however he doesn't just paste the diagram, but he links it in-place in the document using _Object Linking_. He also shows that updating the diagram in the other program updates it live in the other one without saving.

This thing he shows is just mind blowing, today I don't think there is any system that (easily) allows doing things like that, and if there is it's probably just a couple of programs from the same "suite" and not a system wide feature.

## Object linking these days

If there was something like that today, it would probably work by tracking file changes (so not live and just "on save") or maybe with an internal bus for IPC. 

I don't think that's how it was implemented in the NeXTStep systems as it was written in [Objective-C](https://en.wikipedia.org/wiki/Objective-C) and it inherited many ideas from SmallTalk systems from Xerox Park. So it probably had some way of directly referencing objects from one application to another.

I would love to have these kind of features today but there isn't really much hope of bolting this on a system wide level. Maybe with a custom desktop environment or something (I keep a close watch on what [Arcan](https://arcan-fe.com/) is doing). 

But even if we think smaller, even today there aren't that many programs where you can isolate a part of what you are doing (meaning for examples "Symbols" or "Components" in vector drawing software for example) and create linked instances of it within the same app.

### Figma's Components

The only program that really put some thought in this I know today is [Figma](https://www.figma.com/) (a vector drawing tool). It has the concept of _components_ that can be instantiated many times in the page: the great thing is that single instances can also be modified in-place without dropping the linking. 

I think Figma does some (crazy) diffing to track changes between the parent component and the single instances as one can modify the original component and the single instances separately and changes gets merged very well (in their last update they also introduced a feature for comparing changes between the parent component and the single instances).

## Dependencies

The other cool thing that this object linking introduces is that I think it mostly solves the problem of keeping various files up to date. One of the problems I have come up against the most is the necessity of having some templates and some source files and _having to write a custom build system from scratch_ just to render everything while keeping things simple and not having to mess with [Makefiles](https://en.wikipedia.org/wiki/Make_(software)#Makefiles) and the like.

Actually I always end up writing Makefiles, for example one thing I had to do is put some SVG pictures made with [Inkscape](https://inkscape.org/) and some made with [Asymptote](https://asymptote.sourceforge.io/) inside some LaTeX files and render everything to PDF. 

I needed to convert SVGs into something that TeX could import (and this could be done with Inkscape from the CLI) while Asymptote figures are generated using the `asymptote` command and then everything is compiled to PDF using `pdflatex`.

In an alternative world I would be writing "latex" in a WYSIWYG editor (e.g. something like [TeXMacs](https://www.texmacs.org/tmweb/home/welcome.en.html), it's an awesome project and I should use it far more) and drag and drop pictures where I want them in the document. 
This would be straight forward for the Inkscape SVG pictures as in the end its all vector graphics. For the asymptote ones the system could provide a "transformed link" where the picture is compiled as needed when the source code is updated.   

### Directed Acyclic Graphs

Speaking of object linking, the natural structure that arises from this idea is that of a _dependency graph_ and assuming we disallow cycles we have a DAG. This is the same structure that most build systems have to encode and in fact object linking (maybe with transforms as sad before) can be seen as just another way of solving the same problem. 

Makefiles are a decent way of declaratively expressing these structures but have too much historical cruft being made especially for building C programs. Make also only supports caching based on timestamps. By the way there is good work being done in this space, for example with [Justfiles](https://just.systems/man/en/).

## Conclusion

My point is that many problems we have today about keeping files up to date could be solved by something very intuitive like object linking. Here I don't mean that it would be easy to bolt onto something like a today's GNU/Linux system. Probably something more drastic would be needed to easily implement these features.

I only think that these ideas shouldn't be lost to time and it's fun to see some (radically different) solutions to problems we still face today.

_I also thank everybody that helped me polish up this post and find typos before publishing it._