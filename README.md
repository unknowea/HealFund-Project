 HealFund
This project is aimed to connect sick people need help and the helpers.

## Docker

Copy `.env.docker.example` to `.env` and set `JWT_SECRET`, `CHAPA_SECRET_KEY`, and the Gmail email settings. Keep the default `MONGO_URI` when using the bundled Docker database; set `BACKEND_PUBLIC_URL` when exposing the backend publicly for provider callbacks.
Then start the backend and both frontends from the repository root:

```bash
docker compose up --build
```

Open the applications at:

- Patient portal: http://localhost:3000
- Admin portal: http://localhost:3001
- Backend health check: http://localhost:5000/api/health

Uploaded files are stored in the persistent `healfund_uploads` Docker volume.

For local development without Docker, create `backend/.env` with `MONGO_URI`, `JWT_SECRET`, `EMAIL_SERVICE=gmail`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`, then run `npm run dev` from the repository root. Use a Google App Password for `EMAIL_PASS`, not your regular Gmail password. Keep this file private and never commit it.

Donations use Chapa-hosted checkout. Set `CHAPA_SECRET_KEY` in the backend environment; a donation is counted only after the backend verifies its transaction with Chapa.

The owner admin account (`healfund2006@gmail.com` by default; configurable with `OWNER_EMAIL`) can edit user profile details and create or remove admin accounts from the admin portal's Users tab. Other admins cannot manage admin accounts.

Admins and hospital staff can also create patient accounts from the Users tab. They set an initial password and should share it privately with the patient, who can change it after signing in. Hospital staff can edit or delete only the patient accounts they created; administrators retain patient-management access.
