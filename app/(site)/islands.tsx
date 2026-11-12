"use client";
// The two interactive bits of the homepage: the mobile menu and the hero approval card.
import { useState } from "react";
import { DEMO_URL, GITHUB_URL } from "./links";

export function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="nav" id="nav" data-open={String(open)}>
      <div className="wrap">
        <a className="brand" href="#top">
          <span className="mark">B</span>Briefly
          <span className="tag">demo</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#rules">The three rules</a>
          <a href="#log">Agent log</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="right">
          <a
            className="gh"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="i">
              <use href="#i-gh" />
            </svg>
            GitHub
          </a>
          <a className="btn btn-primary btn-sm" href={DEMO_URL}>
            Try the demo
          </a>
          <button
            className="menu-btn"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg className="i">
              <use href={open ? "#i-x" : "#i-menu"} />
            </svg>
          </button>
        </div>
      </div>
      <div className="mobile-menu wrap" id="mobileMenu" onClick={close}>
        <a href="#how">How it works</a>
        <a href="#rules">The three rules</a>
        <a href="#log">Agent log</a>
        <a href="#faq">FAQ</a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a
          className="btn btn-primary"
          href={DEMO_URL}
          style={{ marginTop: "8px", color: "var(--on-accent)" }}
        >
          Try the live demo
        </a>
      </div>
    </header>
  );
}

/** The approval card works, so the first click shows the idea. */
export function HeroApprove() {
  const [sent, setSent] = useState(false);
  return (
    <div
      className="approve"
      id="heroApprove"
      data-state={sent ? "sent" : "pending"}
    >
      <div className="approve-h">
        <svg className="i">
          <use href={sent ? "#i-check" : "#i-lock"} />
        </svg>
        <span>
          {sent
            ? "Reply sent in #platform-dev"
            : "Send reply in #platform-dev?"}
        </span>
        <span className="tr">Translated from Korean</span>
      </div>
      <div className="draft">
        &quot;I checked it. The timeout is 30 s on the gateway, and I&apos;ll
        raise it to 120 s before the deploy.&quot;
        <div className="ko">
          확인했습니다. 게이트웨이 타임아웃이 30초라서 배포 전에 120초로
          올리겠습니다.
        </div>
      </div>
      <div className="approve-f">
        {sent ? (
          <span className="sent-line">
            <svg className="i">
              <use href="#i-check" />
            </svg>
            Approved by you at 14:03 · added to the agent log
          </span>
        ) : (
          <>
            <button
              className="mini-btn pri"
              type="button"
              onClick={() => setSent(true)}
            >
              Send reply
            </button>
            <button className="mini-btn" type="button">
              Edit
            </button>
            <button className="mini-btn" type="button">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
