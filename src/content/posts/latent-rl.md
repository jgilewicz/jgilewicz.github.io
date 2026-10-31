---
title: What Does an Auxiliary Loss Buy a PPO Agent? Opening Up Latent Spaces in Crafter
date: 2026-10-31
slug: latent-rl
excerpt: Four PPO agents, four ways of training the encoder, one 2D Minecraft. Which one plays best - and what is actually going on inside their latent spaces?
project: latent_rl
---

Plain PPO learns its visual encoder from **reward alone**. That's a pretty
thin signal - most frames give you zero reward, and the encoder has to
figure out what a tree, a zombie or an empty water bar look like purely from
the occasional +1. The standard fix is to bolt an extra self-supervised loss
onto the encoder so it learns something useful even when the reward is
silent.

There are lots of options for that extra loss, and papers usually report
**which one scores higher** and stop there. I wanted to go one step
further and look inside: how do the latent spaces actually differ, and which
parts of them does the policy really use?

So this project asks two questions:

1. Which auxiliary loss gives the best agent?
2. What do the learned latent spaces look like, and what does the policy
   read from them?

The full code is on [GitHub](https://github.com/jgilewicz/latent_rl).

## The playground: Crafter

[Crafter](https://github.com/danijar/crafter) (Hafner, 2021) is basically
2D Minecraft in a 64×64 frame. You collect wood, build a table, craft a
pickaxe, mine stone, place a furnace, and try not to die of hunger, thirst,
exhaustion or zombies along the way. There are **22 achievements**, and the
**Crafter score** is a geometric-mean-ish aggregate of their success rates:

```
score = exp(mean(log(1 + s_i))) - 1     # s_i = success rate in %
```

It punishes ignoring achievements, so you can't farm one easy thing and call
it a day. The bottom two rows of the frame are a HUD showing health, food,
drink, energy and the inventory - remember that, it'll come back later.

## Four agents

All four share the same backbone (IMPALA CNN → 256-d latent z → actor and
critic) and the exact same PPO hyperparameters. The only difference is the
extra loss on the encoder:

| Agent | Extra loss on the encoder |
|---|---|
| **PPO** | none - reward only |
| **JEPA** | predict the next frame's latent from an EMA target encoder, plus a variance hinge against collapse |
| **VAE** | reconstruct the frame, plus KL to N(0, I) |
| **SAE** | reconstruct the frame, plus sparsity of a hidden code |

The interesting split is **predict in latent space** (JEPA) vs **reconstruct
pixels** (VAE, SAE). JEPA never has to draw a single pixel; it only has to
predict what the *representation* of the next frame will be. The
reconstruction agents have to explain every pixel, including the ones that
don't matter at all.

Training: **5M env steps × 5 seeds per method**, one H100 per run on the
WCSS cluster. Scores are aggregated with
[rliable](https://github.com/google-research/rliable) - IQM with 95%
stratified-bootstrap CIs and probability of improvement - because "mean of 5
seeds ± std" lies to you more often than you'd think.

## 1. Who plays best? JEPA

| Crafter score | PPO | JEPA | VAE | SAE |
|---|---|---|---|---|
| IQM @ 1M | 6.2 [5.5, 6.9] | **7.3** [7.0, 7.6] | 6.5 [5.9, 7.1] | 7.0 [6.7, 7.6] |
| IQM @ 5M | 8.6 [7.7, 10.3] | **12.6** [12.3, 13.0] | 10.8 [9.7, 12.3] | 10.2 [9.4, 11.2] |

![Sample efficiency](/images/posts/latent-rl/sample-efficiency.webp)

Everybody is tied for the first ~1M steps. Around 1.5M JEPA pulls away and
keeps the **narrowest band across seeds** for the rest of training. At 5M
it's roughly **+4 points (+46%) over plain PPO**, while the two
reconstruction agents land about +2 points above PPO.

![Aggregate scores at 5M](/images/posts/latent-rl/aggregate-5m.webp)

The probability of improvement makes it cleaner - P(X > Y) is the chance
that a random run of X beats a random run of Y:

![Probability of improvement at 5M](/images/posts/latent-rl/probability-of-improvement-5m.webp)

- JEPA beats everyone: P = 1.00 vs PPO, 0.88 vs VAE, 1.00 vs SAE
- VAE > PPO (0.88), SAE > PPO (0.84) - the SAE one is marginal
- SAE vs VAE: indistinguishable - P(SAE > VAE) = 0.36, but the CI spans
  0.04 to 0.76

So: some auxiliary loss is better than none, and predicting latents beats
reconstructing pixels. Not shocking, but nice to see it with proper error
bars.

### Where the points come from

Success rates (%) on the achievements where the methods actually differ:

| | PPO | JEPA | VAE | SAE |
|---|---|---|---|---|
| collect_sapling | 64 | **85** | 69 | 66 |
| collect_stone | 38 | **57** | 43 | 41 |
| place_furnace | 1 | **26** | 6 | 2 |
| collect_coal | 8 | **19** | 12 | 10 |
| defeat_zombie | 19 | 33 | **43** | 38 |
| eat_cow | 15 | 8 | **32** | 23 |

The agents have **different personalities**. JEPA is the builder - it gets
further down the crafting tree (stone → furnace → coal). The reconstruction
agents are hunters - they fight zombies and eat cows a lot more. JEPA,
apparently, would rather starve next to a furnace.

## Opening the black box

Learning curves only tell you *that* something works. For the rest of the
analysis I froze one 5M checkpoint per method, let each of them play 10k
frames on shared env seeds, and then encoded **all 40k frames with all four
encoders**. That way every comparison below is done on exactly the same
frames, regardless of which agent played them. Uncertainty comes from an
episode-level bootstrap (1000 reps).

## 2. Geometry: JEPA's space is a different animal

| | PPO | JEPA | VAE | SAE |
|---|---|---|---|---|
| effective rank (of 256) | 68.5 | **96.5** | 70.2 | 68.6 |
| TwoNN intrinsic dim. | 19.0 | 19.3 | 19.8 | 19.5 |
| latent step (lower = smoother) | 0.29 | **0.15** | 0.27 | 0.27 |
| corr(latent step, pixel step) | 0.72 | **0.56** | 0.69 | 0.68 |
| R² of z(t+1) from [z(t), a(t)] | 0.77 | **0.92** | 0.80 | 0.80 |
| R² of Δz | 0.18 | 0.16 | 0.17 | 0.19 |

![Effective rank and TwoNN intrinsic dimension](/images/posts/latent-rl/dimensions.webp)

A few things jump out:

- **Everyone lives on a ~19-dimensional manifold** (TwoNN), even though z
  has 256 dimensions. Crafter just isn't that complicated.
- But **JEPA spreads its variance over far more directions** - effective
  rank 97 vs ~69 for everyone else. Its variance hinge is doing its job.
- **JEPA is smoother in time** and tracks raw pixel change less. It encodes
  *what changed in the game*, not *how many pixels changed* - which is
  exactly what you'd hope a latent-prediction loss would do.
- JEPA's z(t+1) is very linearly predictable (R² 0.92), but that's partly by
  construction - predicting z(t+1) is literally its loss. The R² of the
  *change* Δz is ~0.17 for everyone, so no encoder makes the dynamics
  themselves linear.

![Linear CKA between encoders](/images/posts/latent-rl/cka-matrix.webp)

Linear CKA (similarity between representations, invariant to rotation)
tells the same story: PPO, VAE and SAE are similar to each other
(0.73-0.77), and **JEPA is the odd one out** (~0.60 to everyone). The two
reconstruction losses are the closest pair. In other words, reconstruction
makes PPO's latent space more pixel-faithful, but not different in kind.

## 3. Probes: does z know how hungry I am?

Next question: can a simple probe read **health, food, drink and energy**
off z?

The trap with probing is that a powerful enough probe will memorize
anything. So I used the **control task** trick from Hewitt & Liang (2019):
cluster frames into 250 "types" by k-means on downsampled pixels, give each
type a random label, and train the same probe on those. A probe that just
memorizes frames does equally well on both, so the number that matters is
**selectivity** = R²(real) − R²(control).

![Probe selectivity](/images/posts/latent-rl/probe-selectivity.webp)

Selectivity (linear | MLP probe):

| | PPO | JEPA | VAE | SAE |
|---|---|---|---|---|
| health | .64 \| .75 | .57 \| .76 | .56 \| .60 | .52 \| .59 |
| food | .65 \| .74 | .62 \| .80 | .62 \| .61 | .63 \| .74 |
| drink | .70 \| .72 | **.79 \| .90** | .71 \| .80 | .76 \| .80 |
| energy | .54 \| .54 | .51 \| .55 | .45 \| .48 | .48 \| .52 |

- Vitals are decodable from **every** encoder, mostly linearly.
- Control R² is near zero, so the probes aren't cheating.
- Linear probes can't separate the encoders - the CIs overlap everywhere.
  MLP probes separate them a bit: non-linear readout helps PPO and JEPA more
  than VAE and SAE.

Great, so every agent "understands" its own health? Not so fast.

## 4. Occlusion: the probes are reading the HUD

To see *where* that information comes from, I split the frame into a 9×9
grid of 7-px cells (7 rows of world, 2 rows of HUD), replaced one cell at a
time with the mean frame, and measured how much z and the probe outputs
moved.

![Occlusion maps](/images/posts/latent-rl/occlusion.webp)

- Each vitals probe lights up on **its own HUD icon** - health, food, drink,
  energy, in that order along the bottom row.
- It also reacts to other HUD cells that correlate with progress, like the
  wooden pickaxe and sword.
- World cells barely matter (≤ ~0.1 inventory units).

So "vitals are decodable" really means **"the encoder carries a readout of
the status bar"**. Nobody is inferring health from the fact that a zombie
just hit them. A bit disappointing, but very much what you'd expect once
you see it - why reason about the scene when the answer is printed in the
corner?

The latent itself behaves differently per agent: PPO, VAE and SAE react most
to the player's cell and its neighbours, while **JEPA is nearly flat over
the world view** and reacts mainly to the HUD inventory (wood, pickaxe,
sword). Which fits the builder personality from before quite nicely.

## 5. Ablation: what does the policy actually use?

Last question: of all this information in z, which part does the **policy**
depend on?

z has no privileged basis (the encoder ends in Linear → LayerNorm and the
actor starts with a Linear), so knocking out individual neurons is
meaningless. Instead I **mean-ablated subspaces** - project z onto a set of
directions, replace that component with its mean - and measured the KL
divergence between the original and the ablated policy:

- **vitals** - the linear probe's readout directions
- **random** - the same number of random directions, as a control
- **top-k PCs** - the k highest-variance directions (all 256 = upper bound)

![Ablation KL](/images/posts/latent-rl/ablation-kl.webp)

| KL [nats] | PPO | JEPA | VAE | SAE |
|---|---|---|---|---|
| vitals (4 dirs) | ~1e-6 | ~1e-6 | ~1e-6 | ~1e-6 |
| random (4 dirs) | .0015 | .0012 | .0012 | .0008 |
| top-1 PC | .04 | **.15** | .04 | .03 |
| top-4 PCs | .37 | **.57** | .34 | .34 |
| top-16 PCs | 1.01 | .85 | .83 | .73 |
| all of z (bound) | **1.01** | .88 | .83 | .73 |

- The policy depends on z almost entirely through its **top ~16 principal
  components** (~97-100% of the effect), even though effective ranks are
  69-97.
- **JEPA's policy is the most concentrated** - a single PC already accounts
  for 17% of the effect, and the top 4 for 65%.
- Removing the vitals readout directions changes **nothing** (KL ~1e-6).

That last one confused me for a while. The vitals are decodable, the policy
surely cares about being hungry, and yet removing the readout does nothing?

The answer is the classic **filter vs pattern** distinction (Haufe et al.,
2014). Ridge weights are a *filter*: they point into low-variance directions
that best isolate the signal from everything else - here ≤ 0.1% of z's
variance. The vitals *pattern* - where the information actually lives - sits
in the top PCs, mixed with the rest of the game state. So the ablation
removed the probe's readout and left the information where the policy reads
it from. Lesson learned: **"decodable along direction w" is not the same as
"used along direction w"**.

## What I take away from it

- **Predicting the future in latent space helps most.** JEPA gives +46% over
  plain PPO at 5M with the lowest seed variance. Reconstruction helps about
  half as much.
- **JEPA's latents are genuinely different** - higher rank, smoother in
  time, least similar to the others, mostly blind to the world view, and
  feeding a policy that leans hard on a few directions.
- **Reconstruction doesn't change the kind of representation**, it just
  makes it more pixel-faithful.
- **Probing results need a sanity check.** Without occlusion I'd have
  happily written "the agents understand their health". They read a status
  bar.

## Limitations

- Post-hoc analyses use **one checkpoint per method**, so their CIs reflect
  frame and episode noise, not seed-to-seed variation. The performance
  results do use 5 seeds.
- MLP probes use one training seed, and the occlusion maps have no CIs.
- Ablation is linear only - non-linear readouts of the vitals aren't removed.
- Crafter scores are low for everyone at this budget (≤ 13%). Nobody ever
  reaches iron or diamond, so the deep end of the tech tree is untested.

## Project stack

- **PyTorch** for the agents, **rliable** for aggregate metrics
- **scikit-learn** + **UMAP** for probes and geometry
- **YAML configs** for every experiment and plot, **W&B** for tracking
- **SLURM** on the WCSS cluster, 1×H100 per run
- **just** recipes for the whole pipeline: sweep → compare → eval buffer →
  geometry → probes → occlusion → ablation

## Wrapping up

This was a portfolio project, not a paper, and I had a lot of fun with it.
The performance result is the expected one, but the interpretability part
kept surprising me - especially the HUD readout and the filter-vs-pattern
trap in the ablation. If you want to dig in, the full write-up with every
number and the reproduction recipes is in the
[repo](https://github.com/jgilewicz/latent_rl).
