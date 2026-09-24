import { SwapIcon } from "@/components/ui/icons";

const SECTIONS = [
  { href: "#wallet", label: "Wallet" },
  { href: "#convert", label: "Convert" },
  { href: "#rates", label: "Rates" },
  { href: "#history", label: "History" },
];

export function AppHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#main" className="flex items-center gap-2 rounded-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <SwapIcon width={18} height={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Swapr</span>
        </a>
        <nav aria-label="Sections">
          <ul className="flex gap-1 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <a
                  href={section.href}
                  className="rounded-md px-2 py-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
