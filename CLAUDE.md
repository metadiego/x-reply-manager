# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan

### Before starting work

- Write a plan to .claude/tasks/TASK_NAME.md
- The plan should be a detailed implementation plan and the resoning behind it.
- The plan should consist of a lists of tasks to execute.
- Don't over plan.
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### While implementing

- You should update the plan as you work.
- Your are requireed to update the plan .claude/tasks/TASK_NAME.md as you complete each task in the plan.
- After you complete the tasks in the plan, you should update and append detailed descriptions of the changes you made, so the following tasks can be easily handed over to engineers.

## Project Overview

This is a Next.js 15 application built with the Supabase starter template. It demonstrates authentication patterns using Supabase Auth with cookie-based sessions that work across the entire Next.js stack (App Router, Server Components, Client Components, Route Handlers, Server Actions, and Middleware).

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`: Your Supabase anon key

Both values can be found in your Supabase project's API settings.

## Architecture

### Authentication Flow
- **Client-side auth**: Use `createClient()` from `@/lib/supabase/client`
- **Server-side auth**: Use `createClient()` from `@/lib/supabase/server` 
- **Middleware**: Automatic session refresh via `updateSession()` in `middleware.ts`
- **Protected routes**: Check `supabase.auth.getClaims()` and redirect to `/auth/login` if unauthenticated

### Key Patterns

1. **Supabase Client Creation**: Always create a new server client instance within each function (important for Fluid compute)

2. **Auth State Management**: 
   - Server components use `getClaims()` for user data
   - Client components can use the same pattern with client-side Supabase client

3. **Route Protection**: Protected pages check authentication in the component and redirect using Next.js `redirect()`

4. **Styling**: Uses Tailwind CSS with shadcn/ui components and next-themes for dark mode

### Directory Structure

- `app/`: Next.js App Router pages and API routes
  - `auth/`: Authentication pages (login, sign-up, forgot password, etc.)
  - `protected/`: Example protected page requiring authentication
- `components/`: Reusable React components
  - `ui/`: shadcn/ui base components
  - `tutorial/`: Tutorial step components
- `lib/`: Utility functions and Supabase client configurations

### Component Patterns

- Authentication components (AuthButton, LoginForm, etc.) use server-side rendering
- Theme switching with next-themes provider in root layout
- Form handling uses native form actions where possible

## Important Notes

- Environment variables are checked via `hasEnvVars` utility before showing auth features
- Middleware runs on all routes except static assets (configured in middleware.ts)
- The app uses React 19 and Next.js 15 with Turbopack for development