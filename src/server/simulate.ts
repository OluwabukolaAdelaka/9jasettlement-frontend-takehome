//Simulates network conditions for the mock API.

export const MIN_LATENCY_MS = 200;
export const MAX_LATENCY_MS = 1_500;
export const RATES_FAILURE_RATE = 0.1;

//Adds a random 200–1,500 ms delay.
export function simulateLatency(random: () => number = Math.random): Promise<void> {
  const ms = MIN_LATENCY_MS + Math.floor(random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//Fails about 10% of rate requests.
export function shouldFailTransiently(random: () => number = Math.random): boolean {
  return random() < RATES_FAILURE_RATE;
}
