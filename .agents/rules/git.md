---
trigger: always_on
---

# Git and GitHub Rules for AI Coding Agent

## Branches

Only use these branches:

- `master`
- `develop`
- `feature/*`
- `fix/*`
- `bug/*`

Do not create any other branch types.

---

## Branch Purpose

### `master`

The `master` branch is the production branch.

Rules:

- Never commit directly to `master`.
- Never push directly to `master`.
- Only merge into `master` using a pull request.
- Only `develop` and `fix/*` branches are allowed to merge into `master`.

---

### `develop`

The `develop` branch is the main development branch.

Rules:

- New features must be merged into `develop`.
- Bug branches must be merged into `develop`.
- `develop` can be merged into `master`.
- Never commit directly to `develop` unless explicitly required.
- Use pull requests for all merges into `develop`.

---

### `feature/*`

Use `feature/*` branches for new features.

Example:

```text
feature/add-login
feature/payment-screen
```

Rules:

- `feature/*` branches must only merge into `develop`.
- `feature/*` branches must never merge into `master`.
- `feature/*` branches must never open a pull request against `master`.

Allowed:

```text
feature/* -> develop
```

Not allowed:

```text
feature/* -> master
```

---

### `bug/*`

Use `bug/*` branches for normal bug fixes during development.

Example:

```text
bug/fix-navbar-crash
bug/incorrect-total-price
```

Rules:

- `bug/*` branches must only merge into `develop`.
- `bug/*` branches must never merge into `master`.
- `bug/*` branches must never open a pull request against `master`.

Allowed:

```text
bug/* -> develop
```

Not allowed:

```text
bug/* -> master
```

---

### `fix/*`

Use `fix/*` branches only for fixes that are allowed to go directly to `master`.

Example:

```text
fix/payment-hotfix
fix/login-production-issue
```

Rules:

- `fix/*` branches may merge into `master`.
- `fix/*` branches may also merge into `develop` if needed.
- A `fix/*` branch must not be merged into `master` unless the version has been bumped first.

Allowed:

```text
fix/* -> master
fix/* -> develop
```

---

## Merge Rules

### Allowed merges

Only these merge directions are allowed:

```text
feature/* -> develop
bug/*     -> develop
develop   -> master
fix/*     -> master
fix/*     -> develop
```

### Forbidden merges

These merges are strictly forbidden:

```text
feature/* -> master
bug/*     -> master
master    -> feature/*
master    -> bug/*
master    -> fix/*
```

---

## Version Bump Rule Before Merging to `master`

Before opening or merging any pull request into `master`, the last commit must be a version bump commit.

This rule applies to:

```text
develop -> master
fix/*   -> master
```

---

## Version Bump Requirements

Before merging into `master`, check the last commit.

If the last commit is already a version bump commit, the merge may continue.

If the last commit is not a version bump commit, do the following before raising or merging the pull request into `master`:

1. Decide the correct version bump based on the changes.
2. Update the project version.
3. Commit the version bump.
4. Make sure the version bump commit is the last commit on the branch.
5. Then raise or update the pull request against `master`.

---

## Version Bump Commit Message

The version bump commit message must be clear.

Use this format:

```text
chore: bump version to X.Y.Z
```

Example:

```text
chore: bump version to 1.4.0
```

---

## Version Bump Type

Use the correct version bump based on the change:

### Patch version

Use for small fixes and bug fixes.

Example:

```text
1.2.3 -> 1.2.4
```

### Minor version

Use for new features that do not break existing behavior.

Example:

```text
1.2.3 -> 1.3.0
```

### Major version

Use for breaking changes.

Example:

```text
1.2.3 -> 2.0.0
```

---

## Pull Request Rules

Every pull request must follow these rules:

- The source branch must be allowed to merge into the target branch.
- The pull request target branch must be correct.
- `feature/*` and `bug/*` pull requests must target `develop`.
- `develop` and `fix/*` pull requests may target `master`.
- Pull requests into `master` must have a version bump as the last commit.
- Do not merge if the branch direction is not allowed.
- Do not merge if the version bump rule is not satisfied.

---

## Strict Agent Behavior

The AI coding agent must follow these rules:

- Never create a pull request from `feature/*` to `master`.
- Never create a pull request from `bug/*` to `master`.
- Never merge anything into `master` without checking the last commit.
- Never merge into `master` if the last commit is not a version bump.
- If the last commit is not a version bump, create a version bump commit first.
- Never skip the version bump rule.
- Never guess that a version bump was done. Always check.
- Never push directly to `master`.
- Never push directly to `develop` unless explicitly instructed.
- Always use pull requests for merges.
- Stop and report an error if a requested merge breaks these rules.

---

## Final Check Before Pull Request to `master`

Before creating a pull request into `master`, verify:

```text
Target branch is master
Source branch is develop or fix/*
Last commit is a version bump commit
Version number was actually updated
Branch does not violate merge rules
```

If any check fails, do not create the pull request.

Fix the issue first, then create the pull request.
