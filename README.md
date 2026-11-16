# Azure Local Experience

Interactive Azure Local architecture experience. Open `index.html` in a browser
to use the application.

## Sync index.html to Azure/azure-local-experience

The `Sync index.html` GitHub Actions workflow runs on every push to this
repository's `main` branch, or manually from the Actions tab. It copies only the
root `index.html` to `Azure/azure-local-experience` on `main` and pushes a commit
only when that file differs. Other files, including `app.js`, `styles.css`, and
`icons/`, are not synced.

Before the first successful run:

1. Create a fine-grained personal access token with resource owner `Azure`,
   repository access limited to `azure-local-experience`, and **Contents: Read
   and write** permission. The token owner must have write access to the
   destination repository. Complete any required organization approval.
2. In this repository, open **Settings > Secrets and variables > Actions** and
   add a repository secret named `DESTINATION_REPO_TOKEN` containing that token.
3. Run **Actions > Sync index.html > Run workflow**, or push to `main`.

The destination's branch protection and rulesets must permit direct pushes by
the token owner. The workflow fails explicitly if the secret is missing, access
is denied, or a push is rejected. Rotate the secret before its token expires.
The source checkout uses the latest `main` so queued runs sync current content.
