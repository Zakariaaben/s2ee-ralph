# Docker Deployment

The compose file starts local Postgres and MinIO by default. The TanStack Start web app is available under the `deploy` profile. The image is expected to be built by GitHub Actions and pushed to GHCR. For deployment, Postgres and MinIO are expected to exist outside this compose file.

## Required External Services

- Postgres: create the database and user first, then set `DATABASE_URL`.
- MinIO: create the bucket named by `S3_BUCKET`, then set the S3 credentials and endpoint.

Copy `.env.docker.example` to `.env` on the VPS and fill in real values.

## Pull

```sh
docker compose --profile deploy pull web
```

If the GHCR package is private, log in first with a GitHub token that has `read:packages`:

```sh
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Run

```sh
docker compose --profile deploy up -d web
```

Run database migrations against your external Postgres before or during deploy:

```sh
docker compose --profile deploy run --rm web bun run db:migrate
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
