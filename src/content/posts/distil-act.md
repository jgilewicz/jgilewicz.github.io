---
title: Distilling ACT for Edge Deployment
date: 2026-02-08
slug: distill-act    
excerpt: Notes on distilling an ACT policy small enough to hit the control loop budget on an edge device.
project: distill_act
---

A while back I was working on visuomotor policies for controlling a robotic
arm on a handful of tasks. The problem with SOTA models is that they're
**HUGE** — if you don't have at least 12 GB of VRAM, or a powerful Jetson
like a Thor, you can't run one yourself. That got me thinking: if we shrink
the model down to something an edge device can actually run, does it stay as
good as the original, or does it just make the robot crap? If you've ever
wondered the same thing, I ran the experiment so you don't have to. In this
project I test a few different ways of shrinking the model, run a full
metrics pipeline against each one, and write up what actually holds up.

## What is Action Chunking with Transformers (ACT)

[ACT](https://arxiv.org/pdf/2304.13705) is an imitation-learning policy
introduced in *Learning Fine-Grained Bimanual Manipulation with Low-Cost
Hardware* (Zhao et al., 2023). Instead of predicting one action per
timestep, it predicts a short **chunk** of future actions at once — this cuts
down on compounding error and lets the policy handle high-frequency, precise
manipulation without stuttering. Under the hood it's a conditional VAE: a
transformer encoder compresses the current observation (joint state plus
multiple camera views) into a latent style variable, and a transformer
decoder autoregressively turns that latent into the action chunk. At
inference, overlapping chunks are temporally ensembled to keep the executed
trajectory smooth. It's accurate and it's the reference policy I distill
from here — but that accuracy comes from a model that's too heavy to fit an
edge control loop, which is exactly the problem this project is about.

## Project stack

Let's start with what the project includes in its guts:

- **Simulation** - because I don't have the Jetson + robotic arm setup
  (yet!), I'll go with simulation in **MuJoCo** and a well-documented 6 DoF
  (degrees of freedom) robot model like **AgileX PiPER**, coming from
  [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie)
- **Motion planning** - I've been lately testing the NVIDIA robotics stack,
  and during that I came across a library named
  [cuRobo](https://nvlabs.github.io/curobo/latest/) - it's a
  CUDA-accelerated library for robot motion generation, built on PyTorch,
  CUDA, and Warp. A really cool idea, to be honest (worth checking out!). It
  provides a really simple interface for moving an arm, inverse kinematics,
  and a lot of other robotics stuff. It's mainly used here to generate a
  dataset for the specific task that ACT should clone.
- **Dataset** - here I went classic: HDF5 format with
  [h5py](https://docs.h5py.org/en/stable/) to capture the necessary data
- **Deep Learning** - PyTorch, of course (no need to explain myself)
- **Quantization and Inference** - ONNX Runtime for quantization and
  export, and TensorRT for optimizing deep learning inference on NVIDIA
  GPUs and INT8 quantization (more on this below)

![AgileX PiPER 6-DoF arm model from MuJoCo Menagerie](/images/posts/piper.png)

## The tasks: reach and pick

Two tasks so far, both run through the same collect-then-train-then-distill
pipeline, just plugged into different environments.

**Reach** is the simpler one: move the PiPER's end effector to a target
position and stop. The expert solves this with cuRobo's inverse kinematics,
over the 6 arm joints only - the gripper isn't part of the task, so it just
stays put. Getting the solver to converge took a bit of care: leave the
target orientation unset and cuRobo defaults to identity, which isn't
PiPER's actual rest orientation, so it ends up fighting an unreachable pose
and never converges. Since reach only cares about position anyway, I zero
out the rotation weights so it solves for position only.

**Pick** is the harder one: the arm has to approach a free-floating box on
the table, close the gripper around it, and lift it clear - no placement,
just get it off the table. A single target pose isn't enough here, since
grasping needs a full trajectory, so the expert switches from IK to
cuRobo's motion planner instead. I split it into four phases that mirror
how the trajectory gets planned: approach the box, move into grasp
position, close the gripper and hold for a few steps so it actually
settles, then lift. The gripper itself is driven directly (open or closed)
rather than solved for, same as reach.

Every script in the pipeline - collection, training, distillation,
evaluation, measurement - takes a `--task reach|pick` flag, so both tasks
run through the exact same code end to end.

## Distillation time

If you aren't familiar with knowledge distillation or any model-shrinking
techniques, I highly recommend [this article](https://huggingface.co/blog/Kseniase/kd)
on HuggingFace. I used a technique called **response-based distillation**
(outputs as knowledge) - the classic approach where the teacher's final
output is the target the student trains against. It works really well for
pose estimation, which is exactly what we're doing here: the student isn't
just matching hard labels, it's matching the teacher's actual output
distribution over the action chunk.

Policies are split into two - teacher and student:

- **Teacher policy** - the classic ACT architecture, but with an
  EfficientNet-B3 backbone instead of the ResNet-18 the original paper used
  (ResNet-18 is showing its age by now), paired with the usual CVAE encoder
  and transformer encoder-decoder.
- **Student policy** - the same ACT architecture with the hidden dims cut in
  half and a MobileNetV3-Large backbone, since the backbone is where most of
  the parameter budget lives.

Training optimizes three losses together:

- **hard loss** - the action loss between predicted actions and the
  ground-truth actions in the dataset
- **soft loss** - the action loss between the student's predictions and the
  teacher's predictions
- **latent-space KL** - the Kullback-Leibler divergence between the
  teacher's and student's CVAE latent distributions, so the student learns
  to compress the same "style" information, not just imitate the output

The three get combined into a single weighted sum for backprop. Dialing in
that weighting - how much to trust the teacher versus the ground truth - is
its own small hyperparameter search, which I'll get into once results are
in.

## Process of distillation

The pipeline is straightforward:

1. Gather demonstrations via simulation and save the dataset
2. Train the teacher ACT as the baseline model
3. Train the student ACT as the distilled model

That's really it - the detailed process, including hyperparameters and the
exact simulation setup, is in the project
[README](https://github.com/jgilewicz/distill_act/blob/main/README.md).

## Quantization and serving

Training the distilled student was only half the story - I also wanted to
see what happens once that model actually has to run somewhere, fast. So
the last stretch of the project is about squeezing the student down even
further, and serving it properly instead of just running it in PyTorch.

**Quantization**, in plain terms, means storing the model's numbers with
fewer bits. PyTorch trains and runs in fp32 by default - 32 bits per
number. Drop that to fp16 (16 bits) or int8 (8 bits) and the model gets
smaller and faster, at the cost of a bit of precision. The trick is finding
out how much precision you can give up before the robot starts missing.

I export the student to ONNX first (a portable graph format), then push it
through a few different quantization paths:

- **fp16** - the ONNX graph gets converted to mixed precision, with the
  precision casts baked directly into the graph. That's a newer
  requirement: TensorRT 11 dropped the old builder flag that used to
  handle this for you at engine-build time, so now it has to live in the
  graph itself.
- **Static int8 (QDQ)** - both weights and activations get quantized to
  int8. To pick the right value ranges for the activations, this needs a
  calibration pass over a slice of real data (the validation set) before
  it can lock anything in.
- **Dynamic int8** - only the weights are quantized ahead of time;
  activations get quantized on the fly during inference. Simpler, no
  calibration data needed, but usually a smaller speedup than static.

**Serving with TensorRT** is a separate step from quantization. Once I have
an ONNX graph, TensorRT compiles it into an "engine" - a binary optimized
for the exact GPU it was built on (which also means it isn't portable to a
different GPU or driver version - it has to be rebuilt there). Running
inference through the engine skips PyTorch entirely: raw CUDA calls copy
the input to the GPU, run the engine, and copy the result back.

By the end there are seven variants to compare head-to-head - fp32
teacher, fp32 student, static int8, dynamic int8, fp16 ONNX, and TensorRT
engines in both fp32 and fp16 - each measured on success rate, inference
latency, model size, and memory use.

## What's left

At this point everything is actually built: both tasks collect their own
demos, train their own teacher, and distill their own student end to end,
and the quantization and TensorRT paths are wired up and producing engines.
What's left isn't more plumbing, it's turning the crank - running the full
measurement sweep across both tasks and all those model variants, and
seeing where the numbers actually land.

That's the part that answers the question this whole project started
with: does the shrunk-down model hold up, or does it just make the robot
crap? Stay tuned for the results.