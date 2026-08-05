"use client";

import { useEffect, useRef } from "react";
import { MarketOutcomeDefinition, OutcomeKey, TrendPoint } from "../market-config";

type TrendChartProps = {
  points: TrendPoint[];
  outcomes: MarketOutcomeDefinition[];
  focusOutcomeKey: OutcomeKey;
};

export function TrendChart({
  points,
  outcomes,
  focusOutcomeKey,
}: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      const context = canvas.getContext("2d");
      if (!context) return;

      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const width = bounds.width;
      const height = bounds.height;
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * density);
      canvas.height = Math.floor(height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
      context.clearRect(0, 0, width, height);

      const compact = width < 280;
      const padding = {
        top: 16,
        right: compact ? 8 : 16,
        bottom: 16,
        left: compact ? 32 : 40,
      };
      const chartWidth = Math.max(width - padding.left - padding.right, 1);
      const chartHeight = Math.max(height - padding.top - padding.bottom, 1);
      const observedValues = points.flatMap((point) =>
        outcomes.map((outcome) => point.percentages[outcome.key] ?? 0),
      );
      const observedMinimum = Math.min(...observedValues, 0);
      const observedMaximum = Math.max(...observedValues, 1);
      const observedRange = observedMaximum - observedMinimum;
      const tickStep = observedRange <= 20 ? 5 : observedRange <= 50 ? 10 : 20;
      const minimum = Math.max(
        0,
        Math.floor((observedMinimum - tickStep) / tickStep) * tickStep,
      );
      const maximum = Math.min(
        100,
        Math.max(
          minimum + tickStep,
          Math.ceil((observedMaximum + tickStep) / tickStep) * tickStep,
        ),
      );
      const ticks = Array.from(
        { length: Math.floor((maximum - minimum) / tickStep) + 1 },
        (_, index) => minimum + index * tickStep,
      );
      const xFor = (index: number) =>
        points.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
      const yFor = (value: number) =>
        padding.top + ((maximum - value) / (maximum - minimum)) * chartHeight;

      context.font = `${compact ? 8 : 10}px Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      context.textAlign = "right";
      context.textBaseline = "middle";

      ticks.forEach((tick) => {
        const y = yFor(tick);
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.strokeStyle = "rgba(25, 51, 42, 0.09)";
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = "#75877f";
        context.fillText(`${tick}%`, padding.left - 8, y);
      });

      if (points.length === 0 || outcomes.length === 0) return;

      const focusOutcome =
        outcomes.find((outcome) => outcome.key === focusOutcomeKey) ?? outcomes[0];
      const focusValues = points.map(
        (point) => point.percentages[focusOutcome.key] ?? 0,
      );

      context.save();
      context.globalAlpha = 0.12;
      context.beginPath();
      focusValues.forEach((value, index) => {
        const x = xFor(index);
        const y = yFor(value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.lineTo(xFor(points.length - 1), yFor(minimum));
      context.lineTo(xFor(0), yFor(minimum));
      context.closePath();
      context.fillStyle = focusOutcome.color;
      context.fill();
      context.restore();

      function drawSeries(outcome: MarketOutcomeDefinition) {
        const values = points.map(
          (point) => point.percentages[outcome.key] ?? 0,
        );
        const isFocus = outcome.key === focusOutcome.key;
        context.save();
        context.globalAlpha = isFocus ? 1 : 0.78;
        context.beginPath();
        values.forEach((value, index) => {
          const x = xFor(index);
          const y = yFor(value);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.strokeStyle = outcome.color;
        context.lineWidth = isFocus ? 3 : 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();

        values.forEach((value, index) => {
          const x = xFor(index);
          const y = yFor(value);
          const isLatest = index === values.length - 1;
          const radius = isFocus
            ? isLatest
              ? compact
                ? 5
                : 6
              : compact
                ? 3
                : 4
            : isLatest
              ? 4
              : 2.5;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fillStyle = "#fffdf8";
          context.fill();
          context.strokeStyle = outcome.color;
          context.lineWidth = isFocus ? 2 : 1.5;
          context.stroke();
        });
        context.restore();
      }

      outcomes
        .filter((outcome) => outcome.key !== focusOutcome.key)
        .forEach(drawSeries);
      drawSeries(focusOutcome);
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [focusOutcomeKey, outcomes, points]);

  return (
    <div className="trend-chart-scroll">
      <div className="trend-legend" aria-hidden="true">
        {outcomes.map((outcome) => (
          <span key={outcome.key}>
            <i style={{ backgroundColor: outcome.color }} />
            {outcome.shortLabel}
          </span>
        ))}
      </div>
      <div className="trend-chart-inner">
        <canvas className="trend-canvas" ref={canvasRef} aria-hidden="true" />
        <div
          className="chart-axis"
          style={{
            gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`,
          }}
          aria-hidden="true"
        >
          {points.map((point) => (
            <span key={point.id}>{point.label}</span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Prediction probabilities over time</caption>
        <thead>
          <tr>
            <th>Date</th>
            {outcomes.map((outcome) => (
              <th key={outcome.key}>{outcome.label} probability</th>
            ))}
            <th>Market event</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.id}>
              <td>{point.label}</td>
              {outcomes.map((outcome) => (
                <td key={outcome.key}>
                  {point.percentages[outcome.key] ?? 0}%
                </td>
              ))}
              <td>{point.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
