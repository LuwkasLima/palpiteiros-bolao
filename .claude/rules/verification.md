---
description: Completion and verification standards
---

- Never mark work complete without evidence that it works.
- Choose verification appropriate to the change: tests, lint, logs, screenshots, manual reproduction, or before/after behavioral comparison.
- If tests fail, investigate and resolve the failure or clearly explain why it is unrelated.
- Favor demonstrable correctness over confident claims.
- When changing existing behavior, verify that the change matches intended behavior and does not regress adjacent functionality.
- If verification reveals a broken assumption, stop and revise the implementation before proceeding.
