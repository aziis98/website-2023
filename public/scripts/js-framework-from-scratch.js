function mount(id, fn) {
    fn(document.getElementById(id));
}

mount("example-1", ($el) => {
    $el.innerHTML = `
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
        <style>
            #example-1 .todo-list {
                display: flex;
                flex-direction: column;
                padding: 0.5rem;
                gap: 0.25rem;
            }
            #example-1 .todo-item {
                display: flex;
                gap: 0.5rem;
            }
            #example-1 .todo-list.hide-done .todo-item.done {
                display: none;
            }
            #example-1 .todo-item.done .text {
                text-decoration: line-through;
            }
            #example-1 .todo-item.editing .hide-on-edit {
                display: none;
            }
            #example-1 .todo-item:not(.editing) .edit-field {
                display: none;
            }
        </style>
    `;

    const $newTodoField = $el.querySelector(".new-todo-field");
    const $newTodoBtn = $el.querySelector(".new-todo-btn");
    const $toggleDoneTodos = $el.querySelector(".toggle-done-todos");
    const $todoList = $el.querySelector(".todo-list");

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

    $toggleDoneTodos.addEventListener("input", () => {
        $todoList.classList.toggle("hide-done", $toggleDoneTodos.checked);
    });
});
