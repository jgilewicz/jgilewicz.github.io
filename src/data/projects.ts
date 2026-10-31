export interface Project {
  name: string;
  description: string;
  url: string;
  tags: string[];
  postSlug?: string;
}

export const projects: Project[] = [
  {
    name: "ml-wojtek-ued",
    description:
      "Benchmark of unsupervised environment design for legged locomotion: " +
      "PLR, ACCEL, SFL, PAIRED and terrain curricula on Go1, Go2, Barkour, " +
      "Spot and W01-TEK in MuJoCo MJX.",
    url: "https://github.com/Solvro/ml-wojtek-ued",
    tags: ["UED", "Legged locomotion", "MuJoCo MJX"],
    postSlug: "ued-quadrupeds",
  },
  {
    name: "usc_erl",
    description:
      "Uncertainty-gated surrogate fitness for evolutionary RL: ensembles, " +
      "MC dropout and evidential critics decide when a rollout is worth it. " +
      "JAX port in usc_erl_jax.",
    url: "https://github.com/jgilewicz/usc_erl",
    tags: ["Evolutionary RL", "Uncertainty", "MuJoCo"],
    postSlug: "usc-erl",
  },
  {
    name: "latent_rl",
    description:
      "PPO vs JEPA, VAE and SAE auxiliary losses on Crafter, plus a post-hoc " +
      "look inside the learned latent spaces: geometry, probes, ablations.",
    url: "https://github.com/jgilewicz/latent_rl",
    tags: ["Representation learning", "XAI", "Crafter"],
    postSlug: "latent-rl",
  },
  {
    name: "distill_act",
    description:
      "Distilling an Action Chunking Transformer small enough for an edge " +
      "device's control loop.",
    url: "https://github.com/jgilewicz/distill_act",
    tags: ["Imitation learning", "Edge AI", "LeRobot"],
    postSlug: "distill-act",
  },
  {
    name: "act_lerobot_preprocessing",
    description:
      "Classical image preprocessing as a cheap win for ACT policies — " +
      "accuracy vs energy.",
    url: "https://github.com/jgilewicz/act_lerobot_preprocessing",
    tags: ["Imitation learning", "Efficiency"],
  },
  {
    name: "sar_cnn_kan",
    description:
      "Lightweight CNN and KAN architectures for SAR land-cover " +
      "classification.",
    url: "https://github.com/jgilewicz/sar_cnn_kan",
    tags: ["Remote sensing", "KAN"],
  },
];
