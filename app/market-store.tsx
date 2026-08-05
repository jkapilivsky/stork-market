"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Annotation,
  EVENT_CONFIG,
  INITIAL_ANNOTATIONS,
  MARKET_DEFINITIONS,
  OutcomeKey,
  TrendPoint,
  getMarketPercentages,
  getMarketTotalPool,
} from "./market-config";

export type Position = {
  spent: number;
  shares: number;
};

export type PredictionRecord = {
  id: string;
  marketSlug: string;
  outcome: OutcomeKey;
  credits: number;
  entryPrice: number;
  estimatedPayout: number;
  estimatedProfit: number;
  placedAt: string;
};

export type MarketRuntimeState = {
  pools: Record<OutcomeKey, number>;
  positions: Record<OutcomeKey, Position>;
  trend: TrendPoint[];
  predictions: PredictionRecord[];
};

type DemoState = {
  balance: number;
  markets: Record<string, MarketRuntimeState>;
  annotations: Annotation[];
};

type SavedDemoState = {
  balance?: unknown;
  markets?: Record<string, Partial<MarketRuntimeState>>;
  annotations?: unknown;
};

type PlacementResult =
  | { ok: true; record: PredictionRecord }
  | { ok: false; message: string };

type MarketStoreValue = {
  state: DemoState;
  ready: boolean;
  placePrediction: (
    marketSlug: string,
    outcome: OutcomeKey,
    credits: number,
  ) => PlacementResult;
  addAnnotation: (title: string, body: string) => void;
  resetDemo: () => void;
};

const STORAGE_KEY = "stork-market-multi-v2";

function createInitialState(): DemoState {
  return {
    balance: EVENT_CONFIG.startingCredits,
    markets: Object.fromEntries(
      MARKET_DEFINITIONS.map((market) => [
        market.slug,
        {
          pools: Object.fromEntries(
            market.outcomes.map((outcome) => [outcome.key, outcome.initialPool]),
          ),
          positions: Object.fromEntries(
            market.outcomes.map((outcome) => [
              outcome.key,
              { spent: 0, shares: 0 },
            ]),
          ),
          trend: market.trend.map((point) => ({
            ...point,
            percentages: { ...point.percentages },
          })),
          predictions: [],
        },
      ]),
    ),
    annotations: INITIAL_ANNOTATIONS.map((annotation) => ({ ...annotation })),
  };
}

function restoreState(value: string): DemoState {
  const initial = createInitialState();
  const saved = JSON.parse(value) as SavedDemoState;

  const hasCompatibleMarketState = Object.values(saved.markets ?? {}).some(
    (market) => market.pools && typeof market.pools === "object",
  );
  if (saved.markets && !hasCompatibleMarketState) return initial;

  if (typeof saved.balance === "number" && saved.balance >= 0) {
    initial.balance = saved.balance;
  }

  MARKET_DEFINITIONS.forEach((definition) => {
    const savedMarket = saved.markets?.[definition.slug];
    if (!savedMarket) return;

    const validOutcomeKeys = new Set(
      definition.outcomes.map((outcome) => outcome.key),
    );
    const pools = Object.fromEntries(
      definition.outcomes.map((outcome) => {
        const savedPool = savedMarket.pools?.[outcome.key];
        return [
          outcome.key,
          typeof savedPool === "number" && savedPool >= 0
            ? savedPool
            : outcome.initialPool,
        ];
      }),
    );
    const positions = Object.fromEntries(
      definition.outcomes.map((outcome) => {
        const savedPosition = savedMarket.positions?.[outcome.key];
        return [
          outcome.key,
          savedPosition &&
          typeof savedPosition.spent === "number" &&
          typeof savedPosition.shares === "number"
            ? savedPosition
            : { spent: 0, shares: 0 },
        ];
      }),
    );
    const predictions = Array.isArray(savedMarket.predictions)
      ? savedMarket.predictions.filter((prediction) =>
          validOutcomeKeys.has(prediction.outcome),
        )
      : [];
    const savedTrend = Array.isArray(savedMarket.trend)
      ? savedMarket.trend.filter(
          (point) =>
            point &&
            typeof point === "object" &&
            point.percentages &&
            typeof point.percentages === "object",
        )
      : [];
    const trend =
      savedTrend.length > 0
        ? savedTrend
        : initial.markets[definition.slug].trend;

    initial.markets[definition.slug] = {
      pools,
      positions,
      predictions,
      trend,
    };
  });

  if (Array.isArray(saved.annotations)) {
    initial.annotations = saved.annotations as Annotation[];
  }

  return initial;
}

const MarketStoreContext = createContext<MarketStoreValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createInitialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setState(restoreState(saved));
      } catch {
        // The deterministic seeded state remains available when storage fails.
      } finally {
        setReady(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  function placePrediction(
    marketSlug: string,
    outcome: OutcomeKey,
    credits: number,
  ): PlacementResult {
    const definition = MARKET_DEFINITIONS.find(
      (market) => market.slug === marketSlug,
    );
    const market = state.markets[marketSlug];
    const outcomeDefinition = definition?.outcomes.find(
      (candidate) => candidate.key === outcome,
    );

    if (!definition || !market || !outcomeDefinition) {
      return { ok: false, message: "That outcome is not available." };
    }
    if (credits < EVENT_CONFIG.minimumPrediction || credits > state.balance) {
      return {
        ok: false,
        message: `Choose an amount between ${EVENT_CONFIG.minimumPrediction} and your available balance.`,
      };
    }

    const totalPool = getMarketTotalPool(market.pools);
    const entryPrice = market.pools[outcome] / totalPool;
    const shares = credits / entryPrice;
    const now = new Date();
    const record: PredictionRecord = {
      id: `${now.getTime()}-${marketSlug}-${outcome}`,
      marketSlug,
      outcome,
      credits,
      entryPrice,
      estimatedPayout: shares,
      estimatedProfit: shares - credits,
      placedAt: now.toISOString(),
    };

    setState((current) => {
      const currentMarket = current.markets[marketSlug];
      if (!currentMarket || current.balance < credits) return current;

      const pools = {
        ...currentMarket.pools,
        [outcome]: currentMarket.pools[outcome] + credits,
      };
      const percentages = getMarketPercentages(pools);

      return {
        ...current,
        balance: current.balance - credits,
        markets: {
          ...current.markets,
          [marketSlug]: {
            ...currentMarket,
            pools,
            positions: {
              ...currentMarket.positions,
              [outcome]: {
                spent: currentMarket.positions[outcome].spent + credits,
                shares: currentMarket.positions[outcome].shares + shares,
              },
            },
            predictions: [record, ...currentMarket.predictions],
            trend: [
              ...currentMarket.trend,
              {
                id: `prediction-${record.id}`,
                label: now.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }),
                percentages,
                source: `Your ${outcomeDefinition.shortLabel} prediction`,
              },
            ].slice(-8),
          },
        },
      };
    });

    return { ok: true, record };
  }

  function addAnnotation(title: string, body: string) {
    const annotation: Annotation = {
      id: String(Date.now()),
      date: "Just now",
      tag: "Organizer note",
      title: title.trim(),
      body: body.trim(),
      reaction: "New annotation",
      tone: "custom",
    };

    setState((current) => ({
      ...current,
      annotations: [annotation, ...current.annotations],
    }));
  }

  function resetDemo() {
    setState(createInitialState());
  }

  const value = { state, ready, placePrediction, addAnnotation, resetDemo };

  return (
    <MarketStoreContext.Provider value={value}>
      {children}
    </MarketStoreContext.Provider>
  );
}

export function useMarketStore() {
  const value = useContext(MarketStoreContext);
  if (!value) {
    throw new Error("useMarketStore must be used within MarketProvider");
  }
  return value;
}
