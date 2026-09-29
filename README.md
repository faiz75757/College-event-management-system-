# B4 Events - College Event Management System (with Waitlist)

A simple MERN mini project. Admins create events, mark attendance and see waiting lists. Students register for events, join a waiting list when an event is full, and get promoted automatically when someone cancels.

## Technologies
React (Vite) + Axios, Node.js + Express, MongoDB (Mongoose), bcryptjs (password hashing), JWT (login).

## Folder structure
```
b4-events-waitlist/
  server/   models/ routes/ middleware/ utils/waitlist.js server.js seed.js
  client/   src/pages/ src/components/ src/api.js src/App.jsx vercel.json
```

## Features
- Separate Student and Admin login pages; register with a role (admin needs a secret code from .env)
- Student: event cards, Register / Join Waitlist / Cancel / Leave Waitlist, status and waitlist position
- Admin: create, edit, delete events; registered list, FIFO waiting list, mark Attended or Absent
- No overbooking: seats are taken with one atomic MongoDB update; a unique index blocks duplicates
- Cancelling a registration promotes the earliest waitlisted student automatically

## Run on your computer (VS Code)
1. Install Node.js (LTS).
2. Create a MongoDB Atlas cluster (see below) and copy the connection string.
3. Backend:
   ```
   cd server
   npm install
   copy .env.example .env      (Mac/Linux: cp .env.example .env)
   ```
   Fill in `.env`, then:
   ```
   npm run seed      (adds 3 sample events, optional)
   npm run dev
   ```
   You should see "MongoDB connected".
4. Frontend (new terminal):
   ```
   cd client
   npm install
   npm run dev
   ```
   Open http://localhost:5173

## MongoDB Atlas setup
1. Create a free M0 cluster at mongodb.com/atlas.
2. Database Access: add a user (role: Read and write to any database). Use a password without special characters.
3. Network Access: add IP `0.0.0.0/0`.
4. Database > Connect > Drivers: copy the `mongodb+srv://...` string, replace the password and add `/b4events` before the `?`.
5. Paste it as `MONGO_URI` in `server/.env`.

## Environment variables (server/.env)
| Name | Meaning |
|---|---|
| MONGO_URI | MongoDB Atlas connection string |
| JWT_SECRET | Long random text for signing tokens |
| ADMIN_SECRET_CODE | Secret code required to register as admin |
| PORT | Backend port (default 5000) |

## First admin and events
Open Admin Register, choose role Admin, enter the `ADMIN_SECRET_CODE`. Then log in and create events, or run `npm run seed` for sample events.

## Test the waitlist
1. Seed events. "Coding Contest" has only 2 seats.
2. Register students A, B, C. A and B register; C sees "Join Waitlist" and joins (position #1).
3. Student A cancels: C becomes Registered automatically and leaves the waitlist.
4. Admin: open View Students, mark attendance.

## Go live
- Backend: Render Web Service, root directory `server`, build `npm install`, start `npm start`, add the 3 environment variables.
- Frontend: Vercel, root directory `client`. First edit `client/vercel.json` and put your Render URL in place of `YOUR-BACKEND-URL`.

## API overview
| Method | Path | Access |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| GET | /api/events | public |
| POST / PUT / DELETE | /api/events, /api/events/:id | admin |
| POST | /api/events/:id/register | student |
| POST | /api/events/:id/waitlist | student |
| DELETE | /api/events/:id/register | student (cancel or leave waitlist) |
| GET | /api/events/:id/participants | admin |
| GET | /api/registrations/mine | student |
| PATCH | /api/registrations/:id/attendance | admin |
