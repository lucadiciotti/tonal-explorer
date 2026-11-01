# Project memory

## Product intent & audience

- Vite + React starter app named "tonal-explorer" (possibly music/tonality related)
- Owner/publisher: Luca Diciotti (`lucadiciotti.github.io`)
- Target deployment: GitHub Pages as project repo (`tonal-explorer`)

## Brand personality & voice

- User communicates in Italian; assistant should respond in Italian
- Professional, helpful, step-by-step guidance tone

## Visual design & UX direction

- No specific UI decisions inferred yet; app is at starter/stub stage
- `.bolt/prompt` governs design principles (beauty, production-worthy, Tailwind, lucide-react)

## Decisions, constraints & rationale

- Framework: Vite + React with JSX, Tailwind CSS, React hooks, Lucide React icons
- Avoid extra UI/icon/theme packages unless explicitly requested
- Repository name confirmed: `tonal-explorer` → project-pages deployment
- Vite `base` path set to `/tonal-explorer/`
- GitHub Actions workflow created for auto-deploy on `main` branch push
- `.gitignore` updated
- Optional `deploy` script added to `package.json`
- Build verified passing with configured base path
- Final URL: `https://lucadiciotti.github.io/tonal-explorer/`
- GitHub Pages source must be set to "GitHub Actions" by user in repo settings

## Open questions & assumptions

- User must manually: create repo, connect Bolt to GitHub, push to `main`, enable Pages source
- Actual app content/domain not yet known beyond starter scaffolding