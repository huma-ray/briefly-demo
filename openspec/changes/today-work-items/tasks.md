## 1. Today and work items

- [x] 1.1 `lib/work-items.ts` with collectors for proposals, overdue / due-today tasks and simulated Slack mentions; verified Today lists all three sources for a fresh visitor
- [x] 1.2 Today in three blocks with per-item actions and quick actions (`askAssistant`); verified Ask assistant attaches WEB-18 and "What's due this week?" answers with 3 rows, at desktop and 375px

## 2. Demo data

- [x] 2.1 `lib/agent/sample-history.ts`: seven runs through real tools and commits, clamped to today (KST), model `sample`, excluded from the daily limit; verified the board shows 2 "via assistant" cards and the Agent log 8 runs with every result type

## 3. History menu

- [x] 3.1 History menu open state tied to the current page; verified closed on load and after navigating away while open

## 4. Checks

- [x] 4.1 typecheck, lint, unit tests, `check:rls` and a production build pass
