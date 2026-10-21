# MythicTracker

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.8.

## Development server

To start a local development server, run:

```bash
npm start
```

`npm start` runs Angular with a development proxy for the API at `http://localhost:3000`. Start the API in a second terminal with `npm run start:api`.

## Backend and database

The API is an Express server. It proxies the Open5e content used by the app and stores registered users and their characters in PostgreSQL through Prisma. Passwords are bcrypt-hashed; character routes require a signed-in user and only return or modify that user's records. Core character fields use relational columns, with a JSON field for additional character data.

For local development:

```bash
docker compose up -d database
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `.env` to a randomly generated value of at least 32 characters (for example, generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), then run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run start:api
```

In another terminal, run `npm start` and open `http://localhost:4200`. Accounts are created from the Characters page. API bearer tokens are held in memory for the active browser session; users sign in again after a page reload or token expiration. The migration creates the `User` and `Character` tables. Do not use the example database password or JWT secret in production; use a managed PostgreSQL service, private environment variables, TLS, backups, and production migration command `npm run db:deploy`.

The app currently sources game reference content from Open5e, rather than directly from Wizards of the Coast. All existing Open5e requests now go through the backend proxy at `/api/content/*`.

## Run with Docker

Install Docker Desktop, then create a local environment file and set a private JWT secret:

```powershell
Copy-Item .env.example .env
```

Replace the sample `JWT_SECRET` in `.env` with a randomly generated secret (at least 32 characters), then build and start the app and database:

```bash
docker compose up --build
```

Open `http://localhost:3000`. The app container waits for PostgreSQL, runs pending Prisma migrations, and serves both the Angular application and API. PostgreSQL data is persisted in the `mythic-postgres` Docker volume. The Compose database credentials are development defaults; set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in `.env` before using this setup outside local development. Stop the containers with `docker compose down`; use `docker compose down -v` only when intentionally deleting the database volume.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
