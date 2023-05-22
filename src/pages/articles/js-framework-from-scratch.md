---
layout: ../../layouts/ArticleLayout.astro
includeModule: "/scripts/js-framework-from-scratch.js"
title: "[WIP] Building a JS Framework from scratch"
description: In this article we will build a small reactive js framework from scratch
tags: ["js", "ui", "from-scratch", "lang-en"]
publish_date: 2023/05/16
draft: true
---

# Building a JS Framework from Scratch

> **Warning:** This article is still unfinished and will keep changing for a while

I want to get better at writing and explaining technical things so in this article I will try explain how to build a small JS framework from scratch based on a small project I made.

## The Problem

Let's first see what's the problem and what we are trying to build. The browser gives us the [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) that is a tree that represents the elements we describe when we write the of our page HTML.

If we want to interact with HTML from JS we have to interact with the DOM. Every HTML element viewed from the DOM has many methods to change its state (adding, removing children and changeing its attributes). 

For example to change the text content of an element we can use [`(Node).textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent). To create new elements we can use [`document.createElement(tagName)`](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement) or we can set directly the HTML of a parent element using [`(Element).innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) like <code>myDiv.innerHTML = `<p>Hello!</p>`</code>.

> **Postulate:** Interacting with the DOM is slow

This should just be interpreted as DOM operations are not cheap so we should try to do as few operations as possible when updating the DOM.

Given this the main job of a UI framework should be to try and minimize the interactions with the DOM to **keep the state of our application in sync** with the state of the DOM while not wasting too much time doing this exact job.

## Vanilla JS

Now let's consider we are making our beloved "TODO list application", we want 

- An input field and a button to add more TODOs

- A list of TODOs where each item has 

    - A checkbox to mark it as done

    - A button to edit that item

    - A button to delete the item.

- A global checkbox to hide all done TODOs

For now let's just hack this together just trying to make something that works.

```html
<label>
    New Todo 
    <input type="text" class="new-todo-field">
    <button class="new-todo-btn">Add</button>
</label>
<br>
<label>
    Hide Done
    <input type="checkbox" class="toggle-done-todos">
</label> 
<div class="todo-list"></div>
```

```css
.todo-list {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.25rem;
}

.todo-item {
    display: flex;
    gap: 0.5rem;
}

/* Styles to hide completed todo items when the checkbox is checked */
.todo-list.hide-done .todo-item.done {
    display: none;
}

/* Styles to mark completed todo items */
.todo-item.done .text {
    text-decoration: line-through;
}

/* Styles to show/hide elements only needed while editing */
.todo-item.editing .hide-on-edit {
    display: none;
}
.todo-item:not(.editing) .edit-field {
    display: none;
}
```

As a convention I name HTML elements with a leading `$` to not go mad. Let's first define a couple of variables to define all the root elements we are going to use.

```js
const $newTodoField = document.querySelector('.new-todo-field')
const $newTodoBtn = document.querySelector('.new-todo-btn')
const $toggleDoneTodos = document.querySelector('.toggle-done-todos')
const $todoList = document.querySelector('.todo-list')
```

Now let's define a function to create a new todo item given its text. We will use this later.

```js
function createTodoItem(text) {
    const $todoItem = document.createElement("div");
    $todoItem.classList.add("todo-item");

    const $todoItemDone = document.createElement("input");
    $todoItemDone.type = "checkbox";
    $todoItemDone.classList.add("hide-on-edit");
    $todoItemDone.addEventListener("input", (e) => {
        $todoItem.classList.toggle("done", $todoItemDone.checked);
    });

    const $todoItemText = document.createElement("div");
    $todoItemText.classList.add("text");
    $todoItemText.classList.add("hide-on-edit");
    $todoItemText.textContent = text;

    const $todoItemEditField = document.createElement("input");
    $todoItemEditField.classList.add("edit-field");
    $todoItemEditField.type = "text";
    $todoItemEditField.value = text;

    const $todoItemRemove = document.createElement("button");
    $todoItemRemove.textContent = "Delete";
    $todoItemRemove.classList.add("hide-on-edit");
    $todoItemRemove.addEventListener("click", () => {
        $todoItem.remove();
    });

    const $todoItemEditBtn = document.createElement("button");
    $todoItemEditBtn.textContent = "Edit";
    $todoItemEditBtn.addEventListener("click", () => {
        if (!$todoItem.classList.contains("editing")) {
            $todoItem.classList.add("editing");
            $todoItemEditBtn.textContent = "Done";
        } else {
            $todoItemText.textContent = $todoItemEditField.value;
            $todoItem.classList.remove("editing");
            $todoItemEditBtn.textContent = "Edit";
        }
    });

    $todoItem.appendChild($todoItemDone);
    $todoItem.appendChild($todoItemText);
    $todoItem.appendChild($todoItemEditField);
    $todoItem.appendChild($todoItemEditBtn);
    $todoItem.appendChild($todoItemRemove);

    return $todoItem;
}
```

This function is just factored out because it gets called when clicking the "Add" button or when pressing `Enter` from the keyboard while typing in the input field.

```js
function addTodo() {
    const newTodoText = $newTodoField.value;
    if (newTodoText.trim().length === 0) return;

    const $newTodoItem = createTodoItem(newTodoText);

    $todoList.appendChild($newTodoItem);

    $newTodoField.value = "";
}

$newTodoField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTodo();
});

$newTodoBtn.addEventListener("click", addTodo);
```

As a last thing we add a listener for the checkbox that hides all items. Instead of removing items from the DOM we just add a class to the enclosing container.  

```js
$toggleDoneTodos.addEventListener("input", () => {
    $todoList.classList.toggle("hide-done", $toggleDoneTodos.checked);
});
```

And here it is in action

<div class="frame" id="example-1"></div>

This code has many problems, first _its long_. We are just creating a couple of items and yet the largest part of the code handles just creating the following elements that in HTML can be represented in just _7 lines_.

```html
<div class="todo-item">
    <input type="checkbox" class="hide-on-edit">
    <div class="text hide-on-edit">[Todo item text]</div>
    <input class="edit-field" type="text">
    <button>Edit</button>
    <button class="hide-on-edit">Delete</button>
</div>
```

Second its all imperative code and we are mutating elements in place so we have to keep track of everything. This might work for very small JS widgets but its unreasonable to keep modifying classes and element attributes directly like this.

Another problem is what if we want to send/receive data from a server. We could send HTML directly over the wire and just use `.innerHTML` to update elements. On the other hand most just use JSON as its really easy to work with in JS. 

[...] 

---

There are mostly three ways people "solved" UIs in the last decades

- **Model-View-Controller (MVC)**

    This is the is rarely done directly in JS (even though this is a very general pattern and can some time the view can use a JS framework on its own) but there are many libraries like GTK or Java Swing that use it.

    In our case applying this pattern would mean extracting all state to a global* object and have all event listeners call functions separated in a "controllers" file. Then each controller takes the model and updates it accordingly. Then the view layer reads the model and updates the view accordingly often by using something called single or double-binding with the model.

- **Reactive Programming**

    First there are actually two kinds of reactive programming "paradigms". The reactive streams model and the dependency graph model.

    Using the first technique we describe our application as streams of values. For example instead of registering events on a button we get an event stream of click events from a button and manipulate that with pure transformations to generate our final view.

    ```js
    // A counter application
    const $incrementBtn = ...
    const $decrementBtn = ...
    const $decrementValue = ...

    const increments = Observable.of($incrementBtn, 'click')
    const decrements = Observable.of($decrementBtn, 'click')

    // Observable Pseudocode
    Observable
        .merge(increments.map(() => +1), decrements.map(() => -1))
        .reduce((acc, delta) => acc + delta)
        .map(v => $decrementValue.textContent = v)
    ``` 

    [...]

- **Immediate Rendering**
    
    ...