import type { Metadata, Viewport } from "next";
import { HeroApprove, Nav } from "./islands";
import { DEMO_URL, GITHUB_URL, UPWORK_URL, VIDEO_URL } from "./links";

export const metadata: Metadata = {
  title: "Briefly · An AI assistant that asks before it acts",
  description:
    "Briefly collects your Slack mentions, Jira tickets and tasks into one list. The assistant drafts the reply or the ticket. Nothing is sent until you approve it.",
};
export const viewport: Viewport = { viewportFit: "cover" };

export default function Home() {
  return (
    <>
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </symbol>
        <symbol id="i-play" viewBox="0 0 24 24">
          <path d="M6 4l14 8-14 8z" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="m5 12 4.5 4.5L19 7" />
        </symbol>
        <symbol id="i-spark" viewBox="0 0 24 24">
          <path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z" />
          <path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
        </symbol>
        <symbol id="i-lock" viewBox="0 0 24 24">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
        </symbol>
        <symbol id="i-list" viewBox="0 0 24 24">
          <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
        </symbol>
        <symbol id="i-at" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24">
          <path d="m12 3 9 5-9 5-9-5z" />
          <path d="m3 13 9 5 9-5" />
        </symbol>
        <symbol id="i-globe" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
        </symbol>
        <symbol id="i-plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </symbol>
        <symbol id="i-gh" viewBox="0 0 24 24">
          <path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.1 5.4 2.4 5.4 2.4a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 4 9c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.3V21" />
        </symbol>
        <symbol id="i-x" viewBox="0 0 24 24">
          <path d="M18 6 6 18M6 6l12 12" />
        </symbol>
      </svg>

      <Nav />
      <main id="top">
        {/* ===== HERO ===== */}
        <section className="hero">
          <div className="wrap">
            <div className="hero-copy">
              <span className="eyebrow eyebrow-pill">
                <span className="dot"></span>AI work assistant · Demo project
              </span>
              <h1>
                Everything waiting for you.{" "}
                <span className="hl">Handled after one approval.</span>
              </h1>
              <p className="lead">
                Briefly collects your Slack mentions, Jira tickets and tasks
                into one list. The assistant drafts the reply or the ticket.
                Nothing is sent until you approve it.
              </p>
              <div className="ctas">
                <a className="btn btn-primary" id="demo" href={DEMO_URL}>
                  Try the live demo
                  <svg className="i arr">
                    <use href="#i-arrow" />
                  </svg>
                </a>
                <a className="btn btn-ghost" href="#video">
                  <span className="play">
                    <svg className="i">
                      <use href="#i-play" />
                    </svg>
                  </span>
                  Watch the 2-min video
                </a>
              </div>
              <ul className="trust">
                <li>
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                  No sign-up
                </li>
                <li>
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                  Sample data, resets nightly
                </li>
                <li>
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                  Open source
                </li>
              </ul>
            </div>

            <div className="stage" aria-label="Preview of the Today page">
              <div className="float f1">
                <span className="ic">
                  <svg className="i">
                    <use href="#i-layers" />
                  </svg>
                </span>
                <div>
                  <small>This morning</small>
                  <b>4 items need you</b> · from 3 sources
                </div>
              </div>

              <div className="app">
                <div className="app-bar">
                  <div className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="url">briefly.humadev.uz/today</span>
                </div>
                <div className="app-body">
                  <div className="today-h">
                    <b>Today</b>
                    <span>Thu, Nov 12</span>
                  </div>
                  <div className="brief">
                    <svg className="i">
                      <use href="#i-spark" />
                    </svg>
                    <div>
                      Mina asked about the ingest timeout before the 3 pm
                      deploy. I drafted a reply in Korean for you to check.
                    </div>
                  </div>
                  <div className="items">
                    <div className="item">
                      <span className="src src-slack">Slack</span>
                      <div style={{ minWidth: "0" }}>
                        <div className="t">
                          Mina Park mentioned you in #platform-dev
                        </div>
                        <div className="s">
                          &quot;Can you check the ingest timeout before 3
                          pm?&quot;
                        </div>
                      </div>
                      <span className="due due-today">2h ago</span>
                    </div>
                    <div className="item">
                      <span className="src src-jira">Jira</span>
                      <div style={{ minWidth: "0" }}>
                        <div className="t">
                          OPS-142 · Login fails after token refresh
                        </div>
                        <div className="s">Assigned to you · Ops space</div>
                      </div>
                      <span className="due due-today">Due today</span>
                    </div>
                    <div className="item">
                      <span className="src src-jira">Jira</span>
                      <div style={{ minWidth: "0" }}>
                        <div className="t">
                          WEB-31 · Update API docs for v1.4
                        </div>
                        <div className="s">Web space</div>
                      </div>
                      <span className="due due-over">2 days late</span>
                    </div>
                    <div className="item">
                      <span className="src src-own">Briefly</span>
                      <div style={{ minWidth: "0" }}>
                        <div className="t">Write release notes for v1.4</div>
                        <div className="s">Your task</div>
                      </div>
                      <span className="due due-later">Fri</span>
                    </div>
                  </div>
                  <HeroApprove />
                </div>
              </div>

              <div className="float f2">
                <span className="ic">
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                </span>
                <div>
                  <small>Logged</small>
                  <b>Reply sent after your approval</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SOURCES STRIP ===== */}
        <div className="strip">
          <div className="wrap">
            <span className="lbl">Reads from</span>
            <span className="chip">
              <span
                className="sq"
                style={{ background: "var(--src-slack)" }}
              ></span>
              Slack
            </span>
            <span className="chip">
              <span
                className="sq"
                style={{ background: "var(--src-jira)" }}
              ></span>
              Jira
            </span>
            <span className="chip">
              <span
                className="sq"
                style={{ background: "var(--src-own)" }}
              ></span>
              Briefly tasks
            </span>
            <span className="sep" aria-hidden="true"></span>
            <span className="lbl">Runs on</span>
            <span>OpenAI · Claude · your own vLLM server</span>
          </div>
        </div>

        {/* ===== BEFORE / AFTER ===== */}
        <section>
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">The problem</span>
              <h2>
                The work is never missing. It&apos;s spread across too many
                places.
              </h2>
            </div>
            <div className="ba">
              <article className="ba-card">
                <div className="ba-top">
                  <span className="ba-ic">
                    <svg className="i">
                      <use href="#i-at" />
                    </svg>
                  </span>
                  <div className="ba-before">
                    <b>Before</b>A teammate tagged you yesterday. The thread is
                    now 40 messages down, and nobody reminds you.
                  </div>
                </div>
                <div className="ba-after">
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                  <span>
                    Mentions stay in Today until you reply. Replying in the
                    thread clears them.
                  </span>
                </div>
              </article>
              <article className="ba-card">
                <div className="ba-top">
                  <span className="ba-ic">
                    <svg className="i">
                      <use href="#i-list" />
                    </svg>
                  </span>
                  <div className="ba-before">
                    <b>Before</b>Your tickets live in four Jira spaces. You
                    check two of them on a busy day.
                  </div>
                </div>
                <div className="ba-after">
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                  <span>
                    One list across every space, sorted by due date, with a link
                    to each ticket.
                  </span>
                </div>
              </article>
              <article className="ba-card">
                <div className="ba-top">
                  <span className="ba-ic">
                    <svg className="i">
                      <use href="#i-globe" />
                    </svg>
                  </span>
                  <div className="ba-before">
                    <b>Before</b>A long thread in Korean. You need the gist and
                    a careful reply, and it takes 20 minutes.
                  </div>
                </div>
                <div className="ba-after">
                  <svg className="i">
                    <use href="#i-check" />
                  </svg>
                  <span>
                    A summary, a translation and a draft reply in the
                    thread&apos;s language, ready to edit.
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ===== VIDEO ===== */}
        <section className="video" id="video">
          <div className="wrap video-grid">
            <div className="frame">
              <div className="poster" aria-hidden="true">
                <div className="p-side">
                  <div className="p-line" style={{ width: "70%" }}></div>
                  <div className="p-line"></div>
                  <div className="p-line" style={{ width: "55%" }}></div>
                  <div className="p-line" style={{ width: "80%" }}></div>
                </div>
                <div className="p-main">
                  <div
                    className="p-line"
                    style={{ width: "40%", height: "12px" }}
                  ></div>
                  <div className="p-card acc"></div>
                  <div className="p-card"></div>
                  <div className="p-card"></div>
                  <div className="p-card"></div>
                </div>
              </div>
              <a
                className="play-pill"
                href={VIDEO_URL}
                {...(VIDEO_URL.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
              >
                <span className="pc">
                  <svg className="i">
                    <use href="#i-play" />
                  </svg>
                </span>
                Watch the walkthrough
              </a>
              <span className="len">2:04</span>
            </div>
            <div>
              <div className="sec-head" style={{ marginBottom: "0" }}>
                <span className="eyebrow">Video · 2 minutes</span>
                <h2>One morning with Briefly</h2>
              </div>
              <ol className="checklist">
                <li>
                  <span className="n">1</span>
                  <span>
                    Open Today and read the briefing
                    <span className="ts">0:00</span>
                  </span>
                </li>
                <li>
                  <span className="n">2</span>
                  <span>
                    Summarize a Korean Slack thread and draft a reply
                    <span className="ts">0:25</span>
                  </span>
                </li>
                <li>
                  <span className="n">3</span>
                  <span>
                    Approve the reply and watch it leave Today
                    <span className="ts">0:58</span>
                  </span>
                </li>
                <li>
                  <span className="n">4</span>
                  <span>
                    Switch to a Member account and see what it can&apos;t open
                    <span className="ts">1:20</span>
                  </span>
                </li>
                <li>
                  <span className="n">5</span>
                  <span>
                    Check the agent log: tools, approver and cost
                    <span className="ts">1:42</span>
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">How it works</span>
              <h2>Collect, draft, approve.</h2>
              <p className="lead">
                The assistant does the reading and the writing. You keep the
                decision.
              </p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-h">
                  <span className="step-n">1</span>
                  <h3>Collect</h3>
                </div>
                <p>
                  Mentions, tickets and tasks assigned to you land in one Today
                  list, sorted by when they&apos;re due.
                </p>
                <div className="step-card">
                  <div className="row">
                    <span className="src src-slack">Slack</span>
                    <span className="t">Mina Park · #platform-dev</span>
                    <span className="r due due-today">2h</span>
                  </div>
                  <div className="row">
                    <span className="src src-jira">Jira</span>
                    <span className="t">OPS-142 · Login fails</span>
                    <span className="r due due-today">Today</span>
                  </div>
                  <div className="row">
                    <span className="src src-jira">Jira</span>
                    <span className="t">WEB-31 · API docs</span>
                    <span className="r due due-over">Late</span>
                  </div>
                  <div className="row">
                    <span className="src src-own">Briefly</span>
                    <span className="t">Release notes v1.4</span>
                    <span className="r due due-later">Fri</span>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-h">
                  <span className="step-n">2</span>
                  <h3>Draft</h3>
                </div>
                <p>
                  Ask the assistant to summarize, translate, reply or open a
                  ticket. It prepares the change but doesn&apos;t make it.
                </p>
                <div className="step-card">
                  <div className="tool-row">
                    <svg className="i">
                      <use href="#i-check" />
                    </svg>
                    summarize_thread · 18 messages
                  </div>
                  <div className="tool-row">
                    <svg className="i">
                      <use href="#i-check" />
                    </svg>
                    translate · ko → en
                  </div>
                  <div className="typing">
                    <div className="who">
                      <svg className="i">
                        <use href="#i-spark" />
                      </svg>
                      Assistant
                    </div>
                    <div className="tx">
                      Mina needs the gateway timeout raised before 3 pm. Draft
                      reply ready<span className="caret"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-h">
                  <span className="step-n">3</span>
                  <h3>Approve</h3>
                </div>
                <p>
                  You see exactly what will be sent or changed. Approve, edit or
                  cancel. Every step is logged.
                </p>
                <div className="step-card">
                  <div className="approve" style={{ boxShadow: "none" }}>
                    <div className="approve-h">
                      <svg className="i">
                        <use href="#i-lock" />
                      </svg>
                      Create Jira ticket in OPS?
                    </div>
                    <div className="draft">
                      <b style={{ fontWeight: "600" }}>
                        Raise gateway timeout to 120 s
                      </b>
                      <div className="ko">
                        From Slack · #platform-dev · linked
                      </div>
                    </div>
                    <div className="approve-f">
                      <span className="mini-btn pri">Create ticket</span>
                      <span className="mini-btn">Edit</span>
                      <span className="mini-btn">Cancel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== THE THREE RULES ===== */}
        <section className="rules" id="rules">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">The three rules</span>
              <h2>An assistant you can let near real work.</h2>
              <p className="lead">
                Most AI demos stop at the chat window. These three rules are
                what make an assistant safe to connect to Slack and Jira.
              </p>
            </div>
            <div className="rule-grid">
              <article className="rule">
                <span className="k">01 · Approval</span>
                <h3>Nothing changes without your yes</h3>
                <p>
                  Every message, ticket and status change waits on a card that
                  shows exactly what will happen.
                </p>
                <div className="rule-vis">
                  <div className="vis-btns">
                    <span className="mini-btn pri">Approve</span>
                    <span className="mini-btn">Edit</span>
                    <span className="mini-btn">Cancel</span>
                  </div>
                </div>
              </article>
              <article className="rule">
                <span className="k">02 · Access</span>
                <h3>It sees only what you can see</h3>
                <p>
                  The assistant works with your own account&apos;s permissions,
                  never an admin key. A private project stays private.
                </p>
                <div className="rule-vis">
                  <div className="acc-row">
                    <span
                      className="sq"
                      style={{ background: "var(--src-jira)" }}
                    ></span>
                    Website relaunch
                    <span className="r">
                      <svg className="i">
                        <use href="#i-check" />
                      </svg>
                      visible
                    </span>
                  </div>
                  <div className="acc-row locked">
                    <span
                      className="sq"
                      style={{ background: "var(--line-strong)" }}
                    ></span>
                    Mobile beta
                    <span className="r">
                      <svg className="i">
                        <use href="#i-lock" />
                      </svg>
                      no access
                    </span>
                  </div>
                </div>
              </article>
              <article className="rule">
                <span className="k">03 · Log</span>
                <h3>Every action is on record</h3>
                <p>
                  Who asked, which tools ran, who approved, and what it cost.
                  One page, no guessing.
                </p>
                <div className="rule-vis">
                  <div className="log-row">
                    <span className="tm">14:03</span>
                    <span className="tx">Reply sent in #platform-dev</span>
                    <span className="pill p-ok">Approved</span>
                  </div>
                  <div className="log-row">
                    <span className="tm">13:41</span>
                    <span className="tx">List tasks in Mobile beta</span>
                    <span className="pill p-warn">Blocked</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ===== AGENT LOG SHOWCASE ===== */}
        <section id="log">
          <div className="wrap">
            <div className="showcase-head">
              <div className="sec-head">
                <span className="eyebrow">Agent log</span>
                <h2>See what the assistant did, and what it cost.</h2>
              </div>
              <a className="btn btn-ghost" href={DEMO_URL}>
                Open the demo · no sign-up
                <svg className="i">
                  <use href="#i-arrow" />
                </svg>
              </a>
            </div>
            <div className="browser">
              <div className="app-bar">
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="url">briefly.humadev.uz/log</span>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Request</th>
                      <th>Tools</th>
                      <th>Result</th>
                      <th className="num">Tokens</th>
                      <th className="num">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="tm">14:03</td>
                      <td>
                        <span className="req">
                          Reply to Mina about the ingest timeout
                        </span>
                      </td>
                      <td>
                        <code>draft_reply · send_slack</code>
                      </td>
                      <td>
                        <span className="pill p-ok">Approved</span>
                      </td>
                      <td className="num">812 / 164</td>
                      <td className="num">$0.0002</td>
                    </tr>
                    <tr>
                      <td className="tm">13:58</td>
                      <td>
                        <span className="req">
                          Summarize the #platform-dev thread
                        </span>
                      </td>
                      <td>
                        <code>summarize_thread · translate</code>
                      </td>
                      <td>
                        <span className="pill p-off">Read only</span>
                      </td>
                      <td className="num">2,410 / 288</td>
                      <td className="num">$0.0005</td>
                    </tr>
                    <tr>
                      <td className="tm">13:41</td>
                      <td>
                        <span className="req">
                          Show everything in Mobile beta
                        </span>
                      </td>
                      <td>
                        <code>list_tasks</code>
                      </td>
                      <td>
                        <span className="pill p-warn">Blocked by access</span>
                      </td>
                      <td className="num">455 / 96</td>
                      <td className="num">$0.0001</td>
                    </tr>
                    <tr>
                      <td className="tm">11:47</td>
                      <td>
                        <span className="req">
                          Assign the redirects task to Sam
                        </span>
                      </td>
                      <td>
                        <code>assign_task</code>
                      </td>
                      <td>
                        <span className="pill p-err">Tool error</span>
                      </td>
                      <td className="num">470 / 118</td>
                      <td className="num">$0.0001</td>
                    </tr>
                    <tr>
                      <td className="tm">10:32</td>
                      <td>
                        <span className="req">
                          Open a ticket for the token refresh bug
                        </span>
                      </td>
                      <td>
                        <code>create_jira_issue</code>
                      </td>
                      <td>
                        <span className="pill p-wait">Awaiting approval</span>
                      </td>
                      <td className="num">604 / 190</td>
                      <td className="num">$0.0002</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="caption">
              Sample data from the demo workspace. Times are KST.
            </p>

            <div className="stats">
              <div className="stat">
                <div className="v">
                  <span>0</span>
                </div>
                <div className="k">Actions without approval</div>
                <p>
                  Read requests run freely. Anything that writes waits for you.
                </p>
              </div>
              <div className="stat">
                <div className="v">
                  <span>3</span>
                </div>
                <div className="k">Sources in one list</div>
                <p>
                  Slack mentions, Jira tickets and Briefly tasks, sorted by due
                  date.
                </p>
              </div>
              <div className="stat">
                <div className="v">
                  <span>1</span>
                </div>
                <div className="k">Log for everything</div>
                <p>Prompt, tools, approver, tokens and cost for every run.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== STACK ===== */}
        <section style={{ paddingTop: "0" }}>
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: "28px" }}>
              <span className="eyebrow">Built with</span>
              <h2>Ordinary tools, put together carefully.</h2>
            </div>
            <div className="stack">
              <div>
                <div className="k">App</div>
                <div className="v">Next.js · TypeScript · Tailwind</div>
              </div>
              <div>
                <div className="k">Data</div>
                <div className="v">Supabase Postgres · row-level security</div>
              </div>
              <div>
                <div className="k">Assistant</div>
                <div className="v">Vercel AI SDK · tool calling · Zod</div>
              </div>
              <div>
                <div className="k">Models</div>
                <div className="v">
                  OpenAI · Claude · any OpenAI-compatible endpoint
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section
          id="faq"
          style={{
            background: "var(--bg-soft)",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div className="wrap faq-grid">
            <div className="sec-head">
              <span className="eyebrow">FAQ</span>
              <h2>Questions people ask first</h2>
              <p className="lead">
                If yours isn&apos;t here, the code is open on GitHub.
              </p>
            </div>
            <div className="faq">
              <details open>
                <summary>
                  Can the assistant send a message without me?
                  <span className="pm">
                    <svg className="i">
                      <use href="#i-plus" />
                    </svg>
                  </span>
                </summary>
                <p>
                  No. Reading and summarizing run right away. Sending a Slack
                  message, creating a ticket or changing a status always shows
                  an approval card first, and nothing is written until you
                  approve it.
                </p>
              </details>
              <details>
                <summary>
                  Can it run on our own server?
                  <span className="pm">
                    <svg className="i">
                      <use href="#i-plus" />
                    </svg>
                  </span>
                </summary>
                <p>
                  Yes. The model is one setting. Point it at any
                  OpenAI-compatible endpoint, including a vLLM server inside
                  your network, and messages and tickets never leave it.
                </p>
              </details>
              <details>
                <summary>
                  What can it see in Slack and Jira?
                  <span className="pm">
                    <svg className="i">
                      <use href="#i-plus" />
                    </svg>
                  </span>
                </summary>
                <p>
                  Only what your own account can see. It uses your token, not an
                  admin key, so private channels and projects you can&apos;t
                  open stay closed to it too.
                </p>
              </details>
              <details>
                <summary>
                  Is the data in the demo real?
                  <span className="pm">
                    <svg className="i">
                      <use href="#i-plus" />
                    </svg>
                  </span>
                </summary>
                <p>
                  No. The demo uses a sample workspace with made-up people and
                  messages. It resets every night at 03:00 KST, so feel free to
                  approve, edit and cancel anything.
                </p>
              </details>
              <details>
                <summary>
                  Can I buy Briefly?
                  <span className="pm">
                    <svg className="i">
                      <use href="#i-plus" />
                    </svg>
                  </span>
                </summary>
                <p>
                  Briefly is a demo project, not a product for sale. I build
                  assistants like this for teams, connected to their own tools
                  and data. If that&apos;s what you need, reach me on Upwork.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="final" style={{ background: "var(--bg-soft)" }}>
          <div className="wrap">
            <div className="final-card">
              <div>
                <h2>Try it with one click.</h2>
                <p>
                  The demo opens on Today with a reply waiting for your
                  approval. No account, no email.
                </p>
              </div>
              <div className="ctas">
                <a className="btn btn-primary" href={DEMO_URL}>
                  Try the live demo
                  <svg className="i arr">
                    <use href="#i-arrow" />
                  </svg>
                </a>
                <a
                  className="btn btn-ghost"
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="i">
                    <use href="#i-gh" />
                  </svg>
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-l">
            <a className="brand" href="#top">
              <span className="mark">B</span>Briefly
            </a>
            <p>
              A demo project by Huma, a full-stack AI engineer in Seoul. Built
              to show how an AI assistant can work inside real tools, safely.
            </p>
          </div>
          <div className="foot-links">
            <div className="foot-col">
              <b>Project</b>
              <a href={DEMO_URL}>Live demo</a>
              <a href="#video">Video</a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
            <div className="foot-col">
              <b>Author</b>
              <a
                href="https://humadev.uz"
                target="_blank"
                rel="noopener noreferrer"
              >
                humadev.uz
              </a>
              <a href={UPWORK_URL} target="_blank" rel="noopener noreferrer">
                Hire me on Upwork
              </a>
            </div>
          </div>
          <div className="copy">
            <span>© 2026 Huma</span>
            <span>Sample data only · resets nightly at 03:00 KST</span>
          </div>
        </div>
      </footer>
    </>
  );
}
