# Deploying to Coolify

This project is optimized for deployment on [Coolify](https://coolify.io). Because it uses a multi-container architecture (App, Worker, Database, and Nginx), the **Docker Compose** resource type is the recommended way to host it.

---

## Prerequisites
- A running Coolify instance.
- A GitHub/GitLab repository containing the source code.
- A domain name (or a Coolify magic domain).

---

## 🚀 Step-by-Step Deployment

### 1. Create a New Service
1. In Coolify, go to your **Project** and click **+ New Resource**.
2. Select **Docker Compose**.
3. Point it to your repository and the main branch.
4. Coolify will automatically detect your `docker-compose.yml`.

### 2. Configure Environment Variables
Go to the **Environment Variables** tab in Coolify and add the following secrets:

| Key | Value Example | Description |
|-----|---------------|-------------|
| `MYSQL_ROOT_PASSWORD` | `your_random_pass` | Root password for MySQL |
| `MYSQL_PASSWORD` | `your_user_pass` | Password for the app user |
| `JWT_SECRET` | `openssl rand -base64 32` | 32+ char secret for auth |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 32` | 32+ char secret for refreshes |
| `ENCRYPTION_KEY` | `32_char_random_key` | **Exactly 32 chars** for data encryption |
| `APP_URL` | `https://yourdomain.com` | Your public production URL |

> [!IMPORTANT]
> Keep `NODE_ENV` as `production`.

### 3. Handle Persistent Storage
Coolify handles volumes automatically based on the `docker-compose.yml`. Ensure these volumes are mapped correctly in the Coolify UI:
- `mysql_data`: Persists your database.
- `uploads_data`: Persists member photos.

### 4. Configure Domains
1. In the **nginx** service settings within Coolify, set your domain (e.g., `https://fttddwa.org`).
2. Coolify will automatically handle SSL via Traefik or Let's Encrypt.
3. Ensure port `80` is exposed in the Coolify proxy settings.

### 5. First-Time Database Setup
Once the services are "Running," you need to initialize the database:
1. Open the **Terminal** tab for the `app` service in Coolify.
2. Run the following commands:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

---

## 🛠 Managing the Services

- **App**: Handles the web interface and API.
- **Worker**: Handles background WhatsApp processing and daily greeting cron.
- **DB**: MySQL 8.0 instance.
- **Nginx**: Handles reverse proxying and security headers.

### Updating the App
To deploy updates, simply push your code to GitHub. Coolify will see the commit, rebuild the image, and perform a zero-downtime restart of your containers.

### Viewing Logs
You can view the logs for each service (especially the `worker`) directly in the Coolify dashboard to monitor message delivery status.
