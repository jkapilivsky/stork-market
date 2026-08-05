"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENT_CONFIG } from "../market-config";

type SizeMilestone = {
  week: number;
  item: string;
  emoji: string;
};

const DAY_MS = 86_400_000;
const PREGNANCY_DAYS = 280;
const BUILD_REFERENCE_DATE_UTC = Date.UTC(2026, 7, 5);

const SIZE_MILESTONES: SizeMilestone[] = [
  { week: 4, item: "poppy seed", emoji: "🌱" },
  { week: 5, item: "sesame seed", emoji: "🌱" },
  { week: 6, item: "pea", emoji: "🟢" },
  { week: 7, item: "grape", emoji: "🍇" },
  { week: 8, item: "raspberry", emoji: "🫐" },
  { week: 9, item: "strawberry", emoji: "🍓" },
  { week: 10, item: "small apricot", emoji: "🍑" },
  { week: 11, item: "fig", emoji: "🟣" },
  { week: 12, item: "plum", emoji: "🟣" },
  { week: 13, item: "peach", emoji: "🍑" },
  { week: 14, item: "kiwi", emoji: "🥝" },
  { week: 15, item: "apple", emoji: "🍎" },
  { week: 16, item: "avocado", emoji: "🥑" },
  { week: 17, item: "pomegranate", emoji: "❤️" },
  { week: 18, item: "bell pepper", emoji: "🫑" },
  { week: 19, item: "beef tomato", emoji: "🍅" },
  { week: 20, item: "banana", emoji: "🍌" },
  { week: 21, item: "carrot", emoji: "🥕" },
  { week: 22, item: "sweet potato", emoji: "🍠" },
  { week: 23, item: "large mango", emoji: "🥭" },
  { week: 24, item: "corn on the cob", emoji: "🌽" },
  { week: 25, item: "zucchini", emoji: "🥒" },
  { week: 26, item: "cucumber", emoji: "🥒" },
  { week: 27, item: "head of cauliflower", emoji: "🥦" },
  { week: 28, item: "eggplant", emoji: "🍆" },
  { week: 29, item: "butternut squash", emoji: "🎃" },
  { week: 30, item: "cabbage", emoji: "🥬" },
  { week: 31, item: "coconut", emoji: "🥥" },
  { week: 32, item: "bunch of celery", emoji: "🥬" },
  { week: 33, item: "pineapple", emoji: "🍍" },
  { week: 34, item: "cantaloupe", emoji: "🍈" },
  { week: 35, item: "honeydew melon", emoji: "🍈" },
  { week: 36, item: "head of romaine lettuce", emoji: "🥬" },
  { week: 37, item: "leek", emoji: "🥬" },
  { week: 38, item: "stalk of rhubarb", emoji: "🌿" },
  { week: 39, item: "small watermelon", emoji: "🍉" },
  { week: 40, item: "pumpkin", emoji: "🎃" },
];

function localCalendarDateAsUtc() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function articleFor(value: string) {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

export function BabySizeCard() {
  const [todayUtc, setTodayUtc] = useState(BUILD_REFERENCE_DATE_UTC);

  useEffect(() => {
    const refreshDate = () => setTodayUtc(localCalendarDateAsUtc());
    const frame = window.requestAnimationFrame(refreshDate);
    const interval = window.setInterval(refreshDate, 3_600_000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, []);

  const milestone = useMemo(() => {
    const daysUntilDue = Math.round(
      (EVENT_CONFIG.dueDateUtc - todayUtc) / DAY_MS,
    );
    const gestationalDays = PREGNANCY_DAYS - daysUntilDue;
    const clampedDays = Math.min(
      PREGNANCY_DAYS,
      Math.max(0, gestationalDays),
    );
    const completedWeeks = Math.floor(clampedDays / 7);
    const currentWeek = Math.min(40, Math.max(4, completedWeeks));
    const current =
      SIZE_MILESTONES.find((item) => item.week === currentWeek) ??
      SIZE_MILESTONES[0];
    const next = SIZE_MILESTONES.find((item) => item.week > currentWeek);
    const dayOfWeek = Math.max(0, clampedDays - currentWeek * 7);
    const daysUntilNext = next
      ? Math.max(1, next.week * 7 - gestationalDays)
      : 0;

    return {
      current,
      next,
      currentWeek,
      dayOfWeek,
      daysUntilNext,
      progress: (clampedDays / PREGNANCY_DAYS) * 100,
    };
  }, [todayUtc]);

  return (
    <section className="baby-size-card" aria-labelledby="baby-size-heading">
      <span className="baby-fruit" aria-hidden="true">
        {milestone.current.emoji}
      </span>
      <div className="baby-size-copy">
        <span>Baby size this week · estimated</span>
        <h2 id="baby-size-heading">
          About the size of {articleFor(milestone.current.item)}{" "}
          <strong>{milestone.current.item}</strong>
        </h2>
        <p>
          Estimated {milestone.currentWeek} weeks
          {milestone.dayOfWeek > 0
            ? `, ${milestone.dayOfWeek} ${
                milestone.dayOfWeek === 1 ? "day" : "days"
              }`
            : ""}{" "}
          · Due {EVENT_CONFIG.dueDateLabel}
        </p>
      </div>

      <div className="gestation-progress">
        <div className="gestation-labels">
          <span>Pregnancy progress</span>
          <strong>Week {milestone.currentWeek} of 40</strong>
        </div>
        <div
          className="gestation-track"
          role="progressbar"
          aria-label="Estimated pregnancy progress"
          aria-valuemin={0}
          aria-valuemax={40}
          aria-valuenow={milestone.currentWeek}
        >
          <span style={{ width: `${milestone.progress}%` }} />
        </div>
      </div>

      {milestone.next && (
        <div className="baby-size-next">
          <span>Next milestone</span>
          <strong>
            <span aria-hidden="true">{milestone.next.emoji} </span>
            {milestone.next.item} in {milestone.daysUntilNext}{" "}
            {milestone.daysUntilNext === 1 ? "day" : "days"}
          </strong>
        </div>
      )}

      <p className="baby-size-note">
        Fruit comparisons are playful estimates, not medical measurements.
      </p>
    </section>
  );
}

