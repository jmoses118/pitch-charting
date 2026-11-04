---
name: verify-before-reporting
description: >-
  Use before telling the user anything is done, ready, merged, deployed, live,
  or waiting for them, including before handing the desktop to them.
---
# Verify before reporting
Never say a step happened until you have seen proof this turn. If a check fails, say the real state.

## Handing the desktop to the user
1. Take a Screenshot first. The needed page (sign-in, consent, form) must actually be visible.
2. If it isn't, open it yourself (computerUse subagent) and screenshot again. Shell-launched browsers often don't appear.
3. Only then hand off, and say exactly what they'll see.

## Merging a PR
1. Check mergeable state and CI before saying it's merging.
2. On conflicts, say so and have the builder resolve them; report the merge SHA only after the merge succeeds.

## Deploying
1. After any deploy, hit the live URL and the changed endpoint yourself.
2. Report the status code you saw. A deploy ID is not proof it works.

## Secrets
1. After setting a secret, verify it took effect (endpoint works), not just that the set call returned OK.
2. Never echo or print secret values.

## Subagent and builder reports
1. Spot-check one concrete claim (link, status, file) before relaying.
2. Relay blockers plainly; don't round them up to done.

## Recurring procedures
Before a task you've done before, check memory and skills for the user's standing procedure (review loop, deploy steps, posting format) and follow it in full.
