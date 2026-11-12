[![Build and deploy](https://github.com/LeonidBresjnev/kanban/actions/workflows/firebase-hosting-merge.yml/badge.svg?branch=main)](https://github.com/LeonidBresjnev/kanban/actions/workflows/deploy.yml)

# Kanban

Kanban is a collaborative task board for organizing work from planning through completion. Create boards with custom columns, add and prioritize tasks, assign members, and track progress with a clear drag-and-drop workflow.

## Features

- Create boards with custom columns and manage board members and roles.
- Invite members to a board; invitations are stored separately so invitees can receive and accept them before they have access to the board.
- Create, assign, prioritize, and move tasks between columns, with support for subtasks and due dates.
- Archive completed or inactive tasks and filter the board to focus on specific work.
- Sign in with email and password or Google, with board and task data synchronized through Firebase.
- Use the interface in English or Danish.

## Built with

- React and TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication and Cloud Firestore
- Lucide icons

## Getting started

### Requirements

- Node.js and npm
- A Firebase project for authentication and cloud data synchronization

### Install and configure

1. Install the project dependencies:

   ```sh
   npm install
   ```

2. Copy `src/secrets.example.ts` to `src/secrets.ts` and replace the example values with your Firebase web app configuration. The application imports its Firebase configuration from `src/secrets.ts`.
3. In the Firebase project, enable the sign-in providers you intend to use and configure Cloud Firestore with the rules in `firestore.rules`.
4. Start the development server:

   ```sh
   npm run dev
   ```

Open the local URL printed by Vite. Without a valid Firebase configuration, the app may run in its offline/mock mode, but Firebase-backed authentication and synchronization will not be available.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Check the TypeScript types without emitting files. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the test suite. |
| `npm run build` | Create the production build in `dist`. |
| `npm run preview` | Preview the production build locally. |

## Deployment

Firebase Hosting is configured to serve the production build from `dist`, with a rewrite to the app entry point for client-side routes. Build the project with `npm run build`, then deploy it using the Firebase CLI for a Firebase project configured with this repository's Hosting target.

The deployed application is available at [funwithkanban.web.app](https://funwithkanban.web.app/).

