# Library Management System: Design & Technical Documents

# Part 1: Design Document

## 1. Overview

A web app for running a small library. **Admins** manage the catalog and members and handle issuing and returning books. **Members** browse, search, reserve, and track their borrowed books.

**Goals**

- Full catalog management with search and filters
- Issue/return workflow with due dates and fines
- Role-based access (admin vs member)
- Clean dashboards for both roles

**Non-goals (v1)**

- Online payments, e-book reading, email/SMS notifications, multi-branch libraries

## 2. User Roles

| Role | Can do |
| --- | --- |
| Member | Register, log in, browse/search books, reserve a book, view own loans, history and fines |
| Admin | Everything a member can, plus CRUD books, manage members, issue/return books, view reports |

## 3. Core Features

1. **Authentication:** register, login, logout, profile
2. **Book catalog:** title, author, ISBN, genre, cover image, total and available copies
3. **Search & filter:** by title, author, genre, availability; paginated
4. **Issue / return:** admin issues a copy to a member with a due date, and records the return
5. **Reservations:** members reserve a book when no copies are available
6. **Fines:** auto-calculated per overdue day at return time
7. **Dashboards:** admin sees totals, overdue list, and popular books; members see active loans and due dates

## 4. Business Rules

- A member can hold at most **3 active loans**
- Loan period is **14 days**; one renewal of 7 days if nobody has reserved the book
- Fine is **a fixed amount per overdue day** (configurable)
- A member with unpaid fines or an overdue book **cannot borrow**
- `availableCopies` can never go below 0 or above `totalCopies`
- A book with active loans cannot be deleted

## 5. Key User Flows

**Borrowing:** Member finds book → sees "Available" → asks at the desk → Admin selects member + book → system checks rules → loan created, available copies decremented.

**Returning:** Admin opens the loan → marks returned → system computes fine if late → increments available copies → notifies the next reservation in the queue.

**Reserving:** Book unavailable → member clicks Reserve → reservation queued → when a copy is returned, the first reservation is marked "ready" for 48 hours.

## 6. Pages / UI

| Page | Access |
| --- | --- |
| Login / Register | Public |
| Book list + search | Member, Admin |
| Book details | Member, Admin |
| My Loans & History | Member |
| My Reservations | Member |
| Admin Dashboard | Admin |
| Manage Books (add/edit/delete) | Admin |
| Manage Members | Admin |
| Issue / Return screen | Admin |
| Overdue & Fines report | Admin |

## 7. Milestones

1. **Week 1:** auth, roles, protected routes
2. **Week 2:** book CRUD, search, pagination, cover upload
3. **Week 3:** issue/return with business rules
4. **Week 4:** reservations, fines, dashboards
5. **Week 5:** validation polish, tests, deployment

---

# Part 2: Technical Document

## 1. Architecture

```
React (Vite) ──HTTPS/JSON──► Express API ──Mongoose──► MongoDB Atlas
                                 │
                                 └── Cloudinary (cover images)
```

- **Frontend:** React, React Router, Tailwind, React Hook Form, Axios
- **Backend:** Node.js, Express, Mongoose, JWT (httpOnly cookie), bcrypt, Zod or Joi, Multer
- **Extras:** Helmet, CORS, express-rate-limit, morgan

## 2. Project Structure

One monorepo with two apps (`server`, `client`). Every file below is part of the planned project; see Part 3 for how to create it.

```
library-management-system/
├── .gitignore
├── README.md
├── docs/
│   └── library-management-system-docs.md
│
├── server/
│   ├── .env.example
│   ├── package.json
│   ├── scripts/
│   │   ├── seedAdmin.js          # creates the first admin user
│   │   └── seedBooks.js          # sample catalog data
│   ├── tests/
│   │   ├── setup.js              # in-memory Mongo for tests
│   │   ├── auth.test.js
│   │   ├── books.test.js
│   │   └── loans.test.js
│   └── src/
│       ├── server.js             # connects DB, starts listening
│       ├── app.js                # express app, middleware, routes
│       ├── config/
│       │   ├── env.js            # validated environment variables
│       │   ├── db.js             # mongoose connection
│       │   └── cloudinary.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Book.js
│       │   ├── Loan.js
│       │   └── Reservation.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── book.controller.js
│       │   ├── loan.controller.js
│       │   ├── reservation.controller.js
│       │   ├── user.controller.js
│       │   └── report.controller.js
│       ├── routes/
│       │   ├── index.js          # mounts all routers under /api/v1
│       │   ├── auth.routes.js
│       │   ├── book.routes.js
│       │   ├── loan.routes.js
│       │   ├── reservation.routes.js
│       │   ├── user.routes.js
│       │   └── report.routes.js
│       ├── middleware/
│       │   ├── auth.js           # protect: verifies JWT cookie
│       │   ├── role.js           # restrictTo("admin")
│       │   ├── validate.js       # runs Zod schemas
│       │   ├── upload.js         # Multer config
│       │   ├── rateLimit.js
│       │   └── error.js          # 404 + central error handler
│       ├── validators/
│       │   ├── auth.schema.js
│       │   ├── book.schema.js
│       │   ├── loan.schema.js
│       │   └── reservation.schema.js
│       ├── services/
│       │   ├── loanService.js    # issue, return, renew rules
│       │   ├── fineService.js
│       │   └── reservationService.js
│       └── utils/
│           ├── ApiError.js
│           ├── asyncHandler.js
│           └── dates.js
│
└── client/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css             # Tailwind import
        ├── api/
        │   ├── axios.js          # instance, withCredentials: true
        │   ├── auth.api.js
        │   ├── books.api.js
        │   ├── loans.api.js
        │   ├── reservations.api.js
        │   ├── users.api.js
        │   └── reports.api.js
        ├── contexts/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── hooks/
        │   ├── useDebounce.js
        │   └── useBooks.js
        ├── routes/
        │   ├── index.jsx
        │   ├── ProtectedRoute.jsx
        │   └── AdminRoute.jsx
        ├── components/
        │   ├── layout/           # DashboardLayout.jsx, Navbar.jsx, Sidebar.jsx
        │   ├── common/           # InputField, ConfirmModal, Pagination, Loader
        │   ├── books/            # BookCard, BookForm, BookFilters
        │   └── loans/            # LoanTable, IssueForm
        └── pages/
            ├── auth/             # Login.jsx, Register.jsx
            ├── member/           # Books, BookDetails, MyLoans, MyReservations, Profile
            ├── admin/            # Dashboard, ManageBooks, ManageMembers, IssueReturn, Reports
            └── NotFound.jsx
```

**Layering rule (server):** `routes` → `middleware` (auth, role, validate) → `controllers` (HTTP in/out only) → `services` (business rules) → `models` (database). Controllers never hold business logic.

## 3. Data Models (Mongoose)

**User**

```js
{
  name: String,              // required
  email: String,             // required, unique, lowercase
  password: String,          // bcrypt hash, select: false
  role: { type: String, enum: ["member", "admin"], default: "member" },
  unpaidFines: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}  // timestamps: true
```

**Book**

```js
{
  title: String,             // required
  author: String,            // required
  isbn: { type: String, unique: true },
  genre: String,
  description: String,
  coverUrl: String,
  totalCopies: { type: Number, min: 1 },
  availableCopies: { type: Number, min: 0 }
}  // indexes: text index on title + author; index on genre
```

**Loan**

```js
{
  book: { type: ObjectId, ref: "Book" },
  member: { type: ObjectId, ref: "User" },
  issuedBy: { type: ObjectId, ref: "User" },
  issueDate: Date,
  dueDate: Date,
  returnDate: Date,          // null while active
  renewed: { type: Boolean, default: false },
  fine: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "returned"], default: "active" }
}  // indexes: { member, status }, { book, status }, { dueDate }
```

**Reservation**

```js
{
  book: { type: ObjectId, ref: "Book" },
  member: { type: ObjectId, ref: "User" },
  status: { type: String, enum: ["waiting", "ready", "fulfilled", "cancelled", "expired"] },
  readyUntil: Date
}  // index: { book, status, createdAt }
```

## 4. API Design

Base path `/api/v1`. All responses: `{ success, data?, message? }`.

**Auth**

| Method | Route | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Auth |
| GET | `/auth/me` | Auth |

**Books**

| Method | Route | Access |
| --- | --- | --- |
| GET | `/books?search=&genre=&available=&page=&limit=` | Auth |
| GET | `/books/:id` | Auth |
| POST | `/books` | Admin |
| PATCH | `/books/:id` | Admin |
| DELETE | `/books/:id` | Admin |

**Loans**

| Method | Route | Access |
| --- | --- | --- |
| POST | `/loans` (body: `bookId`, `memberId`) | Admin |
| PATCH | `/loans/:id/return` | Admin |
| PATCH | `/loans/:id/renew` | Admin |
| GET | `/loans/me` | Member |
| GET | `/loans?status=&overdue=true` | Admin |

**Reservations**

| Method | Route | Access |
| --- | --- | --- |
| POST | `/reservations` (body: `bookId`) | Member |
| GET | `/reservations/me` | Member |
| DELETE | `/reservations/:id` | Member |

**Members & Reports (Admin)**

| Method | Route |
| --- | --- |
| GET | `/users`, `/users/:id` |
| PATCH | `/users/:id` (activate/deactivate, clear fines) |
| GET | `/reports/summary` (totals, overdue count, top books) |

## 5. Authentication & Authorization

- Hash passwords with bcrypt (cost 10–12)
- Issue a JWT in an **httpOnly, secure, sameSite** cookie (7-day expiry)
- `protect` middleware verifies the token and attaches `req.user`
- `restrictTo("admin")` middleware guards admin routes
- React uses a protected-route wrapper and an `AuthContext` that calls `/auth/me` on load
- Never trust role or user id from the request body; take them from `req.user`

## 6. Critical Logic: Issuing a Book

Avoid race conditions (two admins issuing the last copy) by decrementing atomically:

```js
// loanService.issueBook
const member = await User.findById(memberId);
if (!member.isActive || member.unpaidFines > 0) throw new ApiError(400, "Member not eligible");

const activeCount = await Loan.countDocuments({ member: memberId, status: "active" });
if (activeCount >= 3) throw new ApiError(400, "Loan limit reached");

const overdue = await Loan.exists({ member: memberId, status: "active", dueDate: { $lt: new Date() } });
if (overdue) throw new ApiError(400, "Member has overdue books");

// Atomic decrement: only succeeds if a copy is available
const book = await Book.findOneAndUpdate(
  { _id: bookId, availableCopies: { $gt: 0 } },
  { $inc: { availableCopies: -1 } },
  { new: true }
);
if (!book) throw new ApiError(409, "No copies available");

const dueDate = addDays(new Date(), 14);
return Loan.create({ book: bookId, member: memberId, issuedBy: adminId, issueDate: new Date(), dueDate });
```

If `Loan.create` fails after the decrement, increment the copy back in a `catch`. For stricter consistency, wrap both steps in a MongoDB transaction (requires an Atlas replica set, which the free tier provides).

**Return:** set `returnDate`, `status = "returned"`, compute `fine = overdueDays * FINE_PER_DAY`, add it to `user.unpaidFines`, `$inc` `availableCopies`, then promote the first waiting reservation to `ready`.

## 7. Validation & Error Handling

- Validate every request body and query with Zod or Joi in a `validate` middleware
- Use an `ApiError(statusCode, message)` class and one central error middleware
- Wrap async controllers in `asyncHandler` to avoid try/catch repetition
- Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict

## 8. Security Checklist

- `helmet`, strict CORS (allow only the client origin, `credentials: true`)
- `express-rate-limit` on `/auth/*`
- Sanitize input against NoSQL injection (`express-mongo-sanitize`)
- Secrets only in `.env`; never commit them
- Restrict upload types and size (images, max 2 MB)

## 9. Environment Variables

```
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
LOAN_DAYS=14
FINE_PER_DAY=1
MAX_ACTIVE_LOANS=3
```

## 10. Testing

- **Backend:** Vitest + Supertest for auth, issue/return rules, and role guards, using `mongodb-memory-server`
- **Frontend:** React Testing Library for forms and protected routes
- **Must-test cases:** last-copy race, loan limit, overdue block, fine calculation, member hitting an admin route

## 11. Deployment

- **Database:** MongoDB Atlas (the same cluster type you develop against, or a separate production cluster)
- **API:** Render or Railway. Point the service at `server/`, set the start command to `npm start`, and add the environment variables in the dashboard
- **Client:** Vercel or Netlify. Set the build command to `npm run build`, the output directory to `dist`, and `VITE_API_URL` to the deployed API URL. Add a rewrite of all routes to `index.html` so React Router deep links work
- **Cookies across domains:** the client and API will be on different domains, so set the auth cookie to `sameSite: "none"` and `secure: true`, and set `CLIENT_URL` on the API to the deployed client origin for CORS
- Set `app.set("trust proxy", 1)` in Express, because the host puts a proxy in front of it. Without it, `secure` cookies and rate limiting misbehave
- In Atlas, allow the API host's outbound IPs (or `0.0.0.0/0` for a hobby project) under Network Access

## 12. Future Enhancements

Email reminders for due dates (node-cron + Nodemailer), barcode/ISBN lookup via Open Library, book reviews and ratings, and CSV export of reports.

---

# Part 3: Project Setup Guide

Complete this part before writing any feature code. The goal is a running stack: the API connected to MongoDB Atlas, the React app talking to the API, and a health check passing.

## 1. Prerequisites

- Node.js 22 LTS and npm
- Git, and VS Code with the ESLint extension
- Postman or Thunder Client for API testing
- Free accounts on MongoDB Atlas (database), Cloudinary (cover images), and GitHub

## 2. Set Up the Database (MongoDB Atlas)

1. Create a free **M0** cluster on Atlas
2. Under **Database Access**, create a database user with a password (avoid special characters, or URL-encode them)
3. Under **Network Access**, add your current IP (or `0.0.0.0/0` for development only)
4. Click **Connect → Drivers** and copy the connection string, then add the database name: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/bookdb?retryWrites=true&w=majority`

Atlas clusters are replica sets, so MongoDB transactions work without any extra setup.

## 3. Initial Setup Steps

**Step 1: Create the repo**

```bash
mkdir library-management-system && cd library-management-system
git init
mkdir docs server client
```

**Step 2: Initialize the server**

```bash
cd server
npm init -y
npm pkg set type=module
npm i express@4 mongoose dotenv cors helmet morgan cookie-parser bcryptjs jsonwebtoken zod \
  express-rate-limit express-mongo-sanitize multer cloudinary
npm i -D nodemon vitest supertest mongodb-memory-server
npm pkg set scripts.dev="nodemon src/server.js" scripts.start="node src/server.js" \
  scripts.test="vitest run" scripts.seed:admin="node scripts/seedAdmin.js" \
  scripts.seed:books="node scripts/seedBooks.js"
mkdir -p src/{config,models,controllers,routes,middleware,validators,services,utils} scripts tests
cd ..
```

Express 4 is used because `express-mongo-sanitize` does not work with Express 5.

**Step 3: Initialize the client**

```bash
npm create vite@latest client -- --template react
cd client
npm i react-router axios react-hook-form react-icons
npm i tailwindcss @tailwindcss/vite
mkdir -p src/{api,contexts,hooks,routes,components/{layout,common,books,loans},pages/{auth,member,admin}}
cd ..
```

Add the Tailwind plugin to `client/vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Put `@import "tailwindcss";` in `src/index.css`.

**Step 4: Environment files**

`server/.env.example` (copy to `server/.env`, which is git-ignored):

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/bookdb?retryWrites=true&w=majority
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
LOAN_DAYS=14
FINE_PER_DAY=1
MAX_ACTIVE_LOANS=3
ADMIN_EMAIL=admin@library.local
ADMIN_PASSWORD=ChangeMe123!
```

`client/.env.example`:

```
VITE_API_URL=http://localhost:5000/api/v1
```

In `server/src/config/env.js`, validate these with Zod so the app fails fast when one is missing.

**Step 5: Minimal health check (to verify the stack)**

`server/src/app.js`

```js
import express from "express";
const app = express();
app.get("/api/v1/health", (req, res) => res.json({ success: true, status: "ok" }));
export default app;
```

`server/src/server.js`

```js
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

await mongoose.connect(process.env.MONGO_URI);
app.listen(process.env.PORT || 5000, () => console.log("API running"));
```

(`env.js` and `db.js` replace the raw `process.env` use once you build them.)

**Step 6: Start and verify**

```bash
cp server/.env.example server/.env    # then fill in the real values
cp client/.env.example client/.env
```

Run each app in its own terminal:

```bash
cd server && npm run dev
cd client && npm run dev
```

Then check:

- `http://localhost:5000/api/v1/health` returns `{"success":true,"status":"ok"}`
- `http://localhost:5173` shows the Vite React page
- The server terminal prints no Mongo connection errors

## 4. Daily Commands

| Task | Command |
| --- | --- |
| Start the API (auto-restarts on change) | `cd server && npm run dev` |
| Start the client | `cd client && npm run dev` |
| Seed the admin user | `cd server && npm run seed:admin` |
| Seed sample books | `cd server && npm run seed:books` |
| Run tests | `cd server && npm test` |
| Build the client | `cd client && npm run build` |

**Common problems**

- **Mongo connection timeout:** your IP is not in Atlas Network Access, or the password has unescaped special characters
- **CORS or cookie errors in the browser:** `CLIENT_URL` must exactly match the client origin, and Axios needs `withCredentials: true`
- **Never commit `.env` files:** keep only the `.env.example` versions in Git

## 5. Git Setup

`.gitignore`:

```
node_modules
dist
.env
.env.*
!.env.example
```

Use `main` for stable code and short-lived branches per feature (`feat/auth`, `feat/books-crud`). Commit the scaffold as the first commit.

## 6. Ready-to-Develop Checklist

- [ ] Atlas cluster, database user, and network access are set up
- [ ] Health endpoint responds; Vite page loads
- [ ] Server connects to Atlas without errors
- [ ] `.env` files exist locally and are ignored by Git
- [ ] Folder skeleton from section 2 is created
- [ ] First commit pushed to GitHub

When all boxes are checked, start Week 1 of the milestones: models, auth, and protected routes.