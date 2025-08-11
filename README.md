# Fleet Dashboard

## Local dev
1. Open the folder in VS Code  
2. Install the **Live Server** extension  
3. Right-click `index.html` → **Open with Live Server**

## Structure
- `index.html` — app shell + router targets (`#/dashboard`, `#/fleet`)
- `styles.css` — styles
- `app.js` — core app: state, router, dialogs, import/export (lazy-loads `fleet.js`)
- `fleet.js` — Full Fleet page (filters + pagination), loaded on demand

## Contributing
- Create a branch per change: `git checkout -b feat/my-change`
- Commit: `git add -A && git commit -m "feat: short summary"`
- Push and open a PR against `main`
