# Deployment — DigitalOcean droplet + GitHub Actions

Every push to `main` builds a Docker image, pushes it to GitHub Container Registry (ghcr.io), and restarts the stack on the droplet over SSH. Migrations run automatically on container start (`prisma migrate deploy`).

## One-time droplet setup

1. **Create the droplet** — Ubuntu 24.04, Basic plan ($6/mo, 1GB RAM is enough), Frankfurt (fra1) is closest to Georgia. Add your SSH key.

2. **Install Docker** on the droplet:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Copy the stack files**:
   ```bash
   mkdir -p /opt/shavisia
   # from your machine:
   scp deploy/docker-compose.yml deploy/Caddyfile root@DROPLET_IP:/opt/shavisia/
   ```
   Edit `/opt/shavisia/docker-compose.yml`: replace `OWNER` in the image name with your GitHub username/org (lowercase).

4. **Create `/opt/shavisia/.env`** on the droplet:
   ```bash
   POSTGRES_PASSWORD=<openssl rand -hex 24>
   SESSION_SECRET=<openssl rand -hex 32>
   SMS_API_KEY=<smsoffice.ge key>
   SMS_SENDER=shavisia.ge
   ```
   `chmod 600 /opt/shavisia/.env`

5. **Log the droplet into ghcr** (needed because the image is private). Create a GitHub PAT (classic) with only `read:packages`:
   ```bash
   docker login ghcr.io -u <github-username> -p <PAT>
   ```
   (Docker stores it; pulls keep working after reboots.)

6. **DNS**: point `shavisia.ge` and `www.shavisia.ge` A records at the droplet IP. Caddy then obtains/renews Let's Encrypt certificates automatically.

7. **First start**:
   ```bash
   cd /opt/shavisia && docker compose up -d
   ```

## GitHub repository setup

1. Push this repo to GitHub (`main` branch).
2. Repo → Settings → Secrets and variables → Actions, add:
   - `DO_HOST` — droplet IP
   - `DO_USER` — `root` (or a deploy user in the `docker` group)
   - `DO_SSH_KEY` — private key whose public half is on the droplet
3. Push to `main` (or run the workflow manually) — done.

## After the first deploy

```bash
cd /opt/shavisia
# API key for PayPro (prints once):
docker compose exec app npx tsx scripts/create-api-client.ts paypro
# optional webhook:
docker compose exec app npx tsx scripts/set-webhook.ts paypro https://<paypro-endpoint>
# PayPro data migration (add PAYPRO_DATABASE_URL to .env first, restart app):
docker compose exec app npm run migrate:paypro -- --dry-run
docker compose exec app npm run migrate:paypro
```

## Useful commands

```bash
docker compose logs -f app        # app logs (incl. [SMS dev] codes if key empty)
docker compose exec db pg_dump -U shavisia shavisia > backup.sql   # backup
docker compose pull app && docker compose up -d                   # manual deploy
```

DB backups are your responsibility — a nightly `pg_dump` cron to DO Spaces is the simplest option.
