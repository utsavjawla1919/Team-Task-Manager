# Team Task Manager

A full-stack web app for teams to create projects, assign tasks, and track progress with role-based access (Admin / Member).

> **Live demo:** _add your Railway URL after deploy_

## ✨ Features

- 🔐 **Authentication** – Signup / Login with JWT and bcrypt-hashed passwords
- 📁 **Projects & Teams** – Create projects, invite members by email, assign roles
- 👥 **Role-based access** – `ADMIN` (manage members, edit/delete project & any task) vs `MEMBER` (create tasks, edit assigned/created tasks)
- ✅ **Tasks** – Title, description, status (To Do / In Progress / Done), priority, due date, assignee
- 📊 **Dashboard** – Project count, my open tasks, overdue tasks, status breakdown
- 🗂️ **Kanban view** per project
- ⚡ **REST API** with Zod validation
- 🐘 **PostgreSQL** via Prisma ORM
- 🛡️ Rate-limiting on auth endpoints

## 🧱 Tech stack

| Layer       | Tech                                           |
|-------------|------------------------------------------------|
| Frontend    | React 18, Vite, React Router, Tailwind CSS, Axios |
| Backend     | Node.js, Express, JWT, bcryptjs, Zod           |
| Database    | PostgreSQL + Prisma ORM                        |
| Deployment  | Railway (single service serving API + frontend)|

## 📁 Project structure

```
team-task-manager/
├── prisma/schema.prisma       # DB schema
├── src/                       # Express backend
│   ├── server.js
│   ├── lib/prisma.js
│   ├── middleware/auth.js     # JWT + role checks
│   └── routes/
│       ├── auth.js
│       ├── projects.js
│       ├── tasks.js
│       └── dashboard.js
├── client/                    # Vite + React frontend
│   ├── src/
│   │   ├── pages/             # Login, Signup, Dashboard, Projects, ProjectDetail
│   │   ├── components/        # Layout, PrivateRoute
│   │   ├── AuthContext.jsx
│   │   ├── api.js
│   │   └── App.jsx
│   └── ...
├── package.json
├── railway.json
└── README.md
```

## 🚀 Local development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or any cloud Postgres URL)

### 1) Clone and install
```bash
git clone <your-repo-url> team-task-manager
cd team-task-manager
npm install
cd client && npm install && cd ..
```

### 2) Configure environment
```bash
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET
```

### 3) Run migrations
```bash
npx prisma migrate dev --name init
```

### 4) Run dev servers (two terminals)
```bash
# Terminal 1 — backend API on :3000
npm run dev

# Terminal 2 — frontend on :5173 (proxies /api to :3000)
npm run dev:client
```

Open http://localhost:5173

## 🌐 Deploy to Railway

### Option A — via the Railway dashboard (recommended)

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pick your repo.
3. In the same project, click **+ New** → **Database** → **Add PostgreSQL**.
4. Click your **service** (the app) → **Variables** tab → add:
   - `JWT_SECRET` = a long random string (e.g. `openssl rand -hex 32`)
   - `DATABASE_URL` = click "Add Reference" → choose the Postgres `DATABASE_URL`
   - `NODE_ENV` = `production`
5. Railway will build and deploy automatically. The `railway.json` runs `prisma migrate deploy` on startup.
6. Click the service → **Settings** → **Networking** → **Generate Domain**. That's your live URL.

### Option B — via Railway CLI

```bash
npm i -g @railway/cli
railway login
railway init
railway add  # add PostgreSQL plugin
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway up
```

## 🔌 API reference

All `/api/*` routes return JSON. Auth-protected routes need `Authorization: Bearer <token>`.

### Auth
| Method | Path                  | Body                          | Notes                       |
|--------|-----------------------|-------------------------------|-----------------------------|
| POST   | `/api/auth/signup`    | `{name, email, password}`     | Returns `{token, user}`     |
| POST   | `/api/auth/login`     | `{email, password}`           | Returns `{token, user}`     |
| GET    | `/api/auth/me`        | —                             | Current user                |

### Projects
| Method | Path                                   | Role required          |
|--------|----------------------------------------|------------------------|
| GET    | `/api/projects`                        | Member                 |
| POST   | `/api/projects`                        | Any auth user (becomes ADMIN) |
| GET    | `/api/projects/:id`                    | Member                 |
| PATCH  | `/api/projects/:id`                    | ADMIN                  |
| DELETE | `/api/projects/:id`                    | Owner only             |
| POST   | `/api/projects/:id/members`            | ADMIN                  |
| PATCH  | `/api/projects/:id/members/:userId`    | ADMIN                  |
| DELETE | `/api/projects/:id/members/:userId`    | ADMIN                  |

### Tasks
| Method | Path             | Role required                                    |
|--------|------------------|--------------------------------------------------|
| POST   | `/api/tasks`     | Project member                                   |
| PATCH  | `/api/tasks/:id` | Project ADMIN, task creator, or assignee         |
| DELETE | `/api/tasks/:id` | Project ADMIN or task creator                    |

### Dashboard
| Method | Path             | Returns                                          |
|--------|------------------|--------------------------------------------------|
| GET    | `/api/dashboard` | `{projectCount, myOpenTaskCount, overdueCount, statusCounts, myTasks, overdueTasks, recentTasks}` |

## 🧪 Manual test flow

1. Sign up as User A → create a project → User A is auto-ADMIN.
2. Sign up User B in another browser/incognito.
3. As User A, invite User B by email → assign role MEMBER.
4. As User A, create a task assigned to User B with a past due date → check Dashboard shows it as overdue.
5. As User B, log in → Dashboard shows the task → User B can change status but not delete the project.
6. Try having User B invite a member → API returns 403 (not ADMIN). ✅ RBAC works.

## 📝 License

MIT — feel free to reuse.
