import type { ReactNode } from "react";
import { Link } from "react-router";
import { GITHUB_URL } from "../data/profile";
import { projects } from "../data/projects";
import { publications } from "../data/publications";
import portrait from "../assets/portrait.jpg";

const FOCUS_AREAS = [
  {
    title: "Uncertainty-aware RL",
    detail: "When not to trust a learned policy — measured at runtime.",
  },
  {
    title: "Evolutionary & surrogate-assisted RL",
    detail: "Spending expensive rollouts only where they matter.",
  },
  {
    title: "Curricula for legged locomotion",
    detail: "Benchmarking unsupervised environment design on quadrupeds.",
  },
  {
    title: "Representation learning in RL",
    detail: "JEPA-style objectives and what latent spaces actually encode.",
  },
  {
    title: "Imitation learning on the edge",
    detail: "ACT-style policies under TensorRT and ONNX Runtime budgets.",
  },
  {
    title: "Sim-to-real",
    detail: "Isaac Lab and MuJoCo to hardware without surprises.",
  },
];

const CARD =
  "rounded-2xl border border-white/5 bg-neutral-900/40 transition-colors hover:border-emerald-400/30 hover:bg-neutral-900/70";

function isExternal(href: string) {
  return href.startsWith("http");
}

// first card spans the row; the last one too when it would sit alone
function isWide(index: number, count: number) {
  return index === 0 || (index === count - 1 && count % 2 === 0);
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <h2 className="mb-6 flex items-baseline gap-3 font-mono text-sm text-neutral-500">
      <span className="text-emerald-400">{index}</span>
      <span className="uppercase tracking-widest">{title}</span>
    </h2>
  );
}

function SmartLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

function Hero() {
  return (
    <section className="animate-fade-up pt-20 pb-16 sm:pt-28">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
        <img
          src={portrait}
          alt="Portrait of Jakub Gilewicz"
          className="h-24 w-24 flex-none rounded-2xl object-cover ring-1 ring-white/10 sm:h-28 sm:w-28"
        />
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 font-mono text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Junior Physical AI Engineer @ xBerry
          </p>
          <h1 className="mt-4 bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
            Jakub Gilewicz
          </h1>
          <p className="mt-2 text-lg text-neutral-400">
            Robotics &amp; Physical AI Engineer
          </p>
        </div>
      </div>
      <p className="mt-10 max-w-2xl text-lg leading-relaxed text-neutral-400">
        I build reinforcement learning and robot learning systems — from
        uncertainty-aware training in simulation to real-time deployment on
        edge hardware. MSc student in Trustworthy AI Systems at Wrocław
        University of Science and Technology, with a background in automation
        and control engineering.
      </p>
      <blockquote className="mt-8 max-w-2xl border-l-2 border-emerald-400 pl-4 text-xl font-medium text-neutral-100">
        When should a learned policy not be trusted, and can that be measured
        at runtime?
      </blockquote>
      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link
          to="/blog"
          className="rounded-full bg-emerald-400 px-5 py-2 font-medium text-neutral-950 transition-colors hover:bg-emerald-300"
        >
          Read the blog
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/10 px-5 py-2 text-neutral-200 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}

function Focus() {
  return (
    <section className="py-12">
      <SectionHeading index="02" title="Focus" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FOCUS_AREAS.map((area) => (
          <li key={area.title} className={`${CARD} p-5`}>
            <h3 className="font-medium text-neutral-100">{area.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              {area.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Publications() {
  return (
    <section className="py-12">
      <SectionHeading index="01" title="Publications" />
      <ul className="space-y-3">
        {publications.map((publication) => (
          <li key={publication.title}>
            <SmartLink
              href={publication.href}
              className={`${CARD} group block p-5`}
            >
              <p className="font-mono text-xs text-emerald-400">
                {publication.venue}
              </p>
              <h3 className="mt-2 font-medium leading-snug text-neutral-100 transition-colors group-hover:text-emerald-300">
                {publication.title}
              </h3>
              <p className="mt-2 text-sm text-neutral-400">
                {publication.summary}
              </p>
            </SmartLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Projects() {
  return (
    <section className="py-12">
      <SectionHeading index="03" title="Projects" />
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((project, i) => (
          <article
            key={project.name}
            className={`${CARD} flex flex-col p-5 ${isWide(i, projects.length) ? "sm:col-span-2" : ""}`}
          >
            <h3 className="font-mono text-sm text-neutral-100">
              {project.name}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
              {project.description}
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-neutral-400"
                >
                  {tag}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-4 font-mono text-xs">
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-400 transition-colors hover:text-emerald-400"
              >
                Code ↗
              </a>
              {project.postSlug && (
                <Link
                  to={`/blog/${project.postSlug}`}
                  className="text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Read post →
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <>
      <Hero />
      <Publications />
      <Focus />
      <Projects />
    </>
  );
}

export default HomePage;
