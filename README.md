# Enime API
Enime API is an open source API service for developers to access anime info (as well as their video sources)

## Installation

### Prerequisites
To deploy Enime API, you need following services:
1. Redis - You can get a free hosting at https://upstash.com/
2. PostgresSQL - You can get a free hosting at https://planetscale.com/
3. Node.js (>=v16) - You can install it at https://nodejs.org/en/download/
4. Pnpm - Yuu can install it at https://pnpm.io/
5. Webshare (Optional) - You can get the free plan at https://www.webshare.io/

### Steps
1. Install dependencies with ``pnpm install``
2. Create a ``.env`` file at the root of the project with the following properties:
```
PORT={the port that application is going to run on}
DATABASE_URL={the postgres database connection url}
WEBSHARE_API_KEY={the API key for Webshare.io (Optional)}
REDIS_HOST={Redis host}
REDIS_PORT={Redis port}
REDIS_PASSWORD={Redis password}
```
3. Run ``pnpm run dev`` and the application will start at desginated port (default 3000 if not explicitly set)

### Docker
1. Run ``docker pull enime/api:1.0``
2. Plug the environment variables in (If you don't know how to do this please Google)

### Docker-Compose
1. Refer to ``docker-compose.yml`` in the project root to proceed

## Credit
- https://github.com/consumet/consumet.ts - Some of the scraper logic from various anime sites
- https://github.com/AniAPI-Team/AniAPI - Inspiration, as well as a bit of the Gogoanime scraping logic