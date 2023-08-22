---
layout: ../../layouts/ArticleLayout.astro
title: Telegram Bot with Python and SQLite
description: Recently I wrote a small Telegram Bot that uses Python and Sqlite as a database. I also used decorators and generators to simplify a bit the user-bot conversation code 
tags: ["telegram", "bot", "python", "sql", "side-project", "lang-en"]
publish_date: 2023/07/26
---

# Telegram Bot with Python and SQLite

Recently I did a dual coding session with <a title="Alessandro Fenu" href="https://poisson.phc.dm.unipi.it/~afenu/">@Issimaaa</a>. There was this project I was thinking about for some time and he wanted to try and help me. In the end I ended up writing the whole thing as he mostly helped me with moral support but I don't think I would have had the concentration to do all this in just an evening as we did. Also it was nice to talk with someone while working on the architecture and thinking about user interaction with the Bot. 

Some initial notes, all the code can be found [in this repo on the Gitea instance of PHC](https://git.phc.dm.unipi.it/aziis98/cibo-aula-stud-bot). Also as we're probably going to be the only ones ever reading this code most of it is in Italian, but for the matter of this post I'm going to translate most of the snippets.

## Introduction

The main idea was to build a small Telegram Bot to handle shared food orderings from food delivery services for our department as we often order food together. Each user can create order proposals and add orders to those proposals. 

The main reason I opted for a Telegram Bot is that this way we can send notifications to users when someone adds an order to one of their proposals and they can also enable notifications for new proposals.

## Choosing a Library

I used [pyTelegramBotAPI](https://github.com/eternnoir/pyTelegramBotAPI) as it looks to be one of the few popular Python libraries for Telegram Bots that uses [_decorators_](https://peps.python.org/pep-0318/) to register message and command handlers (I really like this model for some reason), for example the `/start` command is defined as follows

```python
@bot.message_handler(commands=["start"])
def handle_start(message):
    bot.send_message(message.chat.id, "Welcome!")

    cursor.execute(
        """
        INSERT OR IGNORE INTO users(telegram_id, fullname) VALUES (?, ?)
        """,
        (message.from_user.id, message.from_user.username),
    )
    conn.commit()
```

## Architecture

First we thought a bit about all the commands we would need and the interaction with the bot. At this point I already knew that we would need some "multi message" interactions with the bot (meaning the bot asks a question to the user, the user answers, the bots asks more things based on context, the user answers... until a point where the conversation ends and the bot can complete the action) and in fact I ended up writing the first version in a awful "_nested switch statements_" style. 

But I already thought it would be cooler if this use generators with the `yield` keyword (as we will see later I achieved this using `message = yield` and a `@conversation` decorator)

We defined all the tables pretty soon to the following

```sql
CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    fullname TEXT NOT NULL,
    notification BOOLEAN NOT NULL DEFAULT FALSE
)

CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_datetime TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (owner_id) REFERENCES users (telegram_id)
)

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    proposal_id TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users (telegram_id),
    FOREIGN KEY (proposal_id) REFERENCES proposals (id)
)
```

Speaking about SQL, one of the features I want to add is that about every hour a job runs and cleans up the database from proposals older that ~6h to not pollute the proposals list. If done naively, this will leave orphan orders in the database. But soon I discovered about SQL "_triggers_" that solve this problem, for example

```sql
CREATE TRIGGER IF NOT EXISTS cleanup_orders
    AFTER DELETE ON proposals
    BEGIN
        DELETE FROM orders WHERE proposal_id = old.id;
    END 
```

When a proposal is deleted this also deletes the corresponding orders for that proposal. I think I'm going to use this pretty often in the future along with _foreign keys_ and `ON DELETE CASCADE` (that I discovered does the opposite in this case).

After defining the tables we drew a rough sketch on a whiteboard of the commands we wanted to support but we soon forgot or rethought these up as I started coding.

## Rendering messages

One thing you often need when writing a Telegram Bot is to format nice messages for the user. I wanted to use markdown for this as I knew that Telegram API supports it, but for some reason the library we were using didn't really document the options for setting markdown parsing globally. In the end I found it and after a couple of tries I got it working by setting

```python
bot = telebot.TeleBot(BOT_TOKEN, parse_mode="MARKDOWN")
```

when creating the bot instance. 

Another thing related to sending messages to the user is that I tried using triple-strings and `textwrap.dedent` to try and keep the message generation code organized but it always went to shambles. Triple-string always include the indentation (why this if python is indentation dependent?) so I tried using `textwrap.dedent` but it looks like that if used with f-strings and the variable you are interpolating is a string with newlines than the `dedent` won't work as the least indent will now be `0`. Here is an example to show the problem

```python
def pretty_message(name, description):
    return textwrap.dedent(
        f"""\
        Name: {name}
        Description: {description}
        """,
    )

print(pretty_message("Foo", "Bar\nBaz"))
```

prints the following to stdout

```
        Name: Foo
        Description: Bar
Baz
```

That's not the desired output. There are clearly ways to solve this like writing a custom function to dedent only based on the first indentation level but for now I ended up doing something like the following

```python
def pretty_message(name, description):
    message = ""
    message += f"Name: {name}\n"
    message += f"Description: {description}\n"
    return message
```

## Conversations

Initially to support multi message conversations I used the good old technique of keeping track of the state along the conversation in some global dictionaries, one for each conversation type, here there are

- Add a new proposal (started with the `/new_proposal` command)

    - Bot: Sends a message to tell the used the format to use to enter the new proposal name and description

    - User: Enters name and description

    - Bot: Parses the previous message and adds the proposal to the db and tells the user everything worked fine

- Add a new order (started with the `/new_order` command)

    - Bot: Sends a list of the current available proposals giving each one a sequential number and saves this indexing in the conversation state

    - User: Enters the number of the proposal to which add an order

    - Bot: Asks the user to write what he would like to order and sets the proposal id in the conversation state using the stored indexing

    - User: Enters the order

    - Bot: Uses the proposal id and the message to add the new order for that proposal to the db.

As we can see we already have a couple of steps in the conversation types. Each type has a corresponding dictionary (called `conversation_new_proposal` and `conversation_new_order`) from chat id to conversation state. Then there is a generic handler with many ifs that handles all this logic

```python
@bot.message_handler()
def handle_conversation(message):
    if message.chat.id in conversation_new_proposal:
        conv = conversation_new_proposal[message.chat.id]
        ...
        return
    if message.chat.id in conversation_new_order:
        conv = conversation_new_order[message.chat.id]
        if conv["proposal_id"] is None:
            answer = message.text.strip()
            if answer not in conv["indexing"]:
                ...
                return
            proposta_uuid = conv["indexing"][answer]
            conv["proposal_id"] = proposta_uuid
            ...
            return
        else:
            ...
            return

    bot.send_message(message.chat.id, "No conversation started!")
```

Only this function is about ~100 lines of pretty messy "state machine" code. One thing I decided from the start is that conversation state won't be kept in the database to simplify the tables needed.

Using this assumption\* we can use generators with the [`yield` keyword](https://peps.python.org/pep-0342/).

(\*Without that assumption we would need to store the conversation state in the database so we would need to somehow serialize the generator current state. It looks like [this can be done in Python](http://www.fiber-space.de/generator_tools/doc/generator_tools.html) but it's mostly an hack. I only know about Lua that can do this reasonably (you just serialize the VM current state and that's it) and I imagine some Lisps (?). I think that until this can be done properly no one is going to seriously consider using _coroutines_ for statefull code, where they are actually most useful like in this case)

In the end the `handle_conversation` function became

```python
conversation_registry = dict()

@bot.message_handler()
def handle_conversation(message):
    if message.chat.id in conversation_registry:
        conv = conversation_registry[message.chat.id]
        try:
            # tries to continues execution from the previous
            # "message = yield" point in the conversation code
            conv.send(message) 
        except StopIteration: 
            # cleanup conversation from registry
            del conversation_registry[message.chat.id]

        return

    bot.send_message(message.chat.id, "No conversation started!")
```

For some reason to detect the end of the generator we have to check for the `StopIteration` exception. I expected generators to have an `.is_done()` or something similar but it looks like this is the way.

I also added the following decorator function to mark a message handler as a conversational handler

```python
def conversation(func):
    def inner(message):
        conv = func(message)
        conversation_registry[message.chat.id] = conv
        next(conv) # startup the generator

    return inner
```

In this way the `/new_proposal` command now became

```python
@bot.message_handler(commands=["new_proposal"])
@conversation
def handle_new_proposal(message):
    bot.send_message(message.chat.id, ...)
    ...
    message = yield # await for user answer
    ...
    bot.send_message(message.chat.id, ...)
    ...
```

And now I also enhanced the `/new_order` command to continue ask the user only for a valid index from the list

```python
@bot.message_handler(commands=["new_order"])
@conversation
def handle_new_order(message):
    ...
    proposals = ...
    indexing = ...
    ...
    bot.send_message(message.chat.id, proposals_with_indexing)
    bot.send_message(message.chat.id, "Send the number of the proposal you want to add an order to")

    while True:
        message = yield # await for user answer
        index = message.text.strip()
        if index in indexing:
            break
        available_indices = ", ".join(str(k) for k in indexing.keys())
        bot.send_message(message.chat.id, f"Invalid number, choose one of {available_indices}")

    proposal_id = indexing[index]

    bot.send_message(message.chat.id, f"Now tell me what you want to order")
    message = yield # await for user answer
    ...
    content = message.text.strip()
    ...
    bot.send_message(message.chat.id, f"Order added successfully")
    ...
    return


```

## Conclusion

After all Python and pure SQLite work very well together and except for a few language inconsistencies (I also don't like _venvs_ too much as I come from the npm world) everything went on very smoothly and this was a nice on-shot dual coding project.
