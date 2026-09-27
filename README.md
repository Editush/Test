# Craftush

Script-to-Premiere image tool with a private backend.

- `public/index.html` – the tool your team uses (craftush.netlify.app)
- `public/admin/index.html` – admin page (craftush.netlify.app/admin)
- `netlify/edge-functions/runware.js` – relay that adds the secret Runware key
- `netlify/edge-functions/admin.js` – admin API (password protected)

## One-time setup

1. **Set the admin password.** In Netlify, open the craftush project, go to
   **Project configuration → Environment variables → Add a variable**.
   Key: `ADMIN_PASSWORD`, value: a long password only you know.
2. **Put these files on GitHub.** Create a free account at github.com, then
   **New repository** (choose *Private*). Click **uploading an existing file** and
   drag in everything from this folder (the `public` and `netlify` folders,
   `netlify.toml`, `package.json` and this README). Commit.
3. **Connect Netlify to GitHub.** In Netlify, go to **Project configuration →
   Build & deploy → Link repository**, choose GitHub and your new repository.
   Leave the build command empty; the publish directory comes from `netlify.toml`.
   Deploy.
4. **Add the Runware key.** Open **craftush.netlify.app/admin**, sign in with
   `ADMIN_PASSWORD`, paste the Runware key and press **Save key**.
5. **(Recommended) Set a team access code** on the same page and share it with
   your creators. Without a code, anyone who finds the link can use your credits.

## Updating later

Upload the changed files to the GitHub repository (replace the old ones).
Netlify publishes the new version automatically within about a minute.
Drag-and-drop deploys no longer work for this project, because they don't include the backend.

## Changing things

- New admin password: edit `ADMIN_PASSWORD` in Netlify, then redeploy.
- New team code or Runware key: change it on the /admin page. It takes effect immediately.
