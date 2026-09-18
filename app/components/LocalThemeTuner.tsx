"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const DEFAULT_COLOR = "#CC5500";
const DEFAULT_OPACITY = 13;
function validColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function applyTheme(color: string, opacity: number) {
  document.documentElement.style.setProperty("--party-orange", color);
  document.documentElement.style.setProperty(
    "--party-scan-opacity",
    `${opacity}%`,
  );
}

export function LocalThemeTuner() {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
  const visible = useSyncExternalStore(
    () => () => {},
    () =>
      ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
        window.location.hostname,
      ),
    () => false,
  );

  useEffect(() => {
    if (visible) applyTheme(color, opacity);
  }, [color, opacity, visible]);

  function updateColor(value: string) {
    const next = value.toUpperCase();
    setColor(next);
    if (!validColor(next)) return;
    applyTheme(next, opacity);
  }

  function updateOpacity(value: number) {
    setOpacity(value);
    applyTheme(validColor(color) ? color : DEFAULT_COLOR, value);
  }

  function reset() {
    setColor(DEFAULT_COLOR);
    setOpacity(DEFAULT_OPACITY);
    applyTheme(DEFAULT_COLOR, DEFAULT_OPACITY);
  }

  if (!visible) return null;

  return (
    <details className="local-theme-tuner">
      <summary>Theme tester</summary>
      <div className="local-theme-tuner-controls">
        <label>
          Burnt orange
          <span>
            <input
              type="color"
              value={validColor(color) ? color : DEFAULT_COLOR}
              onChange={(event) => updateColor(event.target.value)}
              aria-label="Burnt orange color picker"
            />
            <input
              value={color}
              onChange={(event) => updateColor(event.target.value)}
              maxLength={7}
              spellCheck={false}
              aria-label="Burnt orange hex value"
            />
          </span>
        </label>
        <label>
          Scan card opacity <strong>{opacity}%</strong>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={opacity}
            onChange={(event) => updateOpacity(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={reset}>Reset to #CC5500</button>
        <small>Localhost only · changes reset on refresh</small>
      </div>
    </details>
  );
}
