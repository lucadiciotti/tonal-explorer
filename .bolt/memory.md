# Project memory

## Product intent & audience

- Vite + React app named "tonal-explorer" (music/tonality related)
- Owner/publisher: Luca Diciotti (`lucadiciotti.github.io`)
- Target deployment: GitHub Pages as project repo (`tonal-explorer`)
- App uses Supabase for backend/database with authentication (login page)

## Brand personality & voice

- User communicates in Italian; assistant should respond in Italian
- Professional, helpful, step-by-step guidance tone

## Visual design & UX direction

- `.bolt/prompt` governs design principles (beauty, production-worthy, Tailwind, lucide-react)
- Login page expected as part of app flow

## Decisions, constraints & rationale

- Framework: Vite + React with JSX, Tailwind CSS, React hooks, Lucide React icons
- Avoid extra UI/icon/theme packages unless explicitly requested
- Repository: `tonal-explorer` → project-pages deployment
- Vite `base` path: `/tonal-explorer/`
- GitHub Actions workflow for auto-deploy on `main` branch push
- Final URL: `https://lucadiciotti.github.io/tonal-explorer/`
- GitHub Pages source must be set to "GitHub Actions" by user in repo settings
- Supabase integration for backend/database; app has login authentication
- `.env` excluded from GitHub (security) — Supabase keys not available in GitHub Actions build
- **Decision**: Supabase public keys (URL + anon key) hardcoded directly in source code so app works on GitHub Pages
- Rationale: Supabase anon keys are designed to be browser-visible; data security guaranteed by RLS policies, not key secrecy
- Build verified passing with hardcoded credentials

## Open questions & assumptions

- User must ensure GitHub Pages source set to "GitHub Actions"
- Supabase RLS policies must be properly configured to secure data (since keys are exposed)
- Actual app content/features beyond auth not yet fully known