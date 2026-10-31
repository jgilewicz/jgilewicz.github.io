---
title: When to Trust Your Critic: Uncertainty-Gated Surrogates in Evolutionary RL
date: 2026-09-10
slug: usc-erl
excerpt: Evolutionary RL burns rollouts evaluating every policy in the population. A critic can stand in for some of them — if you know when it's bluffing. Notes on our LFSD @ ECML PKDD 2026 workshop paper.
project: usc_erl
venue: LFSD @ ECML PKDD 2026
---

Evolutionary reinforcement learning has one annoying habit: it wants to
**evaluate everything**. Every generation, every candidate policy in the
population gets rolled out in the environment to see how good it is. In
MuJoCo that's just slow. On a real robot, or in any setting where a rollout
costs actual time, money or hardware wear, it's a deal-breaker.

There's a well-known shortcut: the RL half of the algorithm already trains a
critic that estimates long-term return, so why not ask the critic how good a
policy is instead of running it? That works - until the critic is
confidently wrong about a policy that wandered somewhere it has never seen,
and the whole population happily follows it into a false optimum.

So the question for this project was simple: **can the critic tell us when
it doesn't know?** And if it can, can we use that signal to decide which
policies are safe to score with the surrogate and which ones deserve a real
rollout?

This post is a write-up of *Uncertainty-Aware Surrogate-Assisted
Evolutionary Reinforcement Learning in Expensive Low-Data Regimes*, written
with Olgierd Unold (Wrocław University of Science and Technology) and
accepted at the **LFSD workshop at ECML PKDD 2026**. There's no arXiv
version yet, but the full code is on
[GitHub](https://github.com/jgilewicz/usc_erl).

## A quick ERL refresher

[ERL](https://arxiv.org/abs/1805.07917) (Khadka & Tumer, 2018) glues two
things together:

- **an actor-critic learner** (DDPG/TD3-style) that improves a single policy
  with gradients, reusing transitions from a replay buffer
- **a genetic algorithm** that keeps a population of policies, mutates
  them, and keeps the fittest ones

The two share the replay buffer, and the gradient-trained actor is
periodically injected into the population. You get gradient efficiency
from RL and exploration and robustness from evolution. The price is
**fitness evaluation**: to rank the population you need to know how good
every individual is, and the honest way to find out is a full episode per
policy, per generation.

## The surrogate trick (SC-ERL)

[SC-ERL](https://ieeexplore.ieee.org/document/9852668) (Wang et al., 2022)
noticed that the critic is already a fitness estimator in disguise. Take a
batch of states from the replay buffer, ask the candidate policy what it
would do, and average the critic's opinion:

```
Ĵ(π) = mean over s in replay batch of Q(s, π(s))
```

That's basically free compared to a rollout. Rank the offspring with Ĵ,
send only a subset to real evaluation, and you save a big chunk of the
interaction budget.

The catch is that **Q gives you a point estimate and nothing else**. In
well-explored parts of the state-action space it's a decent ranking signal.
But the population's whole job is to explore, so mutated policies keep
producing actions the critic has barely seen - and there it can return a
sharp, confident, completely made-up number. Nothing in plain SC-ERL can
tell those two cases apart.

## Making the critic say "I don't know"

The fix we studied is to give the critic a second output - **epistemic
uncertainty**, i.e. uncertainty that comes from the model not having seen
enough data, as opposed to noise in the environment itself. We plugged three
established estimators into the same SC-ERL controller:

- **Deep Ensemble** - 5 independently initialized critics. The mean of
  their predictions is the score, their disagreement is the uncertainty.
  The most trusted uncertainty method in deep learning, and the most
  expensive one here.
- **MC Dropout** - a single critic with dropout kept on at inference
  (p = 0.387), queried 25 times with different dropout masks. The spread
  across passes is the uncertainty. Cheap on memory, but sensitive to
  hyperparameters.
- **Evidential Critic** - the critic's head outputs the parameters of a
  Normal-Inverse-Gamma distribution (μ, v, α, β) instead of one number, and
  epistemic uncertainty falls out in closed form as β / (v(α − 1)). One
  deterministic forward pass, so it's the cheapest at inference - and the
  most delicate to train numerically.

All three share the same backbone: a 2×256 MLP actor with LayerNorm and a
tanh output, and a 400/300 critic with LayerNorm and ELU. Surrogate scores
are computed on a replay slice of k = 1024 states.

## The controller

The uncertainty estimate is only useful if something acts on it. The shared
controller does three things for every policy in the population:

1. **Pessimistic score.** Instead of the raw mean μ, use a lower-confidence
   bound μ − βσ and normalize it. If the critic is unsure, the policy gets
   ranked as if it were worse - optimism in unfamiliar territory is exactly
   what we're trying to avoid.
2. **Relative uncertainty.** c = σ / (√|μ| + 1). Raw σ scales with the
   return, which differs wildly across environments and training stages;
   relating it to the prediction's magnitude makes one threshold mean
   roughly the same thing everywhere.
3. **Fallback to reality.** An adaptive threshold is computed over the
   population's c values. Any policy above it - plus a small random fraction
   (ε) to keep the critic honest - gets a **real rollout**. Everyone else
   gets the surrogate score.

So the critic is still doing most of the work, but now it's the critic
that decides when it needs a second opinion. The only thing that changes
between the three variants is how μ and σ are computed; the routing logic
is identical, which keeps the comparison fair.

## Setup

- **Environments:** MuJoCo v5 - Walker2d, Hopper, Swimmer, HalfCheetah, Ant
- **Baselines:** PPO, TD3, DDPG, plain ERL, and SC-ERL with **random**
  surrogate scheduling (same budget, no uncertainty) - the last one is the
  important control, since it isolates what uncertainty adds on top of
  "use the surrogate sometimes"
- **Hyperparameters:** ERL and SC-ERL start from the per-environment
  settings in their original papers, then get tuned per environment with
  [Optuna](https://optuna.org/)
- **Metrics:** mean evaluation reward, best population fitness, and
  wall-clock training time - a surrogate method can earn its keep either
  by scoring higher or by scoring the same for less compute
- **Statistics:** Friedman + Nemenyi ranking across environments, pairwise
  tests, and a correlation analysis between uncertainty and critic TD loss

## Results

Short version: **uncertainty makes SC-ERL better, but it doesn't make it
win everything.** Here's the longer version.

![Sample-efficiency curves on five MuJoCo tasks](/images/posts/usc-erl/sample-efficiency.webp)

### Where the ensemble shines

Walker2d and Hopper are the clearest cases. The ensemble variant gets the
best **best-population fitness** of all methods - roughly double the
random-scheduling SC-ERL on Walker2d:

**Walker2d-v5**

| Method | Mean eval reward | Best pop. fitness | Train time [h] |
|---|---|---|---|
| TD3 | **4503.7 ± 339.9** | — | 1.31 |
| ERL | 1200.4 ± 239.3 | 1192.7 ± 229.4 | **0.23** |
| SC-ERL (random) | 979.3 ± 159.9 | 1110.4 ± 154.4 | 0.40 |
| SC-ERL (ensemble) | 1086.2 ± 479.8 | **2064.2 ± 567.7** | 0.95 |
| SC-ERL (dropout) | 982.9 ± 76.4 | 1023.0 ± 35.6 | 0.36 |
| SC-ERL (evidential) | 801.6 ± 215.5 | 1015.2 ± 35.8 | 0.56 |

**Hopper-v5**

| Method | Mean eval reward | Best pop. fitness | Train time [h] |
|---|---|---|---|
| TD3 | **2440.1 ± 910.7** | — | 1.29 |
| ERL | 1750.8 ± 683.4 | 1856.9 ± 759.1 | **0.20** |
| SC-ERL (random) | 1790.8 ± 918.6 | 2142.1 ± 885.1 | 0.68 |
| SC-ERL (ensemble) | 2116.8 ± 618.8 | **2398.1 ± 243.0** | 2.58 |
| SC-ERL (dropout) | 1183.9 ± 251.0 | 1262.5 ± 374.5 | 0.61 |
| SC-ERL (evidential) | 834.6 ± 462.7 | 1381.7 ± 632.0 | 0.90 |

Notice the training-time column though. On Hopper the ensemble costs
**2.58 h vs 0.68 h** for random scheduling. Five critics are five critics.

### Where it doesn't

- **Swimmer** - plain ERL wins outright (342 mean reward vs 288 for the
  ensemble). When the task is already easy for the evolutionary baseline,
  the surrogate has nothing to fix.
- **HalfCheetah and Ant** - classical actor-critic methods (TD3, DDPG)
  dominate mean reward. On Ant, the **evidential** variant does get the
  best best-population fitness of all methods (1573 vs 1430 for random
  SC-ERL), at about the same cost as random scheduling.
- **Dropout** is the least stable variant across the board. It stays close
  to random SC-ERL in cost, but rarely beats it.

### Ranking across environments

| Method | Walker2d | Hopper | Swimmer | HalfCheetah | Ant | Avg. rank |
|---|---|---|---|---|---|---|
| ERL | 3 | 3 | **1** | 4 | 2 | **2.6** |
| SC-ERL (ensemble) | 2 | 2 | 3 | 5 | 3 | 3.0 |
| TD3 | **1** | **1** | 6 | 2 | 6 | 3.2 |
| SC-ERL (random) | 5 | 4 | 4 | 3 | 4 | 4.0 |
| DDPG | 7 | 7 | 7 | **1** | **1** | 4.6 |
| SC-ERL (evidential) | 6 | 6 | 2 | 7 | 5 | 5.2 |
| SC-ERL (dropout) | 4 | 5 | 5 | 6 | 7 | 5.4 |
| PPO | 8 | 8 | 8 | 8 | 8 | 8.0 |

![Nemenyi critical difference diagram](/images/posts/usc-erl/nemenyi.webp)

The ensemble variant beats random scheduling on average rank (3.0 vs 4.0)
and sits right behind plain ERL. But be honest about the error bars: with
five environments the Nemenyi critical difference is **4.7 ranks**, so the
only separations that are statistically meaningful are the top group
against PPO. Everything else is "promising, needs more environments".

### Is the uncertainty actually telling the truth?

This is the part I care about most. If σ is a meaningful "I don't know"
signal, it should go up when the critic is struggling - and the most direct
proxy for "struggling" is the critic's TD loss.

![Epistemic uncertainty vs critic TD loss](/images/posts/usc-erl/uncertainty-vs-td-loss.webp)

Pearson r between uncertainty and TD loss:

| | Ensemble | Dropout | Evidential |
|---|---|---|---|
| Walker2d | **0.77** | 0.48 | 0.54 |
| Hopper | **0.58** | 0.41 | 0.42 |
| HalfCheetah | 0.55 | **0.90** | 0.74 |
| Ant | 0.45 | 0.39 | **0.63** |
| Swimmer | −0.01 | 0.12 | 0.17 |

On four of five tasks, every estimator's uncertainty grows with critic
error - the signal is real. Swimmer is the exception, and it's also the
task where no uncertainty-aware variant beats ERL. That lines up nicely: no
usable signal, no benefit.

## What I take away from it

- **Uncertainty is useful as a routing signal, not as a magic score
  booster.** It improves the SC-ERL controller (most clearly with
  ensembles), but it doesn't turn SC-ERL into the best algorithm on every
  task.
- **Ensembles buy robustness with compute.** The cheaper estimators keep
  most of the surrogate's cost advantage but aren't reliable yet.
- **The evidential critic is the interesting dark horse.** One forward
  pass, competitive on Swimmer and best population fitness on Ant -
  if it can be made more stable, it's the one that scales.
- **Correlation with TD loss is a sanity check, not a proof.** The real
  test is whether high uncertainty predicts bad ranking decisions, which
  this paper doesn't measure yet.

## Caveats

The numbers above are explicitly **preliminary** - the paper says so, and
so do I. The experiment pipeline has changed since, and the margins between
ERL, random SC-ERL and the ensemble are moderate relative to the variance.
The validation of uncertainty is indirect (TD loss, not ranking regret), and
everything is MuJoCo, so I wouldn't generalize to real expensive-feedback
settings yet.

## What's next

The repo has moved on since the workshop submission:

- **TD3-only backbone** - ERL and SC-ERL now always update their actor and
  critic with TD3 (twin critics, delayed policy updates, target smoothing),
  which was the best-performing gradient update in experiments
- **Harder environments** - the DeepMind Control Suite **dog** tasks
  (stand, walk, trot, run, fetch) and **MyoSuite** musculoskeletal control,
  where rollouts are a lot more expensive than in MuJoCo locomotion
- **JAX port** - [usc_erl_jax](https://github.com/jgilewicz/usc_erl_jax),
  because evaluating whole populations is exactly the kind of thing `vmap`
  is for
- **Better validation** - relating uncertainty to ranking errors and
  wrongly selected elites, instead of TD loss alone

Results on those will get their own post once they're properly re-collected.
