"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "./EventProvider";

export function QRCard({ celebration = false }: { celebration?: boolean }) {
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyHint, setCopyHint] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<{ url: string; dataUrl: string }>(
      celebration ? "/api/qr?page=celebration" : "/api/qr",
    )
      .then((value) => {
        if (active) {
          setQr(value);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, celebration]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copyLink() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.url);
      setCopied(true);
      setCopyHint("");
    } catch {
      setCopied(false);
      setCopyHint("Press and hold, or right-click, the link to copy it.");
    }
  }
  return (
    <aside className="party-qr-card">
      <span className="party-eyebrow">
        {celebration ? "THE LOVE KEEPS GOING" : "YOUR GUESS BELONGS HERE"}
      </span>
      <h2>
        {celebration ? "A little wish." : "A tiny vote."}
        <br />
        {celebration ? "A lifetime of love." : "A big surprise."}
      </h2>
      <p>
        {celebration
          ? "Scan to leave a final wish"
          : "Scan, leave a little love,"}
        <br />
        {celebration ? "for Baby K and the parents." : "and pick your team."}
      </p>
      <div className="party-qr">
        {qr ? (
          <>
            {/* A generated, lossless QR needs its original pixels. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr.dataUrl}
              width={240}
              height={240}
              alt={
                celebration
                  ? "Scan to open the Baby K celebration page"
                  : "Scan to open the Baby K voting page"
              }
            />
          </>
        ) : (
          <div className="party-qr-placeholder">
            {error ? (
              <button onClick={() => setAttempt((value) => value + 1)}>
                Reload QR code
              </button>
            ) : (
              "Getting your QR ready…"
            )}
          </div>
        )}
      </div>
      <strong className="qr-instruction">
        Point your camera here <span aria-hidden="true">↗</span>
      </strong>
      <div className="party-qr-link">
        {qr ? (
          <>
            <a href={qr.url}>{qr.url.replace(/^https?:\/\//, "")}</a>
            <button
              type="button"
              onClick={copyLink}
              aria-label={
                celebration ? "Copy celebration link" : "Copy voting link"
              }
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </>
        ) : (
          <Link href={celebration ? "/celebration" : "/vote"}>
            {celebration ? "Join the celebration" : "Open voting page"} ↗
          </Link>
        )}
      </div>
      <span className="qr-footnote" role="status">
        {copyHint ||
          (celebration
            ? "The guessing is over. The love is just beginning."
            : "One guest. One guess. All the love.")}
      </span>
    </aside>
  );
}
