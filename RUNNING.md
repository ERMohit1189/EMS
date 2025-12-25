# Running the App (Windows PowerShell)

This project expects `SESSION_SECRET` to be set in production. Below are copy-paste-ready commands to build and run locally on Windows.

Generate a strong secret (one-liner):
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Build and start (background, logs -> `server.log` / `server.err`):
```powershell
# Generate secret and start in background (writes logs to server.log/server.err)
$env:SESSION_SECRET = (node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
$env:NODE_ENV = "production"
npm run build
Start-Process -FilePath node -ArgumentList '.\\dist\\index.cjs' -RedirectStandardOutput '.\\server.log' -RedirectStandardError '.\\server.err' -NoNewWindow -PassThru

# Follow logs in the current window
Get-Content .\\server.log -Tail 50 -Wait
```

Run in foreground (use this if you want live logs in your terminal):
```powershell
$env:SESSION_SECRET = "paste-your-secret-here"
$env:NODE_ENV = "production"
npm run build
npm run start
```

For local development (no production checks):
```powershell
# Add to .env (project already reads dotenv)
# .env
SESSION_SECRET=dev-session-secret-super-secure-change-in-production-12345

# Then run dev server
$env:NODE_ENV = "development"
npm run dev
```

Security notes:
- Do NOT commit real secrets to source control.
- Use your hosting provider or CI secret management for production `SESSION_SECRET`.
- `cross-env` is installed and `npm start` uses it for cross-platform env setting.
