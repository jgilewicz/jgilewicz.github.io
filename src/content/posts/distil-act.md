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

## Measurement

```bash
just measure reach
just measure pick
```

Runs `scripts/eval/distillation_measure.py --task <task>`: evaluates the
fp32 teacher and student over `eval.tasks.<task>.measure.n_episodes`
randomly-seeded episodes, and writes
`eval.tasks.<task>.measure.output_path`
(`artifacts/distillation_metrics_<task>.json`) with, per model:

- `success_rate` — fraction of episodes that reached the task's
  termination condition (EE-to-target distance for reach, box lifted
  above a height threshold for pick)
- `mean_convergence_time_s` — average sim time for successful episodes
- `mean_inference_time_ms` — average forward-pass latency
- `model_size_mb` — checkpoint size on disk
- `vram_mb` — peak VRAM on CUDA (`torch.cuda.max_memory_allocated`,
  reset per variant)
- `ram_delta_mb` — growth in process RSS high-water mark (`ru_maxrss`)
  attributable to this variant's episodes; not an isolated peak, since
  all variants share one process
- `joint_mean` / `joint_std` / `ee_pos_mean` / `ee_pos_std` — trajectory
  statistics across all episodes

Four additional ONNX Runtime variants (`student_ptq`, `student_dyn`,
`student_fp16_onnx`, `student_int8_qdq`) and three TensorRT variants
(`student_trt_fp32`, `student_trt_fp16`, `student_trt_int8`) are also
measured, from that task's `export_onnx.py --task <task>` /
`ptq.py --task <task>` outputs (`config/quant.yaml`'s
`ptq.tasks.<task>`).

## Reach task results

**Stale — predates fixes to `distillation_measure.py`'s CUDA timing
sync, TensorRT engine reuse, and RSS accounting; re-run
`just measure reach` to regenerate.**

Numbers below are for the **reach** task. Evaluated over 20
randomly-seeded episodes on an x86 machine. The fp32 teacher and
student run on **CUDA** (torch); `student_ptq`/`student_dyn`/
`student_fp16_onnx` run on **CPU** via ONNX Runtime;
`student_trt_fp32`/`student_trt_fp16` run on **CUDA** via TensorRT — so
latency is only directly comparable within each group.

| Metric | Teacher (fp32, GPU) | Student (fp32, GPU) | Student fp16 (ONNX, CPU) | Student PTQ static (int8, CPU) | Student PTQ dynamic (int8, CPU) | Student TRT (fp32, GPU) | Student TRT (fp16, GPU) |
|---|---|---|---|---|---|---|---|
| Success rate | 95% | 80% | 85% | 55% | 30% | 80% | 85% |
| Mean convergence time † | 0.77 s | 0.95 s | 0.95 s | 0.77 s | 0.64 s | 0.94 s | 0.93 s |
| Inference latency | 23.3 ms | 11.7 ms | 61.3 ms | 92.8 ms | 394.9 ms | 192.5 ms | 170.6 ms |
| Model size | 107.6 MB | 26.3 MB | 10.9 MB | 6.7 MB | 6.4 MB | 23.9 MB | 12.6 MB |
| Peak VRAM | 307.0 MB | 125.8 MB | — | — | — | — | — |
| Peak RAM | 2193.2 MB | 2241.5 MB | 2562.4 MB | 2482.0 MB | 2560.2 MB | 3948.7 MB | 5251.3 MB |

† Averaged only over *successful* episodes, so columns with fewer
successes (e.g. the 30% `student_dyn` row) are noisier and less
comparable.

**Distillation is a solid compression win, at some accuracy cost.** The
student is **4.1× smaller** and **~2× faster** than the teacher on GPU,
using ~2.4× less VRAM, but success rate drops from 95% to 80% — the
CVAE-distilled policy generalizes slightly worse than the teacher it
was trained from.

**int8 PTQ still trades accuracy for size, but per-channel calibration
narrows the gap.** Static QDQ int8 (`student_ptq`) now reaches 55%
success (up from a per-tensor baseline that collapsed to ~10%) at 6.7
MB — **16× smaller than the teacher, 3.9× smaller than the fp32
student** — while dynamic weight-only quantization (`student_dyn`) is
both less accurate (30%) and far slower (394.9 ms), since its
unoptimised CPU kernels do more work per call than the statically
calibrated QDQ graph. Both remain well below the fp32 student's 80%
success rate.

**fp16 is the best accuracy/size trade-off of the quantized
variants.** The plain fp16 ONNX graph (`student_fp16_onnx`, CPU)
matches or beats the fp32 student's success rate (85% vs 80%) at less
than half the size (10.9 MB), though at ~5× the latency of the GPU
fp32 student since it runs on CPU.

**TensorRT is not a latency win here.** Both TRT engines match or beat
the fp32 student on success rate (80% / 85%) and shrink further on
disk, but their measured inference latency (170–193 ms) is far higher
than either the torch fp32 student (11.7 ms) or the CPU ONNX Runtime
variants — most likely dominated by per-call H2D/D2H copy overhead in
the raw `cuda-python` inference path (`src/utils/tensorrt.py`) rather
than the engine's actual compute time, since this model's per-step
batch is tiny. TRT fp16 (12.6 MB) does halve the engine size and cut
latency versus TRT fp32 (23.9 MB), consistent with fp16 compute/memory
savings once that fixed overhead is factored in.

Bottom line: distillation remains the headline compression step; among
the post-training quantization options, **fp16 ONNX gives the best
size/accuracy balance without a GPU**, per-channel int8 PTQ is usable
but lossy, dynamic int8 is not recommended, and the current TensorRT
integration needs its inference path optimized (batched calls,
persistent buffers) before its latency numbers are meaningful.

## Wrapping up

So, back to the question this project started with: does the
shrunk-down model hold up, or does it just make the robot crap? For
reach, at least, the answer is "it holds up, mostly" - the distilled
student keeps 80% of the teacher's 95% success rate at a quarter of
the size and roughly double the speed, and fp16 ONNX gets you most of
that accuracy back with no GPU at all. Static int8 is the one place it
genuinely gives something up.
