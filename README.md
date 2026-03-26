# project

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Local Backend Setup

This project uses PostgreSQL with Drizzle ORM and MinIO for object storage.

1. Start the local dependencies:

```bash
docker compose up -d
```

2. Create your local env file from the example:

```bash
cp apps/web/.env.example apps/web/.env
```

3. Apply the schema to your database:

```bash
bun run db:push
```

4. Seed local loginable users, companies, and rooms:

```bash
bun run --filter web db:seed
```

The seed creates Better Auth accounts you can use to sign in locally:

- `admin.seed@project.local` / `SeedPass123!` (`admin`)
- `acme.seed@project.local` / `SeedPass123!` (`company`)
- `globex.seed@project.local` / `SeedPass123!` (`company`)
- `initech.seed@project.local` / `SeedPass123!` (`company`)
- `student.one.seed@project.local` / `SeedPass123!` (`student`)
- `student.two.seed@project.local` / `SeedPass123!` (`student`)

The seed intentionally creates users, companies, rooms, and company placements only. It does not create interviews.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@project/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
project/
├── apps/
│   └── web/         # Fullstack application (React + TanStack Start)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run test`: Run workspace tests
- `bun run typecheck`: Run workspace typechecking
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Oxlint and Oxfmt
