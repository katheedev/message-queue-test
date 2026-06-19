# Aero Test Pilot

Local test tool for Kafka and IBM MQ flows. This guide is written for both QA and developers.

## What this app does

- Lets you manage applications, environments, and producer definitions
- Lets you test Kafka and IBM MQ connectivity
- Lets you send test messages
- Supports a fully local mode after the initial Firebase backup is taken once

## Prerequisites

Install these first:

- Node.js 18+ and npm
- Access to the backend dependencies in `backend/`
- Firebase project credentials

Important:
- Firebase credentials will not be shared in this repository.
- The credentials must be provided in person one time.
- After that one-time export, the app can be used locally without Firebase.

## Project structure

- Frontend: `./`
- Backend API: [backend/server.js](/home/kerupakaran/Documents/kathee/aero-test-pilot/backend/server.js:1)
- Local backup seed: [src/data/localFirebaseBackup.ts](/home/kerupakaran/Documents/kathee/aero-test-pilot/src/data/localFirebaseBackup.ts:1)

## First-time setup

### 1. Install frontend dependencies

```sh
npm install
```

### 2. Install backend dependencies

```sh
cd backend
npm install
cd ..
```

### 3. Create frontend env

Create `.env.local` in the project root:

```sh
VITE_API_BASE_URL=http://localhost:3001
VITE_LOCAL_ENVIRONMENT=false
```

Notes:
- `http://` is required in `VITE_API_BASE_URL`
- Keep `VITE_LOCAL_ENVIRONMENT=false` for the one-time Firebase export step

### 4. Get Firebase credentials in person

Add these values to `.env.local` when they are provided:

```sh
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

These credentials are only needed to export the data one time.

## One-time Firebase backup

Run this from the project root:

```sh
npm run export:firebase-backup
```

What this does:
- Reads Firebase config from `.env.local` or `.env`
- Reads Firestore using normal client access
- Exports the app data into [src/data/localFirebaseBackup.ts](/home/kerupakaran/Documents/kathee/aero-test-pilot/src/data/localFirebaseBackup.ts:1)

Collections exported:
- `applications`
- `users`
- `user-access`
- `testLogs`

Optional commands:

```sh
npm run export:firebase-backup -- --json
npm run export:firebase-backup -- --out tmp/firebase-backup.json
npm run export:firebase-backup -- --collections applications,users
```

## Switch to permanent local mode

After the backup is created, update `.env.local`:

```sh
VITE_API_BASE_URL=http://localhost:3001
VITE_LOCAL_ENVIRONMENT=true
```

At this point:
- Firebase is no longer required for day-to-day local use
- The app loads from the backup seed and browser local storage
- QA and dev can continue using the app locally forever unless they want a fresher backup

## Running the app locally

### 1. Start the backend

In one terminal:

```sh
cd backend
npm start
```

Expected backend port:
- `3001`

### 2. Start the frontend

In another terminal from the project root:

```sh
npm run dev
```

### 3. Open the app

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## First local login

Default local bootstrap admin:

- Email: `admin@mqtester.local`
- Password: `admin123`

If your backup already contains users, those users will also be available locally.

## How local storage works

In local mode:
- Application data is seeded from [src/data/localFirebaseBackup.ts](/home/kerupakaran/Documents/kathee/aero-test-pilot/src/data/localFirebaseBackup.ts:1)
- Ongoing changes are stored in browser `localStorage`
- User-specific testing overrides are also stored in browser `localStorage`

This means:
- Different browsers can have different local data after they start making changes
- Clearing browser storage resets the local working state

## If data does not appear

If local mode is enabled but the app is still showing old or empty data:

1. Confirm `.env.local` contains:

```sh
VITE_LOCAL_ENVIRONMENT=true
VITE_API_BASE_URL=http://localhost:3001
```

2. Restart the frontend dev server

3. In the browser console, run:

```js
localStorage.removeItem("mq-tester:local-database")
location.reload()
```

That forces the app to reseed from [src/data/localFirebaseBackup.ts](/home/kerupakaran/Documents/kathee/aero-test-pilot/src/data/localFirebaseBackup.ts:1).

## If Kafka or IBM MQ connection tests fail

Check these first:

- Backend is running on port `3001`
- `VITE_API_BASE_URL` includes `http://`
- Kafka or MQ host/port is reachable from your machine
- Security settings match the target system

If the frontend opens but connection tests fail, that usually means the backend is reachable and the issue is in the actual broker connection settings.

## When to refresh the backup

Take a fresh Firebase backup only when:

- new applications or environments were added in cloud data
- user access changed in Firebase and you want that reflected locally
- you want the latest cloud test history

For normal QA execution, this is not required after the first export.

## Useful commands

From the project root:

```sh
npm install
npm run dev
npm run build
npm run export:firebase-backup
```

From `backend/`:

```sh
npm install
npm start
```
