import { notFound } from "next/navigation";
import { MARKET_DEFINITIONS, getMarketDefinition } from "../../market-config";
import { MarketDetail } from "./MarketDetail";

export function generateStaticParams() {
  return MARKET_DEFINITIONS.map((market) => ({ slug: market.slug }));
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getMarketDefinition(slug)) notFound();
  return <MarketDetail key={slug} slug={slug} />;
}
