# Database Types

This directory contains TypeScript types for your Supabase database.

## Generating Types

To generate TypeScript types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/db/types.ts
```

Or if using the Supabase CLI with a local project:

```bash
npx supabase gen types typescript --local > lib/db/types.ts
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.
