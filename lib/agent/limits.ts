// Demo limits. The env knobs let the limit path be exercised without 20 runs.
export const DAILY_LIMIT = Number(process.env.DEMO_DAILY_LIMIT ?? 20);
export const MONTHLY_CAP_USD = Number(process.env.DEMO_MONTHLY_CAP_USD ?? 10);

export const dailyMessage = (n = DAILY_LIMIT) => `Demo limit reached: ${n} requests a day. It resets at 00:00 KST.`;
export const monthlyMessage = (usd = MONTHLY_CAP_USD) =>
  `Demo limit reached: the demo's shared budget of $${usd} a month is used up. It resets on the 1st at 00:00 KST.`;
