
### 2 to 3 Design choices

- Nix to ensure any teammates', and production, environments are reproducible as well as provide top-level project shortcuts for common tasks
- Docker/Docker-Compose to reduce risks from Node/NPM supply chain attacks as well as make deployment simpler
- Express/Node JS with PostgreSQL because the ecosystem is widely supported and makes sourcing tech-talent easier

### What I'd change, add, or stop if more time was available

- Add `./frontend` to mono-repo
- Add `./shared-code` to mono-repo and move `ApiErrorToClient`, and shared type hints from `api/@types/index.d.ts`, there so both `./api` and `./frontend` have single source of truth/behavior/expectations
- Add unit/integration/end-to-end tests
- Add `api.<HOST>/upload` routes for POST and GET
