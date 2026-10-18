# Dual GitHub Pages deployment

Seven has one application source repository and two static deployments:

| URL | Deployment repository | Source build | Base path |
| --- | --- | --- | --- |
| <https://mikej340.github.io/seven/> | `mikej340/seven` | `npm run build:pages` | `/seven` |
| <https://playseven.uk/> | `mikej340/seven-site` | `npm run build:root` | none |

`seven-site` contains deployment plumbing only. Its workflow checks out a
specific commit from `mikej340/seven`, tests that source, builds `out/`, and
publishes the artifact with the deployment repository's `GITHUB_TOKEN`. The
application source is never copied into or independently maintained in the
deployment repository.

The existing `seven` Pages deployment remains unchanged. In particular, do
not set a custom domain on that repository: keeping the `github.io/seven`
origin available preserves existing players' origin-scoped local storage.
The save keys, puzzle identifiers, and schedule are shared by both builds but
browser storage is naturally separate between the two origins.

## Build and test locally

```sh
npm run test:pages
npm run test:root
```

Both commands produce `out/`; the second command replaces the first command's
output with the root-domain build.

## Required GitHub setup

Complete these steps before enabling automatic dispatch:

1. In `mikej340/seven-site`, open **Settings → Pages** and select **GitHub
   Actions** as the build and deployment source. Do not configure the custom
   domain yet.
2. In `mikej340/seven-site`, keep Actions enabled. The workflow declares only
   `contents: read`, `pages: write`, and `id-token: write`; it does not need a
   repository secret. If the `github-pages` environment has protection rules,
   allow the `main` branch and account for any required reviewer when testing.
3. Create a fine-grained personal access token owned by an account that can
   access `mikej340/seven-site`. Limit its repository access to
   `mikej340/seven-site` and grant **Contents: Read and write**. GitHub requires
   that permission for the repository dispatch endpoint.
4. In `mikej340/seven`, open **Settings → Secrets and variables → Actions** and
   add the token as a repository secret named
   `SEVEN_SITE_DISPATCH_TOKEN`.
5. Run **Deploy Seven** manually in `mikej340/seven-site`. Leave the optional
   source SHA empty to build `mikej340/seven@main`, or enter the full commit SHA
   to prove that both deployments can use the exact same source commit.
6. Confirm that the manual workflow's build, test, and deploy jobs succeed and
   inspect the temporary `mikej340.github.io/seven-site/` Pages URL. The root
   build deliberately uses `/` paths, so full gameplay validation belongs on
   the eventual root custom domain rather than the repository subpath.
7. Only after that manual verification, create a repository variable in
   `mikej340/seven` named `SEVEN_SITE_AUTO_DEPLOY` with the value `true`.
   Until this variable exists with that exact value, the dispatch job is
   skipped even if the workflow changes have been merged.

After the manually triggered root deployment is healthy, configure
`playseven.uk` as the `mikej340/seven-site` Pages custom domain, complete the
DNS verification requested by GitHub, confirm the certificate is issued, and
then enable **Enforce HTTPS**. Do not add a `CNAME` file to the source repo and
do not change the custom-domain field in `mikej340/seven`.

## Deployment sequence

On a push to `mikej340/seven@main`, the source workflow builds and deploys the
original `/seven` site first. Only after that deployment succeeds does the
gated dispatch job send the deployed source commit SHA to `seven-site`.
The receiving workflow checks out that exact SHA, so both sites are generated
from one source revision.

Manual runs in `seven-site` remain available independently of the dispatch
secret and automatic-deployment variable.

## Analytics

Both targets retain the same Umami website ID. `NEXT_PUBLIC_UMAMI_DOMAIN`
sets the script's domain filter to the build's public hostname
(`mikej340.github.io` or `playseven.uk`), allowing both deployments to report
without changing the existing tracker identity.
