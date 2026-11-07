import { Menu, PhoneCall, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

export const NAV = [
  { to: "/", label: "Overview" },
  { to: "/map", label: "India Map" },
  { to: "/states", label: "State Analysis" },
  { to: "/categories", label: "Categories" },
  { to: "/financial", label: "Financial Impact" },
  { to: "/trends", label: "Trends & Predictions" },
  { to: "/prevention", label: "Prevention" },
  { to: "/emergency", label: "Emergency Help" },
  { to: "/about", label: "About" },
  { to: "/sources", label: "Data Sources" },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  // Filter changes on the map update the query string and must not scroll the page.
  void search;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <header className="sticky top-0 z-[1100] border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <ShieldCheck size={24} className="shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">India Cybercrime Intelligence Portal</span>
              <span className="block truncate text-[11px] text-ink-2">Student research project · DataDefenders</span>
            </span>
          </Link>
          <a
            href="tel:1930"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-bad/50 bg-bad/10 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-bad/20"
            aria-label="Call the cyber fraud helpline 1930"
          >
            <PhoneCall size={13} aria-hidden /> <span className="hidden sm:inline">Lost money? Call</span> 1930
          </a>
          <button
            type="button"
            className="rounded-lg border border-line p-1.5 xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
        <nav aria-label="Main" className={`${open ? "block" : "hidden"} border-t border-line/50 xl:block`}>
          <ul className="mx-auto grid max-w-[1400px] grid-cols-2 gap-1 px-4 py-2 sm:px-6 xl:flex xl:flex-wrap xl:py-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `block rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${isActive ? "bg-accent/15 font-medium text-accent" : "text-ink-2 hover:bg-card hover:text-ink"}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line/70 bg-surface/60">
        <div className="mx-auto grid max-w-[1400px] gap-3 px-4 py-6 text-xs leading-relaxed text-ink-2 sm:px-6 md:grid-cols-2">
          <p>
            <strong className="text-ink">The Decade of Digital Threats.</strong> A college project by DataDefenders (Adone, Sanjay, Abhiraj).
            This is <strong className="text-ink">not a government website</strong>. To report a crime use{" "}
            <a className="text-accent hover:underline" href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer">cybercrime.gov.in</a> or call 1930.
          </p>
          <p className="md:text-right">
            Figures are from official publications, listed on <Link className="text-accent hover:underline" to="/sources">Data Sources</Link>.
            Map boundaries are community data and indicative only, not an authoritative depiction of India's borders.
          </p>
        </div>
      </footer>
    </div>
  );
}
