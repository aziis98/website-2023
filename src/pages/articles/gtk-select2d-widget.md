---
layout: ../../layouts/ArticleLayout.astro
title: GTK Select2D Widget
description: Article about a small gtk widget I recently made using ChatGPT. The widget lets the user select points on an image and after confirmation prints them on stdout.
tags: ["python", "gtk", "lang-en"]
publish_date: 2023/07/23
draft: true
---

# GTK Select 2D Widget

I've always been a fun of [GTK3](https://docs.gtk.org/gtk3/) but I was never able to build something more than a base application with one or two widgets.

I tried using it with [C](https://docs.gtk.org/gtk3/) and [Python](https://python-gtk-3-tutorial.readthedocs.io/en/latest/) and maybe also [Golang](https://github.com/gotk3/gotk3) if I remember correctly, but it always felt too complicated to use. The main problem was the documentation, the Python binding have some nice examples but only for some widgets (for exmple `DrawingArea` seems missing from [the Python GTK+3 Read the Docs](https://python-gtk-3-tutorial.readthedocs.io/en/latest/))

## Select2D

A long time ago I was searching for a Linux tool to crop PDFs from the terminal. I wanted something that could spawn a window with a preview of the PDF and let me select a region of it and then process the file and spit out the cropped PDF.

Recently one of my friends was looking for a tool to delimit a quadrilateral region of an image, and since I had nothing to do I tried to make it in GTK using Python. 

So, my first idea was to make a tool that could take as input an image and a series of options and prompt the user to select the desired region of the image, confirm and then the tool will print to standard out the coordinates of the selected regions.

I know I wanted to make this in GTK to keep it as simple as possible, but this time I tried using ChatGPT to get started with the project. 

## Chatting with ChatGPT

I tried some prompts and after a couple of tries I reached the following prompt

> _Create a small GTK application in Python that gets called like "select2d <image>" and displays the image and shows four movable/draggable points to select a quadrilateral in the image. Under the displayed canvas there is an ok button to confirm the selection that closes the window and prints to stdout the point coordinates_

And its answer contained the following snippet of code

```python
#!/usr/bin/env python3

import sys
import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, GdkPixbuf

class Select2DApp(Gtk.Window):
    def __init__(self):
        super(Select2DApp, self).__init__(title="Select Quadrilateral")
        self.set_default_size(800, 600)

        self.image_filename = None
        self.image = None

        self.point_positions = []
        self.dragging_point = None

        self.init_ui()

    def init_ui(self):
        vbox = Gtk.VBox(spacing=6)
        self.add(vbox)

        self.image_area = Gtk.Image()
        vbox.pack_start(self.image_area, True, True, 0)

        self.canvas_area = Gtk.DrawingArea()
        self.canvas_area.connect("draw", self.on_draw)
        self.canvas_area.add_events(Gdk.EventMask.BUTTON_PRESS_MASK |
                                    Gdk.EventMask.BUTTON_RELEASE_MASK |
                                    Gdk.EventMask.POINTER_MOTION_MASK)
        self.canvas_area.connect("button-press-event", self.on_button_press)
        self.canvas_area.connect("button-release-event", self.on_button_release)
        self.canvas_area.connect("motion-notify-event", self.on_motion_notify)
        vbox.pack_start(self.canvas_area, True, True, 0)

        ok_button = Gtk.Button.new_with_label("OK")
        ok_button.connect("clicked", self.on_ok_button_clicked)
        vbox.pack_start(ok_button, False, False, 0)

    def load_image(self, filename):
        try:
            self.image = GdkPixbuf.Pixbuf.new_from_file(filename)
            self.image_filename = filename
            self.canvas_area.queue_draw()
        except GLib.Error as e:
            print(f"Error loading image: {e}")

    def on_draw(self, area, cr):
        if self.image:
            Gdk.cairo_set_source_pixbuf(cr, self.image, 0, 0)
            cr.paint()

            cr.set_source_rgb(1.0, 0.0, 0.0)
            for x, y in self.point_positions:
                cr.arc(x, y, 5, 0, 2 * 3.14)
                cr.fill()

    def on_button_press(self, widget, event):
        if event.button == 1:  # Left mouse button
            x, y = event.x, event.y
            self.dragging_point = self.get_closest_point(x, y)
            if self.dragging_point is None:
                self.point_positions.append((x, y))
            self.canvas_area.queue_draw()

    def on_button_release(self, widget, event):
        self.dragging_point = None

    def on_motion_notify(self, widget, event):
        if self.dragging_point is not None:
            self.point_positions[self.dragging_point] = (event.x, event.y)
            self.canvas_area.queue_draw()

    def on_ok_button_clicked(self, widget):
        if len(self.point_positions) == 4:
            print("Quadrilateral Points:")
            for x, y in self.point_positions:
                print(f"{x}, {y}")
            Gtk.main_quit()
        else:
            print("Please select four points to form a quadrilateral.")

    def get_closest_point(self, x, y):
        for i, (px, py) in enumerate(self.point_positions):
            if (px - x) ** 2 + (py - y) ** 2 < 25:
                return i
        return None


def main():
    if len(sys.argv) != 2:
        print("Usage: select2d <image>")
        sys.exit(1)

    image_filename = sys.argv[1]

    app = Select2DApp()
    app.load_image(image_filename)
    app.connect("destroy", Gtk.main_quit)
    app.show_all()
    Gtk.main()


if __name__ == "__main__":
    main()
```

This was already a great start but the image was show in its real size and now centered so the next message was about fixing this problem

> _Rewrite only the `on_draw` function, make the image fit the drawing area by preserving its aspect ratio, make the points squares with crosses inside and draw the outline of the full quadrilateral, all with a black stroke_

The response did exactly what I asked by doing the linear algebra needed to rescale and translate everything correctly.

```python
def on_draw(self, area, cr):
    if self.image:
        # Calculate the aspect ratio of the image and drawing area
        image_aspect_ratio = self.image.get_width() / self.image.get_height()
        drawing_area_width = self.canvas_area.get_allocated_width()
        drawing_area_height = self.canvas_area.get_allocated_height()
        drawing_area_aspect_ratio = drawing_area_width / drawing_area_height

        # Calculate the scaling factor to fit the image inside the drawing area
        if image_aspect_ratio > drawing_area_aspect_ratio:
            scale_factor = drawing_area_width / self.image.get_width()
        else:
            scale_factor = drawing_area_height / self.image.get_height()

        # Calculate the translation to center the image inside the drawing area
        translate_x = (drawing_area_width - self.image.get_width() * scale_factor) / 2
        translate_y = (drawing_area_height - self.image.get_height() * scale_factor) / 2

        cr.save()
        cr.translate(translate_x, translate_y)
        cr.scale(scale_factor, scale_factor)

        # Draw the image
        Gdk.cairo_set_source_pixbuf(cr, self.image, 0, 0)
        cr.paint()

        cr.set_source_rgb(0.0, 0.0, 0.0)

        # Draw points with crosses inside
        for x, y in self.point_positions:
            cr.rectangle(x - 5, y - 5, 10, 10)
            cr.move_to(x - 5, y)
            cr.line_to(x + 5, y)
            cr.move_to(x, y - 5)
            cr.line_to(x, y + 5)
            cr.stroke()

        # Draw the outline of the full quadrilateral if four points are selected
        if len(self.point_positions) == 4:
            cr.move_to(*self.point_positions[0])
            for x, y in self.point_positions[1:]:
                cr.line_to(x, y)
            cr.close_path()
            cr.set_line_width(2)
            cr.stroke()

        cr.restore()
```

It also guessed right what I meant by rectangles with crosses inside, It's mind blowing how it can map such a description to the correct code.

At this point I know I would need to do that coordinate conversion in multiple places so I asked it to refactor that code into a separate function

> _Write a new function to convert coordinates from component space to image space_

```python
def component_to_image_space(self, x, y):
    # Calculate the aspect ratio of the image and drawing area
    image_aspect_ratio = self.image.get_width() / self.image.get_height()
    drawing_area_width = self.canvas_area.get_allocated_width()
    drawing_area_height = self.canvas_area.get_allocated_height()
    drawing_area_aspect_ratio = drawing_area_width / drawing_area_height

    # Calculate the scaling factor to fit the image inside the drawing area
    if image_aspect_ratio > drawing_area_aspect_ratio:
        scale_factor = drawing_area_width / self.image.get_width()
    else:
        scale_factor = drawing_area_height / self.image.get_height()

    # Calculate the translation to center the image inside the drawing area
    translate_x = (drawing_area_width - self.image.get_width() * scale_factor) / 2
    translate_y = (drawing_area_height - self.image.get_height() * scale_factor) / 2

    # Inverse scaling and translation to convert from component to image space
    image_x = (x - translate_x) / scale_factor
    image_y = (y - translate_y) / scale_factor

    return image_x, image_y
```

And I also asked it to write the inverse function to fix manually some coordinate conversion stuff when dragging the points around

> _Also write the inverse, from image space to component space_

```python
def image_to_component_space(self, image_x, image_y):
    # Calculate the aspect ratio of the image and drawing area
    image_aspect_ratio = self.image.get_width() / self.image.get_height()
    drawing_area_width = self.canvas_area.get_allocated_width()
    drawing_area_height = self.canvas_area.get_allocated_height()
    drawing_area_aspect_ratio = drawing_area_width / drawing_area_height

    # Calculate the scaling factor to fit the image inside the drawing area
    if image_aspect_ratio > drawing_area_aspect_ratio:
        scale_factor = drawing_area_width / self.image.get_width()
    else:
        scale_factor = drawing_area_height / self.image.get_height()

    # Calculate the translation to center the image inside the drawing area
    translate_x = (drawing_area_width - self.image.get_width() * scale_factor) / 2
    translate_y = (drawing_area_height - self.image.get_height() * scale_factor) / 2

    # Apply scaling and translation to convert from image to component space
    x = image_x * scale_factor + translate_x
    y = image_y * scale_factor + translate_y

    return x, y
```

And then I fixed the places where it was using the wrong coordinate system when dragging points around.

Then I noticed I didn't like the technique it was using to move the points around. I decided it would be nicer it clicking on the canvas just moved the nearest point to the mouse position. So first I asked

> _The `get_closest_point` function should return the index of the closest point by distance and true or false based on if its distance is less than 25_

```python
def get_closest_point(self, x, y):
    closest_index = None
    min_distance = float('inf')

    for i, (px, py) in enumerate(self.point_positions):
        distance_squared = (px - x) ** 2 + (py - y) ** 2
        if distance_squared < min_distance:
            min_distance = distance_squared
            closest_index = i

    if min_distance < 25:
        return closest_index, True
    else:
        return closest_index, False
```

I didn't like the manual approach so I told it to use a specific library to do the job

> _use sort or itertools_

```python
import itertools

def get_closest_point(self, x, y):
    def distance_squared(point):
        px, py = point
        return (px - x) ** 2 + (py - y) ** 2

    if not self.point_positions:
        return None, False

    closest_point = min(self.point_positions, key=distance_squared)
    min_distance = distance_squared(closest_point)

    if min_distance < 25:
        closest_index = self.point_positions.index(closest_point)
        return closest_index, True
    else:
        return None, False
```

Just more chatting about this function to try and make it cleaner...

> _is there an argmin function?_

```python
def get_closest_point(self, x, y):
    def distance_squared(point):
        px, py = point
        return (px - x) ** 2 + (py - y) ** 2

    if not self.point_positions:
        return None, False

    distances = [distance_squared(point) for point in self.point_positions]
    min_distance = min(distances)
    closest_index = distances.index(min_distance)

    if min_distance < 25:
        return closest_index, True
    else:
        return None, False
```

At this point I know more precisely what I wanted so by hand I changed it to

```python
def get_closest_point(self, x, y):
    def distance_squared(point):
        px, py = point
        return (px - x) ** 2 + (py - y) ** 2

    distances = [distance_squared(point) for point in self.point_positions]
    min_distance = min(distances)
    closest_index = distances.index(min_distance)

    return closest_index, min_distance < 25
```

### Snapping

At this point I chatted a bit and did some various manual edits but still wanted to see if it could correctly implement snapping for the points handles. So I told it the current version of the mouse related code and asked it to add snapping to other points with the same x or y coordinate

> Now its the following:
> 
> ```python
> def on_button_press(self, widget, event):
>     if event.button == 1:  # Left mouse button
>         x, y = self.component_to_image_space(event.x, event.y)
>         point_index, near = self.get_closest_point(x, y)
>         if near:
>             self.dragging_point = point_index
>         else:
>             self.point_positions[point_index] = (x, y)
>         
>         self.canvas_area.queue_draw()
> 
> def on_button_release(self, widget, event):
>     self.dragging_point = None
> 
> def on_motion_notify(self, widget, event):
>     if self.dragging_point is not None:
>         self.point_positions[self.dragging_point] = self.component_to_image_space(event.x, event.y)
>         self.canvas_area.queue_draw()
> ```
> 
> Please add snapping to points with the same x or y

And its answer was just on point

```python
def on_motion_notify(self, widget, event):
    if self.dragging_point is not None:
        x, y = self.component_to_image_space(event.x, event.y)

        # Check for snapping to points with the same x or y coordinate
        for i, (px, py) in enumerate(self.point_positions):
            if i != self.dragging_point:
                if abs(px - x) < 10:
                    x = px
                if abs(py - y) < 10:
                    y = py

        self.point_positions[self.dragging_point] = (x, y)
        self.canvas_area.queue_draw()
```

Then, after a small refactor I asked to also add snapping to image borders

> i changed it to:
> 
> ```python
> def on_motion_notify(self, widget, event):
>     if self.dragging_point is not None:
>         x, y = self.component_to_image_space(event.x, event.y)
> 
>         # Check for snapping to points with the same x or y coordinate
>         for i, (px, py) in enumerate(self.point_positions):
>             if i != self.dragging_point:
>                 if abs(px - x) < ALIGN_SNAP_SIZE:
>                     x = px
>                 if abs(py - y) < ALIGN_SNAP_SIZE:
>                     y = py
> 
>         self.point_positions[self.dragging_point] = (x, y)
>         self.canvas_area.queue_draw()
> ```
> 
> also snap to image borders

```python
def on_motion_notify(self, widget, event):
    if self.dragging_point is not None:
        x, y = self.component_to_image_space(event.x, event.y)
        width = self.image.get_width()
        height = self.image.get_height()

        # Check for snapping to points with the same x or y coordinate
        for i, (px, py) in enumerate(self.point_positions):
            if i != self.dragging_point:
                if abs(px - x) < ALIGN_SNAP_SIZE:
                    x = px
                if abs(py - y) < ALIGN_SNAP_SIZE:
                    y = py

        # Check for snapping to the image borders
        if abs(x) < ALIGN_SNAP_SIZE:
            x = 0
        elif abs(x - width) < ALIGN_SNAP_SIZE:
            x = width
        if abs(y) < ALIGN_SNAP_SIZE:
            y = 0
        elif abs(y - height) < ALIGN_SNAP_SIZE:
            y = height

        self.point_positions[self.dragging_point] = (x, y)
        self.canvas_area.queue_draw()
```

### Various UI Changes

At this point the confirm button was still called "Ok" and there was no snapping checkbox. I tried asking ChatGPT to add this things and it did most of it but the UI wasn't too nice. So I also asked to change some paddings but it didn't get which ones so I ended up doing most of this by hand. But at this point I was comfortable enough with the GTK code that It was fairly easy to get to what I wanted.

### CLI Options

At this point the app was mostly working with all the basic features I needed. So I moved on with enhancing the command line interface. To this point the main was just

```python
def main():
    if len(sys.argv) != 2:
        print("usage: select2d <image>")
        sys.exit(1)

    image_filename = sys.argv[1]
    print(f'Image "{image_filename}"')

    app = Select2DApp()
    app.load_image(image_filename)
    app.connect("destroy", Gtk.main_quit)
    app.show_all()
    Gtk.main()
```

I asked it in various passes to add

- a `--title` option

- one to select the number of points

- one to show or hide the outline

- and one to also tell that the path is also a "closed"

Its answer used `argparse`, I knew about this but never really used it so Its nice to see that ChatGPT can convert options provided in natural language to code.

This was the resulting code

```python
import argparse

def main():
    parser = argparse.ArgumentParser(description="Select points 2D Image Selector")
    parser.add_argument("image", help="Image file path")
    parser.add_argument("--title", "-t", help="Window title", default="2D Image Selector")
    parser.add_argument("--points", "-p", type=int, default=4, help="Number of points to select")
    parser.add_argument("--show-outline", "-s", action="store_true", help="Show the outline of the quadrilateral")
    parser.add_argument("--closed", "-c", action="store_true", help="Indicate if the drawn path is closed")
    args = parser.parse_args()

    # Pass the title as an optional argument
    app = Select2DApp(title=args.title, num_points=args.points, show_outline=args.show_outline, closed=args.closed)
    app.load_image(args.image)
    app.connect("destroy", Gtk.main_quit)
    app.show_all()
    Gtk.main()

if __name__ == '__main__':
    main()
```

## Conclusion

At this point in time this widget can only be used to select a quadrilateral as I removed the option to change the number of points. The next thing I want to do is to refactor this code a bit before adding more features. It's just a couple hundreds lines of code but its already feeling a bit spaghetti.

Yet again I confirmed that ChatGPT is most useful when starting a new project that uses a technology I'm not too familiar with or with poor documentation. 