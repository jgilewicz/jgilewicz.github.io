---
title: Distilling ACT for Edge Deployment
date: 2026-01-15
slug: distil-act
excerpt: Notes on distilling an ACT policy small enough to hit the control loop budget on an edge device.
project: distil_act
---

## Why distill

The original ACT policy is accurate but too large to hit the control loop
budget on the target device. Distillation trades a small amount of task
accuracy for a model that actually fits the loop.

## Approach

1. Train the full-size ACT teacher policy in simulation.
2. Train a smaller student network against the teacher's action distribution.
3. Export the student to ONNX, then to a TensorRT engine.
4. Verify parity at every hop before moving to the next.

```python
student_actions = student.infer(obs)
teacher_actions = teacher.infer(obs)
assert np.allclose(student_actions, teacher_actions, atol=2e-2)
```

## Result

- Task success rate within the stated budget of the teacher policy
- p50 / p95 / p99 latency measured on-device, at a fixed power mode

---

*This post is also the template for new posts — copy this file, change the
frontmatter (`title`, `date`, `slug`, `excerpt`, `project`), and replace the
body below the second `---` with your own Markdown.*
