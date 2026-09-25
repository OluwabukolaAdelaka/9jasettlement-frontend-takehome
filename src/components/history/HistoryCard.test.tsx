import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConvertCard } from "@/components/convert/ConvertCard";
import { installFetch, resetServer, switchServerInstance } from "@/test/apiHarness";
import { HistoryCard } from "./HistoryCard";

vi.mock("@/server/simulate", () => ({
  simulateLatency: () => Promise.resolve(),
  shouldFailTransiently: () => false,
}));
vi.mock("@/server/rates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/rates")>()),
  driftRates: <T,>(rates: T) => rates,
}));

beforeEach(() => {
  window.localStorage.clear();
  resetServer();
  installFetch();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConvertCard />
      <HistoryCard />
    </QueryClientProvider>,
  );
}

it("shows a completed conversion, opens its receipt, survives refreshes and server switches, and resets with a new wallet", async () => {
  const user = userEvent.setup();
  const app = renderApp();
  expect(await screen.findByText("No conversions yet")).toBeInTheDocument();

  await user.type(screen.getByLabelText("You send (USD)"), "100");
  await screen.findByText("You'd receive about");
  await user.click(screen.getByRole("button", { name: "Get quote" }));
  await user.click(await screen.findByRole("button", { name: "Confirm conversion" }));
  await screen.findByRole("heading", { name: "Conversion complete" });

  const history = within(screen.getByRole("region", { name: "History" }));
  const row = await history.findByRole("button", { name: /USD → NGN/ });
  expect(row).toHaveTextContent("Sent $100.00");
  expect(row).toHaveTextContent("Received ₦149,250.00");
  expect(row).toHaveTextContent("Rate 1 USD = 1,492.50 NGN");
  expect(row).toHaveAttribute("aria-expanded", "false");

  await user.click(row);
  expect(row).toHaveAttribute("aria-expanded", "true");
  expect(history.getByText("Total debited")).toBeInTheDocument();
  expect(history.getByText("$100.50")).toBeInTheDocument();

  //Page refresh: the app remounts against the same server.
  app.unmount();
  const refreshed = renderApp();
  const restored = within(screen.getByRole("region", { name: "History" }));
  expect(await restored.findByRole("button", { name: /USD → NGN/ })).toHaveTextContent("Received ₦149,250.00");

  //Another server instance (or a restart): the wallet travels in the cookie, so nothing is lost.
  refreshed.unmount();
  switchServerInstance();
  const otherInstance = renderApp();
  const stillThere = within(screen.getByRole("region", { name: "History" }));
  expect(await stillThere.findByRole("button", { name: /USD → NGN/ })).toHaveTextContent("Received ₦149,250.00");

  //A brand-new wallet (cookie gone): starting balances, so history must not show conversions they don't reflect.
  otherInstance.unmount();
  resetServer();
  renderApp();
  expect(await screen.findByText("No conversions yet")).toBeInTheDocument();
});
