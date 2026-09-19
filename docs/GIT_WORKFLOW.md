# Git Workflow

## Branches

- `main` — production
- `develop` — integration
- `feature/<name>`
- `fix/<name>`
- `refactor/<name>`
- `test/<name>`
- `docs/<name>`
- `chore/<name>`

## Example

```bash
git checkout develop
git pull origin develop
git checkout -b feature/speaker-management

git add .
git commit -m "feat: add speaker management"
git push -u origin feature/speaker-management
```

Open a PR into `develop`.

After integration, open a release PR from `develop` into `main`.

## Required GitHub branch protection

For `main`:

- Require pull request before merging
- Require at least 1 approval
- Require status checks
- Require branches to be up to date
- Require conversation resolution
- Disable force pushes
- Restrict direct pushes

Apply similar protection to `develop`.
