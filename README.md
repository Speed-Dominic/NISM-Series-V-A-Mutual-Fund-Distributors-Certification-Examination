# NISM Series V-A Mutual Fund Distributors Exam Prep Studio

A browser-based practice and mock-exam application for the **NISM-Series-V-A: Mutual Fund Distributors Certification Examination**.

The project is built with React, TypeScript and Vite. It includes full-length mock tests, chapter-wise practice, a question-bank manager, test history and performance analytics.

> **Disclaimer:** This is an independent study/practice tool and is not an official NISM application. Verify examination rules, syllabus details and financial/regulatory information against the latest official NISM materials. A practice score in this app does not represent an official NISM result.

## Features

- **Full-length mock test:** 100 questions, 120-minute total duration, 1 mark per question and no negative marking as configured in the app.
- **Chapter-wise practice:** Practise questions from an individual syllabus chapter, with a 60-second timer per question.
- **Question bank:** Browse and manage questions; add questions individually or import question data in supported formats.
- **Results and review:** Review completed attempts and question-level results.
- **Performance dashboard:** View accuracy, score progression and chapter-level performance.
- **Test history:** Review previous attempts.
- **Local persistence:** Uses the browser's IndexedDB database to store questions, preferences, attempts and an active session on the current browser/device.
- **Light and dark themes.**

## Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Lucide React icons
- IndexedDB for browser-local persistence

## Requirements

Install a current version of:

- [Node.js](https://nodejs.org/) (use a version supported by the installed Vite release)
- npm, which is included with Node.js

The repository also contains a `bun.lock` file, so Bun can be used if preferred.

## Getting started

### 1. Download or clone the project

```bash
git clone <YOUR_REPOSITORY_URL>
cd NISM-Series-V-A-Mutual-Fund-Distributors-Certification-Examination-main
```

If you downloaded the ZIP from GitHub, extract it and open a terminal in the extracted project folder instead.

### 2. Install dependencies

With npm:

```bash
npm install
```

Or with Bun:

```bash
bun install
```

### 3. Start the development server

With npm:

```bash
npm run dev
```

Or with Bun:

```bash
bun run dev
```

Open the local URL printed by Vite in your terminal (the project config uses port `3000`).

### 4. Create a production build

```bash
npm run build
```

The production-ready website files are generated in the `dist/` directory.

### 5. Preview the production build locally

```bash
npm run preview
```

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server on port 3000 |
| `npm run build` | Build the production website into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run the TypeScript compiler without emitting files |
| `npm run clean` | Remove the `dist` directory and `server.js` |

## Project structure

```text
.
├── public/
│   ├── assets/                 # Bundled study/reference assets
│   └── icon.svg                # Application icon
├── src/
│   ├── components/             # Dashboard, exam, results and question-bank UI
│   ├── data/                   # Exam configuration and built-in questions
│   ├── db/                     # IndexedDB persistence layer
│   ├── hooks/                  # React hooks
│   ├── types/                  # TypeScript data types
│   ├── utils/                  # Analytics and question parsing utilities
│   ├── App.tsx                 # Main application and view/session orchestration
│   ├── index.css               # Global styles
│   └── main.tsx                # React entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Data and privacy notes

- The app stores its working question bank, preferences, attempts and active test session in IndexedDB in the user's browser.
- This browser-local data is not automatically synchronized between browsers or devices.
- Clearing the browser's site data may remove locally stored app data. Export or otherwise back up any important question-bank content before clearing site data.
- Do not add private keys, passwords or other secrets to source control.
- The repository includes an `.env.example` file documenting `GEMINI_API_KEY` and `APP_URL` for environments that use those integrations. Do not commit a real API key. The current application source should be checked before assuming these variables are required for the standard local run.

## Deployment

This is a Vite web application. Build it with:

```bash
npm run build
```

Deploy the contents of `dist/` to a static hosting provider that supports single-page applications. Configure the host to serve `index.html` for application routes if client-side routes are added.

For GitHub Pages or another host that serves the app from a subpath, review the Vite `base` configuration before deployment.

## Mobile and iOS note

This repository contains a **web application**, not a native iOS/Xcode project. The generated web build or an Android APK is not itself an iOS App Store upload.

To distribute this app as an iPhone app, an iOS-compatible app project/build and Apple's App Store submission requirements are still needed. Review the app's browser storage, navigation, file-import and offline behavior on iOS before choosing a wrapper or porting approach. An App Store submission must be made using Apple's supported iOS build and signing workflow.

## Contributing

1. Create a branch for your change.
2. Make the change and run `npm run lint`.
3. Run `npm run build` to verify the production build.
4. Submit a pull request describing the change.

## License

No license file was present in the supplied project archive. Unless the project owner adds a license, all rights remain with the respective copyright holder(s); do not assume the code is open source or freely reusable.
