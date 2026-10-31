import { NavLink, Outlet } from "react-router";
import { EMAIL, GITHUB_URL, LINKEDIN_URL } from "../data/profile";
import { GithubIcon, LinkedinIcon, MailIcon } from "./icons";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-full px-3 py-1 transition-colors ${
    isActive
      ? "bg-neutral-800 text-neutral-50"
      : "text-neutral-400 hover:text-neutral-100"
  }`;
}

const SOCIAL_LINKS = [
  { href: GITHUB_URL, label: "GitHub", Icon: GithubIcon },
  { href: LINKEDIN_URL, label: "LinkedIn", Icon: LinkedinIcon },
  { href: `mailto:${EMAIL}`, label: "Email", Icon: MailIcon },
];

function Layout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 font-sans text-neutral-200 antialiased">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[36rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl"
      />

      <header className="sticky top-0 z-10 border-b border-white/5 bg-neutral-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <NavLink
            to="/"
            className="font-mono text-sm font-medium text-neutral-100"
          >
            jg<span className="text-emerald-400">.</span>
          </NavLink>
          <nav className="flex items-center gap-1 rounded-full border border-white/5 bg-neutral-900/60 p-1 text-sm">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/blog" className={navLinkClass}>
              Blog
            </NavLink>
          </nav>
          <nav className="flex gap-4 text-neutral-400">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                aria-label={label}
                className="transition-colors hover:text-emerald-400"
              >
                <Icon />
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-6">
        <Outlet />
      </main>

      <footer className="relative mt-16 border-t border-white/5">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Jakub Gilewicz</p>
          <p className="font-mono">
            <a href={`mailto:${EMAIL}`} className="hover:text-emerald-400">
              {EMAIL}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
