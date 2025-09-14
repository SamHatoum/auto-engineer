---
'@auto-engineer/information-architect': patch
---

fix: restore Git tag creation to enable GitHub releases

Restores the custom Git tag creation logic that was working in v0.8.3. The createGithubReleases setting needs actual Git tags to exist before it can create GitHub releases. This adds back the tag creation steps that were accidentally removed, ensuring that both npm publishing and GitHub releases work correctly.
