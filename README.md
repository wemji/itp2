# ONEQUEUE

ONEQUEUE is a full-stack digital queue and appointment management system. Customers join service queues remotely, receive a queue number, see an explainable wait estimate, and receive status notifications. Staff manage services and move customers through `WAITING → CALLED → SERVING → COMPLETED`.

## Project overview

This project addresses physical waiting at schools, clinics, barangay offices, government offices, and other service centers. It is intentionally understandable for a college project: queue estimation is `people ahead × average service time`, while the database and authorization rules provide a solid production foundation.

## Features

- Customer, Registrar, Finance, legacy staff, and administrator login with role-aware navigation
- Customer service browsing, queue joining, live queue tracking, cancellation, history, and notifications
- Staff dashboard with daily totals and average time calculations
- Queue actions: call, start, complete, and skip/no-show
- Service CRUD and deactivation
- Supabase PostgreSQL schema, department-scoped services and staff, queue status history, activity logs, foreign keys, trigger-based user profiles, and RLS policies
- Responsive mobile customer UI and desktop-friendly staff tables
- REST API with validation, authentication, role authorization, CORS, Helmet, and clear errors

## Structure

```text
ONEQUEUE/
├── client/                 # Vite + React customer/staff interface
│   └── src/
│       ├── components/     # Layout, protected routes, toast messages
│       ├── context/        # Authentication state
│       ├── lib/            # API and Supabase clients
│       ├── pages/          # Landing, auth, customer, and admin screens
│       └── styles.css      # Responsive visual system
├── server/                 # Express REST API
│   └── src/
│       ├── middleware/     # JWT and staff authorization
│       ├── supabase.js     # Supabase clients
│       └── index.js        # Routes and queue actions
├── supabase/schema.sql     # Tables, enums, trigger, indexes, and RLS
├── .env.example
└── package.json
```

## Technology and architecture

The React client calls the Express API with a Supabase access token. Express verifies the token with Supabase Auth and uses the service-role client for controlled server-side operations. Supabase PostgreSQL stores users, services, queues, counters, notifications, and history. The browser only receives the public Supabase URL and anon key; the service-role key is server-only.

## Database design

The schema in [`supabase/schema.sql`](./supabase/schema.sql) creates `users`, `services`, `queues`, `counters`, `notifications`, and `queue_history`. It includes foreign keys, active-queue uniqueness per customer, daily queue-number uniqueness, profile creation from Auth, and RLS policies. The `join_queue` RPC safely allocates daily queue numbers. Existing installations should run the migrations in filename order; the additive migrations introduce Registrar/Finance roles, service departments, queue status history, activity logs, and an atomic call-next RPC without dropping data.

## API documentation

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a customer account |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/me` | Authenticated | Load current profile |
| GET | `/api/services` | Public | List services with live waiting counts |
| POST | `/api/services` | Admin | Create a service and assign its department |
| PUT/DELETE | `/api/services/:id` | Admin / matching department staff | Edit service or change own department availability |
| GET | `/api/queues` | Authenticated | Own queues or all queues for staff |
| POST | `/api/queues` | Customer | Join an open service |
| PATCH | `/api/queues/:id/cancel` | Owner | Cancel own active queue |
| POST | `/api/queues/:id/call` | Staff | Mark `CALLED` |
| POST | `/api/queues/:id/start` | Staff | Mark `SERVING` |
| POST | `/api/queues/:id/complete` | Staff | Mark `COMPLETED` and archive |
| POST | `/api/queues/:id/skip` | Staff | Mark `NO-SHOW` and archive |
| POST | `/api/queues/:id/recall` | Staff | Notify a customer whose queue is already `CALLED` |
| GET | `/api/notifications` | Authenticated | List own notifications |
| PUT | `/api/notifications/:id/read` | Owner | Mark notification read |
| GET | `/api/history` | Authenticated | Filter own/all queue history |
| GET/POST | `/api/counters` | Staff | View/create counters |
| PUT/DELETE | `/api/counters/:id` | Staff | Update/deactivate counter |
| GET/POST | `/api/staff` | Admin | View/create staff accounts |
| PUT | `/api/staff/:id` | Admin | Change staff role/active status |
| GET/PUT | `/api/users` and `/api/users/:id` | Admin | Search users and activate/deactivate accounts |
| POST | `/api/queues/next` | Staff | Atomically call the oldest eligible customer in the staff member’s department |
| GET | `/api/dashboard` | Staff | Department-scoped daily statistics |
| GET | `/api/reports` | Admin | Date-filtered operational and staff metrics; `format=csv` exports queue records |
| GET | `/api/activity` | Admin | Recent activity log |

## Environment variables

Copy `.env.example` to `server/.env` and `client/.env` using the values from Supabase:

```env
# server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# client/.env
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Never commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Installation and local development

1. Create a Supabase project and run [`schema.sql`](./supabase/schema.sql), then run each SQL file in `supabase/migrations` in filename order. The migrations are additive and preserve existing records.
2. Copy the environment examples and fill in credentials.
3. Install dependencies from the root: `npm install`.
4. Run both applications: `npm.cmd run dev` in Windows PowerShell (`npm run dev` in other shells).
5. Open `http://localhost:5173`.

To promote a user to staff for a demonstration, update the profile in Supabase SQL Editor:

```sql
update public.users set role = 'admin', department = null where email = 'your-email@example.com';
```

## Testing and deployment

The API exposes `GET /api/health` for a basic deployment check. Run the server unit checks with `npm test --workspace server` and build the client with `npm run build`. Build the root [`Dockerfile`](./Dockerfile) and deploy the image to Amazon ECS Express Mode; follow [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md). Express serves the built React app and API under one HTTPS service URL. Set runtime secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; add `RESEND_API_KEY` and `NOTIFICATION_FROM` to enable email. Set `CLIENT_ORIGIN` and configure Supabase Auth redirect URLs with the ECS service URL, apply the database migrations, then verify `/api/health`, registration/login, and queue flow.

## Security notes

The server verifies Supabase access tokens, validates inputs, uses role/department checks, and relies on database RLS and transactional RPCs for queue operations. Keep service-role credentials server-side and configure Supabase Auth redirect/email-confirmation policies for the production domain.

## External notification integration

ONEQUEUE stores every notification in Supabase first. If `RESEND_API_KEY` and `NOTIFICATION_FROM` are configured on the server, the same event is also sent through Resend. External delivery is best-effort and never blocks queue creation or queue state changes. Without those variables, the in-app notification remains available and the API reports no external delivery attempt.

## Profile and recovery

Customers can update their display name from the Profile page and request a Supabase password reset from `/forgot-password`. Configure the Supabase Auth redirect URL to include the deployed frontend URL and `/reset-password` before enabling recovery links in production.

## Future improvements

The current release includes customer queueing, Registrar/Finance staff workflows, administrator account/service management, date-filtered reports, activity logs, realtime queue/notification feeds, optional Resend email, and concurrency-safe queue allocation/call-next RPCs.

## Verified implementation checklist (2026-11-04)

- [x] React/Vite client, Express API, and Supabase Auth/Postgres identified; root deployment combines frontend and API in one ECS Express Mode container.
- [x] Roles include customer, Registrar, Finance, legacy staff, and admin; department queue/service access is scoped in API and RLS migration.
- [x] Existing API and UI cover registration/login/recovery, profile, customer queues, queue status, history, in-app notifications, service/counter management, basic staff administration, and daily dashboard metrics.
- [x] Queue numbers are allocated by the `join_queue` database RPC, with uniqueness and one-active-queue constraints.
- [x] Customer/staff live queue and notification views use authenticated Supabase Realtime with polling fallback.
- [x] Staff can atomically call the oldest eligible customer and recall a called customer.
- [x] Separate Registrar and Finance roles are introduced additively and enforced for queue, service, counter, history, and dashboard access.
- [x] Admin report and CSV endpoints use queue records; department metrics, staff performance, activity logs, and status history are included.
- [ ] Supabase connectivity, email delivery, migration execution, and hosted behavior remain unverified because the local Supabase values are placeholders and no AWS account session/CLI is available.
- [x] ECS Express Mode container and step-by-step deployment instructions are included; the live AWS service still needs to be created in an AWS account.

The root workspace is the package configured by the root `package.json`. `itp2` is tracked as a git submodule and contains separate, unintegrated code; it was inspected but not modified as part of this root workspace update.

## GitHub workflow and team contributions

Use feature branches such as `feature/customer-queue` and pull requests into `main`. Keep commits focused, review schema/API changes together, and record each team member's contribution in the project report.
