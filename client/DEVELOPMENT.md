# Development Notes — Client (Vite)

Quick instructions to run the client dev server and troubleshoot Hot Module Replacement (HMR).

## Start commands ✅

- Start client only (Vite dev server):

```bash
cd D:\VendorRegistrationForm
npm run dev:client
```

- Start backend only:

```bash
cd D:\VendorRegistrationForm
npm run dev
```

- Start both from VS Code (Debug compound):

Open the **Run and Debug** side bar and launch **Dev: Full Stack (Client + Backend)** — this runs the backend and starts the Vite server and opens the client at `http://localhost:5173`.

## Verify HMR (auto reload) 🔁

1. With `npm run dev:client` running, open `http://localhost:5173`.
2. Edit a file under `client/src/` (for example `client/src/main.tsx`) and save.
3. The browser should update automatically (HMR) and you should see a console message like `[vite] Hot Module Replacement enabled` or reconnection logs.

## Troubleshooting HMR ⚠️

- If the page doesn't auto-reload:
  - Confirm the dev server is running: `npm run dev:client` and listening on port **5173**.
  - Check the browser console for websocket or HMR errors (port mismatch, blocked connection, or CORS).
  - If you use the VS Code debug launch, ensure `.vscode/launch.json` `url` matches the dev server port (`http://localhost:5173`).
  - Make sure no other process is occupying port 5173 (Windows: `netstat -ano | findstr :5173`).
  - Restart the dev server if Vite failed to bind the port.

## Notes

- The project uses the workspace-level `package.json` script `dev:client` which runs `vite dev --port 5173`.
- If you prefer a different port, update `package.json` and `.vscode/launch.json` to the same port.

---

If you'd like, I can also add a short note into `LOCAL_DEVELOPMENT_GUIDE.md` explaining the VS Code compound debug flow. Want me to add that too?