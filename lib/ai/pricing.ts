// USD per 1M tokens. Check the provider's price page when changing models.
// ponytail: static table; a price change means editing this file.
const PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

export function priceOf(model: string) {
  const p = PRICES[model];
  if (!p) throw new Error(`No price for model "${model}". Add it to lib/ai/pricing.ts.`);
  return p;
}

export function costUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = priceOf(model);
  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
}
