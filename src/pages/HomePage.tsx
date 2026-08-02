import { projects } from "../data/projects";
import portrait from "../assets/portrait.jpg";

const FOCUS_AREAS = [
  "Uncertainty-aware reinforcement learning",
  "Explainable RL / IL / BC policies",
  "Sim-to-real transfer",
  "Edge deployment (TensorRT, ONNX Runtime)",
];

function HomePage() {
  return (
    <>
      <section className="flex flex-col items-start gap-6 py-20 sm:flex-row sm:items-center sm:gap-8">
        <img
          src={portrait}
          alt="Portrait of Jakub Gilewicz"
          className="h-28 w-28 flex-none rounded-full object-cover ring-2 ring-neutral-800 sm:h-32 sm:w-32"
        />
        <div>
          <h1 className="text-3xl font-semibold text-neutral-50 sm:text-4xl">
            Jakub Gilewicz
          </h1>
          <p className="mt-2 text-lg text-emerald-400">
            Robotics &amp; Physical AI Engineer
          </p>
          <p className="mt-6 max-w-xl leading-relaxed text-neutral-400">
            I build reinforcement learning and robot learning systems — from
            uncertainty-aware training in simulation to real-time deployment
            on edge hardware. Background in control systems and embedded
            engineering. Currently pursuing an MSc in Trustworthy AI Systems,
            working at the intersection of sim-to-real transfer and
            explainable robot policies.
          </p>
        </div>
      </section>

      <section className="border-t border-neutral-800 py-12">
        <h2 className="mb-4 font-mono text-sm text-neutral-500">Focus</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FOCUS_AREAS.map((area) => (
            <li key={area} className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
              <span className="text-neutral-300">{area}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-neutral-800 py-12">
        <h2 className="mb-6 font-mono text-sm text-neutral-500">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-neutral-800 p-5 transition-colors hover:border-emerald-400/50"
            >
              <h3 className="font-mono text-sm text-neutral-100 group-hover:text-emerald-400">
                {project.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                {project.description}
              </p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

export default HomePage;
