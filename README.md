# Work Hub

Personal work center dashboard built with Next.js.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **Animation:** Framer Motion + Canvas
- **Auth:** NextAuth.js v5 (Credentials)
- **Database:** Supabase (client only, Phase 1)
- **Theme:** next-themes (dark/light)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values in .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for the full list. Required:

- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `AUTH_URL` — `http://localhost:3000` for dev
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — hardcoded login
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project Structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth API
│   ├── login/page.tsx                    # Login page
│   └── dashboard/
│       ├── layout.tsx                    # Sidebar + Navbar
│       ├── page.tsx                      # Dashboard home
│       └── template.tsx                  # Page transitions
├── components/
│   ├── ui/                               # Shadcn UI
│   ├── sidebar.tsx
│   ├── navbar.tsx
│   ├── theme-toggle.tsx
│   ├── theme-provider.tsx
│   ├── session-provider.tsx
│   ├── login-form.tsx
│   └── animated-background.tsx
├── lib/
│   ├── supabase.ts                       # Supabase client
│   └── utils.ts                          # cn() helper
└── auth.ts                               # NextAuth config
```

## Phases

- **Phase 1** (current): Framework, auth, dashboard layout
- **Phase 2+**: Business modules (inventory, WP snippets, reviews, etc.)
