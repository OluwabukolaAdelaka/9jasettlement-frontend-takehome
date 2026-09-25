import Big from "big.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { controllableClock, installFetch, resetServer } from "@/test/apiHarness";
import type { ServerState } from "@/server/state";
import { ConvertCard } from "./ConvertCard";

//No random latency, 503s, or rate drift: tests must be deterministic.
vi.mock("@/server/simulate", () => ({
  simulateLatency: () => Promise.resolve(),
  shouldFailTransiently: () => false,
}));
vi.mock("@/server/rates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/rates")>()),
  driftRates: <T,>(rates: T) => rates,
}));

let server: ServerState;
beforeEach(() => {
  server = resetServer();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ConvertCard />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

//$100 USD → NGN at a 1500 mid-market rate with 0.5% spread: 1492.5 rate, ₦149,250 received, $0.50 fee.
async function getQuoteFor100Usd() {
  const user = renderCard();
  await user.type(screen.getByLabelText("You send (USD)"), "100");
  expect(await screen.findByText("You'd receive about")).toBeInTheDocument();
  expect(screen.getByText("Estimate")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Get quote" }));
  await screen.findByRole("heading", { name: "Locked quote" });
  return user;
}

const statusText = () =>
  screen
    .getAllByRole("status")
    .map((element) => element.textContent)
    .join(" ");

//The countdown re-reads the clock on a tick or when the tab becomes visible.
function returnToTab() {
  act(() => {
    fireEvent(document, new Event("visibilitychange"));
  });
}

describe("ConvertCard", () => {
  it("converts with a locked quote, and the receipt matches the quote exactly", async () => {
    installFetch();
    const user = await getQuoteFor100Usd();

    const quote = within(screen.getByRole("region", { name: "Locked quote" }));
    expect(quote.getByText("₦149,250.00")).toBeInTheDocument();
    expect(quote.getByText("$0.50")).toBeInTheDocument();
    expect(quote.getByText("$100.50")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm conversion" }));

    expect(await screen.findByRole("heading", { name: "Conversion complete" })).toHaveFocus();
    const receipt = within(screen.getByRole("region", { name: "Conversion complete" }));
    expect(receipt.getByText("₦149,250.00")).toBeInTheDocument();
    expect(receipt.getByText("$100.00")).toBeInTheDocument();
    expect(receipt.getByText("$0.50")).toBeInTheDocument();
    expect(receipt.getByText("$100.50")).toBeInTheDocument();
    expect(receipt.getByText("1 USD = 1,492.50 NGN")).toBeInTheDocument();
    expect(receipt.getByText(server.conversions[0].id)).toBeInTheDocument();

    expect(server.balances.USD).toBe(250075n - 10050n);
    expect(server.balances.NGN).toBe(125000050n + 14925000n);
  });

  it("can be completed with the keyboard alone, and focus follows the flow", async () => {
    installFetch();
    const user = renderCard();

    await user.click(screen.getByLabelText("You send (USD)"));
    await user.keyboard("100");
    await screen.findByText("You'd receive about");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { name: "Locked quote" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Confirm conversion" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { name: "Conversion complete" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Make another conversion" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("You send (USD)")).toHaveFocus();
    expect(server.conversions).toHaveLength(1);
  });

  it("cannot be confirmed twice by double-clicking or pressing Enter repeatedly", async () => {
    const { conversionPosts } = installFetch({ conversionDelayMs: 100 });
    const user = await getQuoteFor100Usd();

    const confirm = screen.getByRole("button", { name: "Confirm conversion" });
    await user.dblClick(confirm);
    confirm.focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    await screen.findByRole("heading", { name: "Conversion complete" });

    expect(conversionPosts).toHaveLength(1);
    expect(server.conversions).toHaveLength(1);
    expect(server.balances.USD).toBe(250075n - 10050n);
  });

  it("keeps the countdown accurate after the tab is backgrounded, then blocks confirm on expiry", async () => {
    installFetch();
    const clock = controllableClock();
    await getQuoteFor100Usd();
    expect(screen.getByText(/^(30|29)s left$/)).toBeInTheDocument();

    //22 s pass with no timers firing (tab in the background), then the user comes back.
    clock.jump(22_000);
    returnToTab();
    expect(screen.getByText(/^[78]s left$/)).toBeInTheDocument();
    expect(statusText()).toContain("Less than 10 seconds left on your quote.");

    clock.jump(10_000);
    returnToTab();
    expect(screen.getByRole("heading", { name: "Quote expired" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm conversion" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh quote/ })).toBeInTheDocument();
    expect(statusText()).toContain("Your quote has expired.");
  });

  it("highlights a worse rate after refreshing an expired quote", async () => {
    installFetch();
    const clock = controllableClock();
    const user = await getQuoteFor100Usd();

    clock.jump(31_000);
    returnToTab();
    server.usdRates.NGN = new Big(1400);
    await user.click(screen.getByRole("button", { name: /Refresh quote/ }));

    //1400 × 0.995 = 1393 → ₦139,300, which is ₦9,950 less than before.
    expect(await screen.findByText(/The new rate is worse for you/)).toBeInTheDocument();
    expect(screen.getByText(/You'll receive ₦9,950.00 less than your previous quote/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm conversion" })).toBeEnabled();
  });

  it("tells the user when the server rejects the quote as expired, and balances do not change", async () => {
    installFetch();
    server.debug.forceNextConversionExpired = true;
    const user = await getQuoteFor100Usd();
    const before = { ...server.balances };

    await user.click(screen.getByRole("button", { name: "Confirm conversion" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This quote expired before we could confirm it. Nothing was converted and your balances haven't changed.",
    );
    expect(server.balances).toEqual(before);
    expect(screen.queryByRole("button", { name: "Confirm conversion" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Get a fresh quote" }));
    await user.click(await screen.findByRole("button", { name: "Confirm conversion" }));
    await screen.findByRole("heading", { name: "Conversion complete" });
    expect(server.balances.USD).toBe(before.USD - 10050n);
  });

  it("invalidates the quote when the amount changes", async () => {
    installFetch();
    const user = await getQuoteFor100Usd();

    await user.type(screen.getByLabelText("You send (USD)"), "0");

    expect(screen.queryByRole("heading", { name: "Locked quote" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm conversion" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get quote" })).toBeEnabled();
  });

  it("does not allow converting a currency to itself", async () => {
    installFetch();
    const user = renderCard();
    await user.type(screen.getByLabelText("You send (USD)"), "100");
    await user.selectOptions(screen.getByLabelText("To"), "USD");

    expect(screen.getByText("Choose two different currencies.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get quote" })).toBeDisabled();
  });

  it("does not allow converting more than the balance, including the fee", async () => {
    installFetch();
    const user = renderCard();
    //$2,500 + $12.50 fee exceeds the $2,500.75 balance.
    await user.type(screen.getByLabelText("You send (USD)"), "2500");

    expect(await screen.findByText(/Not enough USD/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get quote" })).toBeDisabled();
  });
});
