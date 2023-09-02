---
layout: ../../layouts/ArticleLayout.astro
title: NeXTStep Presentation from Steve Jobs
description: I saw an awesome presentation of the NeXTStep system from Steve Jobs and some ideas about it
tags: ["os", "presentation", "nextstep", "interactivity"]
publish_date: 2023/09/01
---

# NeXTStep: Object Linking

Recently I saw this video presentation on YouTube of the [NeXTStep](https://en.wikipedia.org/wiki/NeXTSTEP) system by Steve Jobs, the quality is what it is but he shows many cool things

<iframe class="video" width="560" height="315" src="https://www.youtube-nocookie.com/embed/rf5o5liZxnA?si=M4Cc3LQHL5Uu-ecR" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

In particular at [18:39](https://youtu.be/rf5o5liZxnA?si=FuIHKRIfyxhqWDLv&t=1119) in a couple of minutes he shows a feature of the NeXTStep system called "Object Linking".

Follows a text description of what he shows in the video for who can't watch the video at the moment, if you watched it feel free to skip the next paragraph:

He shows opening a [word processor](https://en.wikipedia.org/wiki/Word_processor) and inserting a diagram copied from another vector drawing program. He doesn't just paste the diagram, he links it in-place in the document using this feature called _Object Linking_. He also sets the linking in continuous mode and shows that updating the diagram in the other program updates it live in the other one.

This thing he shows are just mind blowing, today I don't think there is any system that (easily) allows doing things like that, and if there is it's probably just a couple of programs from the same "suite".

## Object linking these days

If there was something like that today, it would probably work by just watching for file changes (so not live just "on save") or maybe with an internal bus for IPC. Even though I think that's not how it was implemented in the NeXTStep systems.

I really miss these kind of features today, there aren't even many programs today where you can isolate a part of what you are doing (meaning for examples "Symbols" or "Components" in vector drawing software) and create linked instances of it within the same app.

### Figma's Components

The only program that really put some thought in this I know from today is [Figma](https://www.figma.com/) (a vector drawing tool). It has the concept of _components_ that can be instanced many times in the page, the great thing is that single instances can also be modified in-place without loosing liking. 

I think Figma does some (crazy) diffing to track changes between the parent component and the single instances as one can modify the original component and the single instances separately and changes gets merged very well (in their last update they also introduced a feature for comparing changes between the parent component and the single instances).

## Dependencies

The really cool thing concept that this object linking introduces is that I think it mostly solves the problem of keeping various files up to date. The problem I have come up against the most is having some templates and some source files and _having to write a custom build system from scratch_ just to keep things simple and not having to mess with [Makefiles](https://en.wikipedia.org/wiki/Make_(software)#Makefiles) and alike.

Actually I always end up writing Makefiles, another example is I had to some SVG pictures made with [Inkscape](https://inkscape.org/) and some made with [Asymptote](https://asymptote.sourceforge.io/) inside some LaTeX files. I needed to convert SVGs into something that TeX could import (and this could be done with Inkscape from the CLI) while Asymptote figures are generated using its the `asymptote` command.

### Directed Acyclic Graphs

Speaking of dependencies, the natural structure that arises is a _dependency graph_ and assuming we disallow cycles we have a DAG.

Makefiles are a decent way of expressing these structures but have too much historical cruft being made especially for building C programs and just support caching based on timestamps.

Something like object linking should at least provide the ability to list all dependencies of file so this concept also comes up there.

## Conclusion

My point is that many problems we have today about keeping files up to date could be easily solved by something like _object linking_. I don't mean that it would be easy to bolt onto something like a today's Linux system. But these ideas shouldn't be lost to time and it's fun to see some (radically different) solutions to problems we still face today.

## Additional Considerations

- Actually the "just update on file save" maybe be a feature, maybe it's not a good idea of displaying an intermediate version of the object when the user is modifying the source object.