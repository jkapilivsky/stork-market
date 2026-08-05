"use client";

import { FormEvent, useState } from "react";
import { MarketDetail } from "./markets/[slug]/MarketDetail";
import { useMarketStore } from "./market-store";

export default function Home() {
  const { state, addAnnotation } = useMarketStore();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  function publishAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteTitle.trim() || !noteBody.trim()) return;
    addAnnotation(noteTitle, noteBody);
    setNoteTitle("");
    setNoteBody("");
    setShowNoteForm(false);
  }

  return (
    <>
      <MarketDetail slug="girl-or-boy" />

      <section className="insights-grid gender-context" id="event-log">
        <article className="event-log-card">
          <header className="section-heading annotation-heading">
            <div>
              <span className="section-kicker">Shared family context</span>
              <h2>Event annotations</h2>
              <p>
                Approved updates can help guests make their gender prediction,
                but they never change the forecast automatically.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowNoteForm((current) => !current)}
              aria-expanded={showNoteForm}
              aria-controls="annotation-form"
            >
              {showNoteForm ? "Close" : "+ Add annotation"}
            </button>
          </header>

          {showNoteForm && (
            <form
              className="annotation-form"
              id="annotation-form"
              onSubmit={publishAnnotation}
            >
              <label>
                Annotation title
                <input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="e.g. Party update"
                  required
                />
              </label>
              <label>
                What happened?
                <textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Share the approved family detail."
                  rows={3}
                  required
                />
              </label>
              <div className="form-actions">
                <span>Saved only on this device in the demo.</span>
                <button type="submit">Publish note</button>
              </div>
            </form>
          )}

          <div className="context-banner">
            <span aria-hidden="true">✦</span>
            <p>
              Annotations are family context—not medical evidence. Odds move
              only when someone places a prediction.
            </p>
          </div>

          <div className="timeline">
            {state.annotations.map((annotation) => (
              <article className="timeline-entry" key={annotation.id}>
                <div
                  className={`timeline-marker ${annotation.tone}`}
                  aria-hidden="true"
                />
                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span>{annotation.date}</span>
                    <span className={`annotation-tag ${annotation.tone}`}>
                      {annotation.tag}
                    </span>
                  </div>
                  <h3>{annotation.title}</h3>
                  <p>{annotation.body}</p>
                  <span className="reaction">{annotation.reaction}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
