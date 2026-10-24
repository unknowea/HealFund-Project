 HealFund
This project is aimed to connect sick people need help and the helpers.

## Docker

Copy `.env.docker.example` to `.env` and set `JWT_SECRET` and `CHAPA_SECRET_KEY`. Keep the default `MONGO_URI` when using the bundled Docker database; set `BACKEND_PUBLIC_URL` when exposing the backend publicly for provider callbacks.
Then start the backend and both frontends from the repository root:

```bash
docker compose up --build
```

Open the applications at:

- Patient portal: http://localhost:3001
- Admin portal: http://localhost:3000
- Backend health check: http://localhost:5000/api/health

Uploaded files are stored in the persistent `healfund_uploads` Docker volume.

Donations use Chapa-hosted checkout. Set `CHAPA_SECRET_KEY` in the backend environment; a donation is counted only after the backend verifies its transaction with Chapa. Configure the same secret in Render's backend environment before enabling donations in production.

