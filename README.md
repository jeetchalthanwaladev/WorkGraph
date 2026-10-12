# WorkGraph

WorkGraph is an employee work-management platform for organizing assignments and keeping work records in one workspace. The repository is organized as an npm workspace with a React/Vite web client and an Express REST API.

## Project state

The web client, API, MongoDB connection, initial collection/index setup, login, protected routes, and admin-managed employee/job-role accounts are implemented. Task assignment, collaboration, and workflow features are the next milestones.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- MongoDB 6 or newer running locally on port 27017

## Local setup

1. Ensure MongoDB is running locally at `mongodb://localhost:27017/` (or change `MONGODB_URI` in `.env`).
2. Install dependencies with `npm install`.
3. Start the web client and API with `npm run dev`.
4. Open `http://localhost:5173`. The API health endpoint is `http://localhost:4001/api/v1/health`.

The API connects to the `workgraph` database before starting and creates the required collections and indexes if they are missing. In development, it seeds the configured admin and employee accounts from `.env`; their passwords are stored as bcrypt hashes. The Vite development server proxies `/api` requests to the API. There is no public sign-up route: admins add employees and assign their job roles from **Team & roles**.

## Commands

- `npm run dev` — run web and API in watch/development mode.
- `npm run build` — build the web client and syntax-check the API.
- `npm start` — start the API process.

## Environment variables

See `.env.example`. Do not commit `.env` or production credentials. `MONGODB_URI` is the MongoDB connection string, `MONGODB_DB_NAME` selects the database, and `WEB_ORIGIN` controls the allowed browser origin. `SEED_*` variables are for local development only; change the sample passwords before sharing the app and never use them in production.

## Phase 1 progress

1. Application foundation, MongoDB connection, and collection/index setup — complete.
2. Login, protected sessions, and admin-only employee/job-role management — complete.
3. Task assignment, atomic claiming, status workflow, review, and audit history — next.
4. Automated permission and workflow coverage — planned alongside task features.
