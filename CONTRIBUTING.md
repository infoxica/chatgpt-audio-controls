# Contributing to ChatGPT Audio Controls

Thank you for your interest in contributing to **ChatGPT Audio Controls & Read Aloud**! This project is maintained as an open-source tool for the AI and developer community.

---

## Public repository privacy

Keep personal account emails, credentials, private service identifiers, and account-level analytics out of code, documentation, pull requests, comments, and screenshots. Store release ownership and private deployment records outside version control. Use GitHub's no-reply email for commit metadata. Public store links and client-side website measurement IDs may be included when required by the product.

## 🛠️ Development Environment

This project uses **[Bun](https://bun.sh)** (v1.3.9+) as the package manager and runtime, together with **React**, **TypeScript**, and **Vite**.

### Prerequisites
- [Bun](https://bun.sh) (`bun --version` >= 1.3.9)
- Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser

### Setup

```bash
# Clone the repository
git clone https://github.com/infoxica/chatgpt-audio-controls.git
cd chatgpt-audio-controls

# Install dependencies
bun install

# Generate icon assets
bun run build:icons

# Build development extension
bun run build
```

### Loading Unpacked Extension for Testing

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory inside this repository.
5. Open [https://chatgpt.com](https://chatgpt.com) and test the controls!

---

## 🌿 Git Branching Strategy & Workflow

We follow a strict, structured branching model. Please review these rules before opening pull requests:

### Branch Types

- **`master`**: Production release branch.
  - Never commit or push directly to `master`.
  - Only `develop` and `fix/*` branches are allowed to merge into `master` via pull requests.
- **`develop`**: Main integration & development branch.
  - New features and bugs are merged here first.
- **`feature/*`**: Feature branches (e.g. `feature/custom-themes`, `feature/waveform-visualizer`).
  - Must branch from `develop`.
  - Must only open pull requests targeting `develop` (never `master`).
- **`bug/*`**: Bug fix branches during development (e.g. `bug/seek-jump-fix`).
  - Must branch from `develop`.
  - Must target `develop`.
- **`fix/*`**: Hotfix branches allowed to merge directly into `master` or `develop`.

```text
feature/* ──► develop ──► master
bug/*     ──► develop
fix/*     ──► master / develop
```

---

## 🏷️ Version Bump Rule Before Merging to `master`

Before opening or merging any pull request into `master`, the **last commit** must be a version bump commit:

```bash
# Format
chore: bump version to X.Y.Z
```

- **Patch** (`1.0.0` -> `1.0.1`): Small bug fixes and minor styling adjustments.
- **Minor** (`1.0.0` -> `1.1.0`): New features that maintain backward compatibility.
- **Major** (`1.0.0` -> `2.0.0`): Breaking changes or major overhauls.

---

## 📋 Available Scripts

| Command | Description |
| :--- | :--- |
| `bun run build` | Compiles React SPAs, Content Script, and synchronizes Userscript |
| `bun run build:icons` | Generates multi-resolution PNG icons from master SVG |
| `bun run build:extension` | Compiles the Chromium extension bundle into `dist/` |
| `bun run package` | Builds and creates a clean distributable `.zip` in `dist-zip/` |
| `bun run release:check` | Verifies that a `vX.Y.Z` release tag matches all project version metadata |
| `bun run typecheck` | Runs TypeScript type checking with zero errors |

---

## 💡 Code Style & Best Practices

- **Self-Contained Icons & CSS**: To comply with Chrome Web Store and CSP rules on `chatgpt.com`, do not import remote fonts or external CDN stylesheets in content scripts. All icons must use inline Lucide SVGs.
- **Privacy First**: Never introduce network telemetry or analytics.
- **Type Safety**: Write strict TypeScript without unhandled `any` types.

---

## 📬 Reporting Issues & Pull Requests

- Use the provided [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md) or [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
- Ensure all automated checks and `bun run typecheck` pass cleanly.
- Be respectful and collaborative!

### Automated Releases

Push a semver tag matching the package version, such as `v1.0.2`, after the release commit is merged. The GitHub Actions workflow validates the package, manifest, userscript, and changelog versions, then publishes the extension ZIP and userscript as GitHub Release assets. Branch pushes and pull requests run verification and packaging without publishing a release.
