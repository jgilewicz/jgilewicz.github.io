import { NavLink, Outlet } from "react-router";
import { GithubIcon, LinkedinIcon, MailIcon } from "./icons";

const EMAIL = "jakubgilewicz@wp.pl";
const GITHUB_URL = "https://github.com/jgilewicz";
const LINKEDIN_URL = "https://www.linkedin.com/in/jakub-gilewicz-9a4342284/";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `transition-colors hover:text-emerald-400 ${
    isActive ? "text-emerald-400" : "text-neutral-400"
  }`;
}

function Layout() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <nav className="flex gap-5 font-mono text-sm">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/blog" className={navLinkClass}>
              Blog
            </NavLink>
          </nav>
          <nav className="flex gap-4 text-neutral-400">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="transition-colors hover:text-emerald-400"
            >
              <GithubIcon />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="transition-colors hover:text-emerald-400"
            >
              <LinkedinIcon />
            </a>
            <a
              href={`mailto:${EMAIL}`}
              aria-label="Email"
              className="transition-colors hover:text-emerald-400"
            >
              <MailIcon />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-800">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-neutral-500">
          <a href={`mailto:${EMAIL}`} className="hover:text-emerald-400">
            {EMAIL}
          </a>
          <span className="mx-2">·</span>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400"
          >
            LinkedIn
          </a>
          <p className="mt-4 text-neutral-600">
            © {new Date().getFullYear()} Jakub Gilewicz
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
