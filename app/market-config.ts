export type OutcomeKey = string;
export type MarketTone = "coral" | "gold" | "sage" | "blue";
export type MarketGroup = "Reveal" | "Arrival" | "Baby details";

export type MarketOutcomeDefinition = {
  key: OutcomeKey;
  label: string;
  shortLabel: string;
  color: string;
  initialPool: number;
};

export type TrendPoint = {
  id: string;
  label: string;
  percentages: Record<OutcomeKey, number>;
  source: string;
};

export type MarketDefinition = {
  slug: string;
  group: MarketGroup;
  tone: MarketTone;
  eyebrow: string;
  shortTitle: string;
  question: string;
  outcomes: MarketOutcomeDefinition[];
  trendFocusKey: OutcomeKey;
  seededParticipants: number;
  opensLabel: string;
  lockLabel: string;
  lockAt: string;
  resolutionSummary: string;
  resolutionSource: string;
  rules: string[];
  featured?: boolean;
  trend: TrendPoint[];
};

export type Annotation = {
  id: string;
  date: string;
  tag: string;
  title: string;
  body: string;
  reaction: string;
  tone: "official" | "family" | "party" | "custom";
};

export const EVENT_CONFIG = {
  title: "Baby K’s family forecast",
  revealLabel: "Saturday, Oct 10 · 1:00 PM",
  dueDateLabel: "February 3, 2027",
  dueDateUtc: Date.UTC(2027, 1, 3),
  timezone: "America/Chicago",
  timezoneLabel: "Central Time",
  startingCredits: 1000,
  minimumPrediction: 25,
};

export const MARKET_DEFINITIONS: MarketDefinition[] = [
  {
    slug: "girl-or-boy",
    group: "Reveal",
    tone: "coral",
    eyebrow: "Gender reveal",
    shortTitle: "Gender",
    question: "What will the parents reveal?",
    outcomes: [
      {
        key: "girl",
        label: "Girl",
        shortLabel: "Girl",
        color: "#d87869",
        initialPool: 9940,
      },
      {
        key: "boy",
        label: "Boy",
        shortLabel: "Boy",
        color: "#6c98b9",
        initialPool: 8460,
      },
    ],
    trendFocusKey: "girl",
    seededParticipants: 28,
    opensLabel: "Open now",
    lockLabel: "Oct 10 · 1:00 PM CT",
    lockAt: "2026-10-10T13:00:00-05:00",
    resolutionSummary:
      "Resolves from the result announced at the family’s gender reveal.",
    resolutionSource:
      "The parent-approved result announced by the organizer at the reveal party.",
    rules: [
      "Girl wins if the organizer confirms Girl as the result announced at the reveal.",
      "Boy wins if the organizer confirms Boy as the result announced at the reveal.",
      "Predictions lock when the reveal begins on October 10 at 1:00 PM Central Time.",
    ],
    featured: true,
    trend: [
      {
        id: "gender-1",
        label: "Jul 4",
        percentages: { girl: 49, boy: 51 },
        source: "Reveal date announced",
      },
      {
        id: "gender-2",
        label: "Jul 12",
        percentages: { girl: 51, boy: 49 },
        source: "First family predictions",
      },
      {
        id: "gender-3",
        label: "Jul 18",
        percentages: { girl: 50, boy: 50 },
        source: "Appointment annotation",
      },
      {
        id: "gender-4",
        label: "Jul 26",
        percentages: { girl: 53, boy: 47 },
        source: "Family poll shared",
      },
      {
        id: "gender-5",
        label: "Aug 2",
        percentages: { girl: 54, boy: 46 },
        source: "Reveal envelope delivered",
      },
    ],
  },
  {
    slug: "birth-date",
    group: "Arrival",
    tone: "gold",
    eyebrow: "Arrival date",
    shortTitle: "Birth date",
    question: "When will Baby K arrive?",
    outcomes: [
      {
        key: "jan-26-or-earlier",
        label: "January 26 or earlier",
        shortLabel: "Jan 26 or earlier",
        color: "#a96555",
        initialPool: 1840,
      },
      {
        key: "jan-27-feb-2",
        label: "January 27–February 2",
        shortLabel: "Jan 27–Feb 2",
        color: "#c88b35",
        initialPool: 5888,
      },
      {
        key: "feb-3",
        label: "February 3",
        shortLabel: "Due date · Feb 3",
        color: "#648a70",
        initialPool: 2392,
      },
      {
        key: "feb-4-10",
        label: "February 4–10",
        shortLabel: "Feb 4–10",
        color: "#547fa0",
        initialPool: 6808,
      },
      {
        key: "feb-11-or-later",
        label: "February 11 or later",
        shortLabel: "Feb 11 or later",
        color: "#8a7998",
        initialPool: 1472,
      },
    ],
    trendFocusKey: "feb-4-10",
    seededParticipants: 34,
    opensLabel: "Open now",
    lockLabel: "Jan 16 · 11:59 PM CT",
    lockAt: "2027-01-16T23:59:00-06:00",
    resolutionSummary:
      "Choose one mutually exclusive date window. Exactly one outcome wins when the family confirms the local birth date.",
    resolutionSource:
      "The birth date confirmed by the organizer after approval from the parents.",
    rules: [
      "Exactly one listed date window wins; the windows do not overlap and together cover every possible birth date.",
      "Each displayed range includes both dates. For example, February 4–10 includes February 4 and February 10.",
      "The calendar date is determined in America/Chicago, regardless of the guest’s location.",
    ],
    trend: [
      {
        id: "date-1",
        label: "Jul 8",
        percentages: {
          "jan-26-or-earlier": 13,
          "jan-27-feb-2": 31,
          "feb-3": 12,
          "feb-4-10": 35,
          "feb-11-or-later": 9,
        },
        source: "Arrival market opened",
      },
      {
        id: "date-2",
        label: "Jul 15",
        percentages: {
          "jan-26-or-earlier": 12,
          "jan-27-feb-2": 32,
          "feb-3": 12,
          "feb-4-10": 35,
          "feb-11-or-later": 9,
        },
        source: "First family picks",
      },
      {
        id: "date-3",
        label: "Jul 22",
        percentages: {
          "jan-26-or-earlier": 11,
          "jan-27-feb-2": 33,
          "feb-3": 12,
          "feb-4-10": 36,
          "feb-11-or-later": 8,
        },
        source: "More arrival predictions",
      },
      {
        id: "date-4",
        label: "Jul 29",
        percentages: {
          "jan-26-or-earlier": 11,
          "jan-27-feb-2": 32,
          "feb-3": 13,
          "feb-4-10": 36,
          "feb-11-or-later": 8,
        },
        source: "Due-date conversation",
      },
      {
        id: "date-5",
        label: "Aug 5",
        percentages: {
          "jan-26-or-earlier": 10,
          "jan-27-feb-2": 32,
          "feb-3": 13,
          "feb-4-10": 37,
          "feb-11-or-later": 8,
        },
        source: "Latest arrival forecast",
      },
    ],
  },
  {
    slug: "birth-weight",
    group: "Baby details",
    tone: "sage",
    eyebrow: "Birth stats",
    shortTitle: "Birth weight",
    question: "What will Baby K weigh at birth?",
    outcomes: [
      {
        key: "under-seven",
        label: "Under 7 lb",
        shortLabel: "Under 7 lb",
        color: "#b86a58",
        initialPool: 2576,
      },
      {
        key: "seven-pounds",
        label: "7 lb–7 lb 15 oz",
        shortLabel: "7–7 lb 15 oz",
        color: "#d29542",
        initialPool: 6808,
      },
      {
        key: "eight-pounds",
        label: "8 lb–8 lb 15 oz",
        shortLabel: "8–8 lb 15 oz",
        color: "#648a70",
        initialPool: 7176,
      },
      {
        key: "nine-plus",
        label: "9 lb or more",
        shortLabel: "9 lb or more",
        color: "#6d789e",
        initialPool: 1840,
      },
    ],
    trendFocusKey: "eight-pounds",
    seededParticipants: 25,
    opensLabel: "Open now",
    lockLabel: "Jan 16 · 11:59 PM CT",
    lockAt: "2027-01-16T23:59:00-06:00",
    resolutionSummary:
      "Choose the weight range that contains the parent-approved birth weight. Exactly one range wins.",
    resolutionSource:
      "The birth weight shared by the organizer after approval from the parents.",
    rules: [
      "The organizer uses the birth weight recorded at delivery and shared with the family.",
      "A boundary weight belongs to the range that prints it; 8 lb exactly belongs to 8 lb–8 lb 15 oz.",
      "If the family does not share a birth weight, the market remains pending rather than using an estimate.",
    ],
    trend: [
      {
        id: "weight-1",
        label: "Jul 8",
        percentages: {
          "under-seven": 15,
          "seven-pounds": 36,
          "eight-pounds": 38,
          "nine-plus": 11,
        },
        source: "Weight market opened",
      },
      {
        id: "weight-2",
        label: "Jul 15",
        percentages: {
          "under-seven": 15,
          "seven-pounds": 37,
          "eight-pounds": 38,
          "nine-plus": 10,
        },
        source: "First family picks",
      },
      {
        id: "weight-3",
        label: "Jul 22",
        percentages: {
          "under-seven": 14,
          "seven-pounds": 37,
          "eight-pounds": 39,
          "nine-plus": 10,
        },
        source: "More weight predictions",
      },
      {
        id: "weight-4",
        label: "Jul 29",
        percentages: {
          "under-seven": 14,
          "seven-pounds": 36,
          "eight-pounds": 40,
          "nine-plus": 10,
        },
        source: "Family forecast moved",
      },
      {
        id: "weight-5",
        label: "Aug 5",
        percentages: {
          "under-seven": 14,
          "seven-pounds": 37,
          "eight-pounds": 39,
          "nine-plus": 10,
        },
        source: "Latest weight forecast",
      },
    ],
  },
  {
    slug: "birth-time",
    group: "Arrival",
    tone: "blue",
    eyebrow: "Time of day",
    shortTitle: "Birth time",
    question: "What time of day will Baby K arrive?",
    outcomes: [
      {
        key: "overnight",
        label: "Overnight · 12:00–5:59 AM",
        shortLabel: "Overnight",
        color: "#5c668c",
        initialPool: 4048,
      },
      {
        key: "morning",
        label: "Morning · 6:00–11:59 AM",
        shortLabel: "Morning",
        color: "#d39a3b",
        initialPool: 5520,
      },
      {
        key: "afternoon",
        label: "Afternoon · 12:00–5:59 PM",
        shortLabel: "Afternoon",
        color: "#d87869",
        initialPool: 4968,
      },
      {
        key: "evening",
        label: "Evening · 6:00–11:59 PM",
        shortLabel: "Evening",
        color: "#6b779f",
        initialPool: 3864,
      },
    ],
    trendFocusKey: "morning",
    seededParticipants: 23,
    opensLabel: "Open now",
    lockLabel: "Jan 16 · 11:59 PM CT",
    lockAt: "2027-01-16T23:59:00-06:00",
    resolutionSummary:
      "Choose one time-of-day window. Exactly one outcome wins from the confirmed local delivery time.",
    resolutionSource:
      "The local time of birth shared by the organizer after approval from the parents.",
    rules: [
      "The printed windows are mutually exclusive and together cover all 24 hours of the day.",
      "The recorded time is interpreted in America/Chicago, including the AM or PM designation.",
      "If the family shares only the date and not the time, this market remains pending.",
    ],
    trend: [
      {
        id: "time-1",
        label: "Jul 8",
        percentages: {
          overnight: 22,
          morning: 29,
          afternoon: 28,
          evening: 21,
        },
        source: "Birth-time market opened",
      },
      {
        id: "time-2",
        label: "Jul 15",
        percentages: {
          overnight: 22,
          morning: 30,
          afternoon: 27,
          evening: 21,
        },
        source: "First family picks",
      },
      {
        id: "time-3",
        label: "Jul 22",
        percentages: {
          overnight: 21,
          morning: 30,
          afternoon: 28,
          evening: 21,
        },
        source: "More time predictions",
      },
      {
        id: "time-4",
        label: "Jul 29",
        percentages: {
          overnight: 22,
          morning: 31,
          afternoon: 27,
          evening: 20,
        },
        source: "Family forecast moved",
      },
      {
        id: "time-5",
        label: "Aug 5",
        percentages: {
          overnight: 22,
          morning: 30,
          afternoon: 27,
          evening: 21,
        },
        source: "Latest time forecast",
      },
    ],
  },
];

export const INITIAL_ANNOTATIONS: Annotation[] = [
  {
    id: "appointment",
    date: "Aug 2",
    tag: "Appointment update",
    title: "Everything is tracking right on schedule",
    body: "The family shared that the latest routine check-in went well. Added as event context only—not as medical evidence.",
    reaction: "Forecasts unchanged",
    tone: "official",
  },
  {
    id: "poll",
    date: "Jul 26",
    tag: "Family poll",
    title: "Grandparents are leaning girl",
    body: "A very unofficial dinner-table poll came back 6–4 for girl. Confidence level: mostly vibes.",
    reaction: "+2 pts Girl",
    tone: "family",
  },
  {
    id: "heartbeat",
    date: "Jul 18",
    tag: "Appointment update",
    title: "Heartbeat shared: 148 BPM",
    body: "Added as family context only. Heart-rate folklore is not a medical way to predict a baby’s sex.",
    reaction: "12 reactions",
    tone: "official",
  },
  {
    id: "party",
    date: "Jul 4",
    tag: "Party update",
    title: "The reveal date is on the calendar",
    body: "The Gender market will lock when the reveal begins on Saturday, October 10 at 1:00 PM.",
    reaction: "Rules confirmed",
    tone: "party",
  },
];

export function getMarketDefinition(slug: string) {
  return MARKET_DEFINITIONS.find((market) => market.slug === slug);
}

export function getOutcomeDefinition(
  market: MarketDefinition,
  outcomeKey: OutcomeKey,
) {
  return market.outcomes.find((outcome) => outcome.key === outcomeKey);
}

export function getMarketTotalPool(pools: Record<OutcomeKey, number>) {
  return Object.values(pools).reduce((total, value) => total + value, 0);
}

export function getMarketPercentages(pools: Record<OutcomeKey, number>) {
  const entries = Object.entries(pools);
  if (entries.length === 0) return {};

  const total = getMarketTotalPool(pools);
  if (total <= 0) {
    const equalShare = Math.floor(100 / entries.length);
    const remainder = 100 - equalShare * entries.length;
    return Object.fromEntries(
      entries.map(([key], index) => [key, equalShare + (index < remainder ? 1 : 0)]),
    );
  }

  const calculated = entries.map(([key, value]) => {
    const exact = (value / total) * 100;
    return { key, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let pointsToAssign =
    100 - calculated.reduce((sum, outcome) => sum + outcome.value, 0);

  calculated
    .slice()
    .sort((first, second) => second.remainder - first.remainder)
    .forEach((outcome) => {
      if (pointsToAssign <= 0) return;
      const target = calculated.find((item) => item.key === outcome.key);
      if (target) target.value += 1;
      pointsToAssign -= 1;
    });

  return Object.fromEntries(
    calculated.map((outcome) => [outcome.key, outcome.value]),
  );
}

export function formatCredits(value: number) {
  return Math.round(value).toLocaleString("en-US");
}
