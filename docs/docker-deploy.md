# Docker Deployment

This compose file runs only the TanStack Start web app. The image is expected to be built by GitHub Actions and pushed to GHCR. Postgres and MinIO are expected to exist outside this compose file.

## Required External Services

- Postgres: create the database and user first, then set `DATABASE_URL`.
- MinIO: create the bucket named by `S3_BUCKET`, then set the S3 credentials and endpoint.

Copy `.env.docker.example` to `.env` on the VPS and fill in real values.

## Pull

```sh
docker compose pull web
```

If the GHCR package is private, log in first with a GitHub token that has `read:packages`:

```sh
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Run

```sh
docker compose up -d web
```

Run database migrations against your external Postgres before or during deploy:

```sh
docker compose run --rm web bun run db:migrate
```

## Stop And Remove Container

```sh
docker compose down
```

## Remove The Docker Image

```sh
docker image rm s2ee-ralph-web:latest
```

If Docker says the image is still used by a container, remove the stopped container first:

```sh
docker rm s2ee-ralph-web
docker image rm s2ee-ralph-web:latest
```
