import Big from "big.js";
import { vi } from "vitest";
import { GET as getBalances } from "@/app/api/balances/route";
import { GET as getConversions, POST as postConversion } from "@/app/api/conversions/route";
import { POST as postQuote } from "@/app/api/quotes/route";
import { GET as getRates } from "@/app/api/rates/route";
import { createInitialState, getState, type ServerState } from "@/server/state";

type Handler = (request: Request) => Promise<Response> | Response;

const ROUTES: Record<string, Partial<Record<string, Handler>>> = {
  "/api/balances": { GET: () => getBalances() },
  "/api/rates": { GET: getRates },
  "/api/quotes": { POST: postQuote },
  "/api/conversions": { GET: () => getConversions(), POST: postConversion },
};

//Round rates so expected amounts are easy to check: 1 USD = ₦1500 = €0.8 = £0.75 = ¥150.
export function resetServer(): ServerState {
  const state = createInitialState();
  state.usdRates = { NGN: new Big(1500), USD: new Big(1), GBP: new Big("0.75"), EUR: new Big("0.8"), JPY: new Big(150) };
  (globalThis as { __swaprState?: ServerState }).__swaprState = state;
  return getState();
}

//Routes fetch() into the real Next.js handlers so tests exercise the UI and mock server together.
//`conversionDelayMs` keeps conversions open to test double submits.
export function installFetch({ conversionDelayMs = 0 } = {}) {
  const conversionPosts: unknown[] = [];

  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, "http://localhost");
    const method = init?.method ?? "GET";
    const handler = ROUTES[url.pathname]?.[method];
    if (!handler) throw new Error(`No mock route for ${method} ${url.pathname}`);

    if (url.pathname === "/api/conversions" && method === "POST") {
      conversionPosts.push(JSON.parse(String(init?.body)));
      if (conversionDelayMs) await new Promise((resolve) => setTimeout(resolve, conversionDelayMs));
    }
    return handler(new Request(url, init));
  });

  vi.stubGlobal("fetch", fetchMock);
  return { conversionPosts };
}

//Moves the clock forward without firing timers, like a backgrounded tab or sleeping laptop.
export function controllableClock() {
  const realNow = Date.now.bind(Date);
  let skewMs = 0;
  vi.spyOn(Date, "now").mockImplementation(() => realNow() + skewMs);
  return {
    jump(ms: number) {
      skewMs += ms;
    },
  };
}
