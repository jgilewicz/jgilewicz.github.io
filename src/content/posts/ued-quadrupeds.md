---
title: Is It the Curriculum or Just the Easy Start? Benchmarking UED on Quadrupeds
date: 2026-10-30
slug: ued-quadrupeds
excerpt: Fourteen curricula, five quadrupeds, 350 runs and one PPO student. Does fancy environment design beat "just start on easy terrain"? Notes on our arXiv preprint.
project: Solvro/ml-wojtek-ued
venue: arXiv preprint · 2026
---

If you've ever trained a legged robot in simulation, you know the terrain
matters as much as the algorithm. Throw a fresh policy onto stairs and gaps
and it just falls over for a few hundred million steps. Keep it on flat
ground and it learns to walk beautifully - on flat ground. So everyone uses
some kind of **curriculum**: start easy, make it harder as the robot gets
better.

There's a whole research field about doing that automatically -
**unsupervised environment design (UED)**. A "teacher" proposes environments
(called *levels*) so that a "student" policy ends up generalising as well as
possible. PLR, ACCEL, SFL, PAIRED - all of them have nice papers with nice
results. The catch: those results are almost all on **2D mazes, grid worlds,
car racing and BipedalWalker**. Meanwhile, the legged-robot crowd uses
hand-designed terrain curricula, each one tested against a couple of
baselines on its own robot with its own protocol.

So nobody had actually put the UED family side by side on 3D legged
locomotion. That's what this project does, and the title is the question
that kept bugging us along the way: **when a curriculum works, is it the
clever level selection, or just the fact that it starts on easy terrain?**

This post is a write-up of *Is It the Curriculum or Just the Easy Start?
Benchmarking Unsupervised Environment Design on Quadrupeds*, with Dominik
Galus and Piotr Wojdas (Wrocław University of Science and Technology,
Machinekind and the Solvro science club). The preprint is on
[arXiv](https://arxiv.org/abs/2610.40364) and the code is on
[GitHub](https://github.com/Solvro/ml-wojtek-ued) under MIT.

## The benchmark

![The benchmark: curriculum → level → PPO student, on five quadrupeds](/images/posts/ued-quadrupeds/overview.webp)

The setup is deliberately boring: **one student, many teachers**. Every
curriculum drives the exact same PPO student with the same hyperparameters
and the same number of environment steps. A method interacts with the
benchmark *only* through the levels it proposes - so adding a new
curriculum doesn't touch the level space or the evaluation.

### Five robots

![One level rendered for each of the five robots](/images/posts/ued-quadrupeds/robots.webp)

- **W01-TEK** - a quadruped built at Wrocław University of Science and
  Technology (model by Machinekind). The fun one: every leg is a
  **closed kinematic chain** with a passive four-bar linkage, which brings
  constraint dynamics that normal serial legs don't have.
- **Unitree Go1** and **Go2**, **Google Barkour vB** and **Boston Dynamics
  Spot** - open-chain robots from MuJoCo Playground and Menagerie, each
  keeping its own reward and default model.

Everything runs in **MuJoCo MJX** on the GPU: 300M environment steps per run
on W01-TEK and 1B on the others, **five seeds × fourteen methods × five
robots = 350 runs**. The actor is blind; the critic additionally gets a 5×5
terrain height scan, so value-based level scores can actually tell terrains
apart.

### Levels you can read

A level is a vector **θ ∈ [0, 1]⁸** of eight interpretable terrain
parameters (plus a noise seed): slope, stair height and width, noise
amplitude and wavelength, gap width, block height and size. Every feature
starts at the edge of a flat spawn disc, and one **difficulty knob d**
shrinks any level towards flat ground - d = 0 is flat, d = 1 is the full
level.

![W01-TEK on example levels: each feature at the end of its range, plus uniform samples](/images/posts/ued-quadrupeds/terrains.webp)

A small engineering trick that made the whole thing feasible: all 256
levels of an iteration are written as tiles into **one shared heightfield**.
The heightfield is just an array in the MJX model, so swapping in 256 new
levels needs no recompilation, and each lane of 32 environments trains on
its own tile.

## The contestants

Fourteen curricula, grouped by family:

| Family | Methods | Where new levels come from |
|---|---|---|
| Randomisation | DR, **DR-easy**, **DR-mixed** | uniform / shrunk to d = 0.1 / random d per level |
| Terrain curriculum | Terrain-CL (Rudin et al.) | per-lane difficulty rows, promoted on success |
| Replay | PLR⊥, SFL | uniform, buffer scored by value loss / learnability |
| Replay + edits | ACCEL, ACCEL-grow, ACCEL-SFL, ACCEL-LP | easy levels, mutated in the buffer |
| Learned generator | PAIRED, PAIRED+UniBC, PAIRED+BiBC, PAIRED+Evo | an adversarial teacher, scored by regret |

**DR-easy** and **DR-mixed** are the controls that give the paper its title.
They do no curation at all - DR-easy just samples uniform levels shrunk to
d = 0.1 (the same easy generator ACCEL starts from), and DR-mixed draws a
random difficulty per level. If a fancy method only beats plain DR because
it trains on easier levels, these two should catch it.

**Terrain-CL** is the game-inspired curriculum from *Learning to walk in
minutes* (Rudin et al., 2021) - the de facto standard in legged-robot
pipelines. Each lane keeps one level and a difficulty row; it moves up when
at least half the robots succeed and down when they don't walk far enough.

## How it's evaluated

Success means **no fall and at least s metres of travel** in the episode,
where s scales with the robot's size. Each final policy is evaluated on:

- **random levels** at d = 0.25 and 0.5 (2048 each) - the in-distribution test
- a **held-out suite** of seven structured terrain families no method trains
  on - stairs, slopes (both up and down), trenches, waves, random blocks
- **flat ground**, to check nobody traded basic walking for terrain skills
- **capability envelopes** - one feature ramped up until success drops
  below 50%

The headline set is d = 0.25, because on full-difficulty levels the
open-chain robots rarely succeed at all (the best method gets 19% on Go1 and
≤ 5% on Go2, Barkour and Spot).

The statistics part I'm a bit proud of: methods are compared **within each
robot**, never pooled, because the same levels are wildly different in
difficulty for different robots - plain DR solves 84.5% of d = 0.25 levels
on W01-TEK and 14.9-34.9% on the others. For each robot and level set we report
a **top group**: the best method plus every method not significantly below
it (Welch t-test over 5 seeds). Ranking "the winner" with five seeds and
overlapping intervals would be lying with a straight face.

## Results

![Success on random levels during training, per robot](/images/posts/ued-quadrupeds/learning-curves.webp)

### There is no universal winner

No method is in the top group on every robot and level set. Here's success
(%) on random d = 0.25 levels and on the held-out suite for a few
representative methods (full table in the paper):

| Method | W01-TEK | | Go1 | | Barkour vB | |
|---|---|---|---|---|---|---|
| | d=0.25 | held-out | d=0.25 | held-out | d=0.25 | held-out |
| DR | 84.5 | 52.5 | 34.9 | 30.2 | 20.9 | 22.3 |
| DR-easy | 90.2 | 55.4 | 61.6 | 38.6 | 59.5 | 28.3 |
| DR-mixed | 89.9 | 58.5 | 61.2 | 42.5 | 36.4 | 34.2 |
| Terrain-CL | 87.7 | 58.9 | 62.3 | **45.8** | **60.1** | 42.8 |
| PLR⊥ | 86.9 | 55.1 | 45.9 | 38.3 | 33.5 | 37.0 |
| SFL | 86.3 | 55.9 | 45.1 | 40.5 | 31.1 | **45.2** |
| ACCEL | 90.5 | 57.5 | 53.7 | 45.1 | 54.7 | 38.3 |
| ACCEL-grow | **91.2** | **59.0** | 49.4 | 42.2 | 51.1 | 41.6 |
| ACCEL-LP | 89.9 | 55.3 | **64.0** | 40.4 | 59.0 | 30.1 |
| PAIRED | 81.7 | 50.4 | 28.9 | 37.3 | 23.0 | 27.1 |

Bold is the best mean per column - not the full top group, which usually
has several members.

### It's (mostly) the easy start

On in-distribution random levels of Go1 and Barkour, **every** member of the
top group trains on easy or low-difficulty levels - and that includes
**DR-easy**, which does zero curation. On W01-TEK the same holds for every
top-group member except PAIRED+BiBC. Meanwhile, the methods that train on
the full uniform range (DR, PLR⊥, SFL) are outside the top group on all
three robots.

So the answer to the title is, at least for in-distribution levels: **a lot
of it is the easy start.** DR-easy is basically a one-line change to plain
DR, costs nothing extra, and lands in the d = 0.25 top group on Go1, Go2 and
Barkour. Not exactly what you'd guess from the 2D UED literature - where DR
is usually reported as a strong baseline, here DR on uniform levels is in
**no** top group at all.

### Held-out terrain is a different race

On three robots (Go1, Go2, Barkour), **the leader on random levels is not the
leader on held-out terrain.** My favourite example: on Barkour, ACCEL-LP and
Terrain-CL are tied on random levels (59.0 vs 60.1%) but differ by **12.7
points** on the held-out suite (30.1 vs 42.8%). And DR-easy, the hero of the
previous section, is in **no** held-out top group anywhere.

That's the practical message of the paper: if you only evaluate a new
curriculum on levels from its own training distribution, you can easily pick
the wrong one.

### The scoreboard

Counting top-group memberships across 5 robots × 4 level sets:

- **Terrain-CL - 13 of 20.** The success-driven curriculum from legged-robot
  practice is the most consistent: all four groups on Go1 and Barkour, none
  on Spot. No buffer, no score, no robot-specific tuning.
- **ACCEL - 11 of 20**, and the leader on Go2's held-out suite.
- **DR on uniform levels - 0.**
- **PAIRED - 0 outside Spot**, below PLR⊥ on the other four robots, at about
  twice the wall clock (its antagonist doubles the simulated steps). The
  behaviour-cloning fixes don't rescue it: UniBC changes success by at most
  1.3 points, and BiBC collapses on Go2 (0.2% success) while leading every
  set on Spot.

![Aggregate normalised scores over five robots × five seeds](/images/posts/ued-quadrupeds/aggregates.webp)

Pooled over robots (min-max normalised per robot, IQM with stratified
bootstrap intervals) the picture is similar, with overlapping intervals at
the top: ACCEL-LP (0.94), DR-easy and Terrain-CL (both 0.92) lead on random
levels, and Terrain-CL (0.89), ACCEL (0.87) and PAIRED+Evo (0.86) lead on
held-out terrain. The interesting part is who drops off: DR-easy falls to
0.57 and ACCEL-LP to 0.61 on held-out terrain.

### Spot is weird

Spot deserves its own line. All fourteen methods lie within **3.8 points** on
d = 0.25 (14.1-17.9%), its method ranking is unrelated to or inverted
against the other four robots (Spearman ρ from -0.61 to -0.28), and no
method gets it over a single gap. It's the one robot where
the PAIRED family looks good - which says more about Spot in this setup
than about PAIRED.

## So which curriculum should I use?

For **one PPO student at this budget** - the paper is careful about that
scope, and so am I:

- **No time to compare?** Terrain-CL. It's in a top group most often and
  needs nothing robot-specific. ACCEL is a solid second.
- **Only care about in-distribution terrain?** Start easy. DR-easy or
  DR-mixed get you most of the way for free.
- **Care about terrain you haven't trained on?** It depends on the robot -
  Terrain-CL or ACCEL on Go1, ACCEL on Go2, SFL or Terrain-CL on Barkour.
- **Writing a curriculum paper?** Report held-out terrain too, and compare
  against an easy-start DR control. Otherwise you might be measuring the
  easy start.

## Caveats

- **One student, one budget per robot.** On Go1 and Barkour the curves are
  still rising at 1B steps, so those rankings hold at this budget, not at
  convergence.
- **Some methods are adaptations.** Terrain-CL uses uniform levels from our
  level space instead of legged_gym's terrain types, ACCEL-LP adapts
  learning progress to a replay buffer, and our SFL keeps PLR's buffer
  instead of SFL's periodically rebuilt one.
- **Top groups are not equality.** Being in the top group means "not shown
  to be worse" with five seeds, not "as good as the best".
- **Simulation only.** No hardware results here.

## Project stack

- **MuJoCo MJX** (JAX and Warp backends) with **MuJoCo Playground** and
  **Menagerie** robot models
- **brax PPO** networks and loss, driven from a custom training loop so
  levels can change every iteration
- **rliable**-style aggregates: IQM, stratified bootstrap, probability of
  improvement
- one **H100** per run at WCSS: 0.5-1.7 GPU-hours each, 306 for all 350

## Wrapping up

I went into this expecting the fancy adaptive methods to clearly beat the
simple ones. What came out is more nuanced and, honestly, more useful: the
easy start explains a lot of the in-distribution gains, the boring
legged-robot curriculum is the most reliable choice, and held-out
evaluation changes the leaderboard. If you have a new curriculum, it plugs
into the benchmark by changing only how levels are proposed - the
[code](https://github.com/Solvro/ml-wojtek-ued) is open.

Huge thanks to Dominik and Piotr, to Machinekind for the W01-TEK model, and
to WCSS for the compute.
