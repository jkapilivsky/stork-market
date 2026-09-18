"use client";

import { useEffect, useState } from "react";
import { api } from "./EventProvider";

export function QRCard({ celebration = false }: { celebration?: boolean }) {
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const [error, setError] = useState(false);
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
  return (
    <aside className="party-qr-card">
      <span className="party-eyebrow">
        {celebration ? "THE LOVE KEEPS GOING" : "YOUR GUESS BELONGS HERE"}
      </span>
      <h2>
        {celebration ? (
          <>
            A little wish.
            <br />A lifetime of love.
          </>
        ) : (
          "Scan to Vote"
        )}
      </h2>
      <p>
        {celebration
          ? "Scan to leave a final wish"
          : "Choose boy or girl, then share your guess."}
        <br />
        {celebration ? "for Baby K and the parents." : null}
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
      <span className="qr-footnote" role="status">
        {celebration
          ? "The guessing is over. The love is just beginning."
          : "One guest. One guess. All the love."}
      </span>
    </aside>
  );
}
