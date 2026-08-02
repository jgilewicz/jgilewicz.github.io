export interface Project {
  name: string;
  description: string;
  url: string;
}

export const projects: Project[] = [
  {
    name: "distil_act",
    description: "Distilled ACT model for EdgeAI devices.",
    url: "https://github.com/jgilewicz/distil_act",
  },
  {
    name: "usc_erl",
    description:
      "Uncertainty evaluation within a surrogate controller module.",
    url: "https://github.com/jgilewicz/usc_erl",
  },
  {
    name: "sar_cnn_kan",
    description: "KAN network project for classifying satellite images.",
    url: "https://github.com/jgilewicz/sar_cnn_kan",
  },
  {
    name: "torch_diffusion_augmentation",
    description:
      "PyTorch library for diffusion-based SANA dataset augmentation.",
    url: "https://github.com/jgilewicz/torch_diffusion_augmentation",
  },
];
