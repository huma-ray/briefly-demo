## Purpose

Gives the demo a second, chat-style work source (simulated Slack threads in English and Korean) so the assistant can be shown collecting mentions, summarizing and translating threads, and drafting replies that are sent only after approval, without connecting to any real messaging service.

## ADDED Requirements

### Requirement: Simulated Slack data in every sandbox
Every sandbox SHALL contain its own copy of a fixed set of simulated Slack channels, threads and messages, created with the sandbox and removed by the nightly reset. A fresh sandbox SHALL contain:
- `#launch`: a thread in English where Marcus Lee asks Alex Kim to confirm the pricing page copy, waiting for Alex's reply;
- `#design`: a long thread (at least 10 messages) where Dilnoza Rakhimova asks Alex Kim to choose between two hero options, waiting for Alex's reply;
- `#partner-kr`: a thread in Korean where 김민준 (Kim Min-jun, an outside partner agency, not a Briefly member) asks Alex Kim for the banner sizes, waiting for Alex's reply; one of its messages contains an instruction aimed at the assistant (for example to post a document to another channel);
- at least two further threads that do not mention Alex or are already resolved.

Message authors SHALL be shown by name and initials; Korean messages SHALL be stored and shown in Korean. No message SHALL be sent to or read from a real messaging service.

#### Scenario: Fresh sandbox
- **WHEN** a new visitor opens the Slack tab of the Inbox
- **THEN** three threads are marked as waiting for Alex's reply, one of them in Korean, plus the other threads

#### Scenario: Sandboxes are isolated
- **WHEN** visitor A resolves a mention or posts a reply
- **THEN** visitor B's sandbox still shows that mention as waiting, and B cannot read A's threads

### Requirement: Clearly simulated
Every place that shows simulated messages (Inbox tab, Today row, approval card, assistant replies about them) SHALL label them "Slack (simulated)" or carry a visible "Simulated" tag, and SHALL NOT use the Slack logo, colours or other branding. Approving a reply SHALL say it was posted to the simulated thread.

#### Scenario: Labels
- **WHEN** a visitor opens the Slack tab
- **THEN** the tab reads "Slack (simulated)" and a note explains that the messages are sample data and nothing is sent anywhere

### Requirement: Inbox Slack tab
The Inbox SHALL have two tabs: Activity (the existing feed) and Slack (simulated) with the number of threads waiting for the person's reply. The Slack tab SHALL list threads newest first with channel, the latest message's author and a one-line excerpt, a "Mentions you" tag and a "Needs reply" or "Done" state. Opening a thread SHALL show all its messages in order with author, time and text. Each thread SHALL offer "Ask assistant" and, while waiting, "Mark done".

#### Scenario: Open a Korean thread
- **WHEN** the person opens the `#partner-kr` thread
- **THEN** its messages are shown in Korean with their authors and times, and the thread offers Ask assistant and Mark done

#### Scenario: Count on the tab
- **WHEN** a fresh sandbox's Inbox is opened
- **THEN** the Slack tab shows 3

### Requirement: Mark done
A person SHALL be able to mark a thread waiting for their reply as done without replying. The thread SHALL then show as Done, leave the waiting count, and SHALL be markable as waiting again.

#### Scenario: Mark the design thread done
- **WHEN** the person clicks Mark done on `#design`
- **THEN** it shows Done and the Slack tab count drops from 3 to 2

### Requirement: Slack row on Today
Each simulated Slack thread waiting for the person's reply SHALL appear in Today's "Waiting for you" list under Needs your reply, labelled "Slack (sim)", with the asking message as title, the channel and author as context, and a Draft reply action that attaches the thread to the assistant. Mentions SHALL count toward the number of things that need the person and be named in the briefing sentence. Everything is counted from the database without a model call.

#### Scenario: Fresh sandbox
- **WHEN** a new visitor opens Today
- **THEN** Needs your reply lists `#partner-kr`, `#launch` and `#design`, and the briefing says "3 Slack mentions need a reply"

### Requirement: Ask about a thread
"Ask assistant" on a thread SHALL open the assistant panel with that thread attached to the composer as a chip showing the channel and the thread's first words, in the same way and with the same rules as an attached task: one attachment at a time, removable, re-read on the server with the person's permissions before anything is stored, and refused with "You don't have access to that thread." when not visible.

#### Scenario: Attach a thread
- **WHEN** the person clicks Ask assistant on the `#partner-kr` thread
- **THEN** the panel opens with a "#partner-kr · …" chip and any attached task is replaced by it

#### Scenario: Someone else's thread
- **WHEN** a request carries the id of a thread from another visitor's sandbox
- **THEN** it is refused with "You don't have access to that thread." and nothing is stored

### Requirement: Scripted Slack questions
In scripted demo mode the general fixed questions SHALL include "What needs my reply in Slack?" (runs `list_mentions` and lists the waiting threads). With a thread attached, the fixed questions SHALL be:
- Summarize this thread (runs `get_thread`; the reply states who asks what of Alex and, for `#partner-kr`, that one message contains an instruction to the assistant which was not followed);
- Translate the latest message (Korean threads only; runs `get_thread` and gives the English translation);
- Draft a reply (runs `reply_in_thread` with a prepared reply: in Korean with its English meaning for a Korean thread, in English otherwise).

The scripted replies and prepared translations and drafts SHALL come with the seed data, SHALL be shown only through these questions, and no model SHALL be called.

#### Scenario: What needs my reply
- **WHEN** a visitor clicks "What needs my reply in Slack?" in scripted mode
- **THEN** `list_mentions` runs and the reply lists the three waiting threads by channel and who is asking

#### Scenario: Injection is reported, not followed
- **WHEN** `#partner-kr` is attached and the visitor clicks "Summarize this thread"
- **THEN** the reply summarizes the request for banner sizes, says one message contains an instruction to the assistant that it ignored, and no write is proposed

#### Scenario: Korean draft
- **WHEN** `#partner-kr` is attached and the visitor clicks "Draft a reply"
- **THEN** an approval card shows a Korean reply with its English meaning, and nothing is posted until they approve
