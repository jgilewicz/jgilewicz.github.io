export interface Publication {
  title: string;
  venue: string;
  summary: string;
  href: string;
}

export const publications: Publication[] = [
  {
    title:
      "Uncertainty-Aware Surrogate-Assisted Evolutionary Reinforcement " +
      "Learning in Expensive Low-Data Regimes",
    venue: "ECML PKDD 2026 · LFSD Workshop",
    summary:
      "Epistemic uncertainty of the critic decides when surrogate fitness " +
      "can replace a real rollout.",
    href: "/blog/usc-erl",
  },
  {
    title:
      "Do Edges Save Energy? Classical Preprocessing for Efficient " +
      "ACT-Based Robot Learning",
    venue: "ISW 2026",
    summary:
      "Ablation of visual preprocessing for Action Chunking Transformers.",
    href: "https://github.com/jgilewicz/act_lerobot_preprocessing",
  },
  {
    title:
      "SAR Land Cover Classification: Do Heavyweight Deep Learning Models " +
      "Justify Their Cost Against Lightweight Architecture?",
    venue: "EUSAR 2026",
    summary: "Memory-efficient deep learning for synthetic aperture radar data.",
    href: "https://github.com/jgilewicz/sar_cnn_kan",
  },
];
