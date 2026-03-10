# SMS Inspector 2.0

A Next.js application for inspecting and analyzing SMS data with MongoDB Atlas cloud database.

## Features


## Quick Start

1. Clone/download the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and change `JWT_SECRET` to a secure random string.
    Edit `.env.local` and set:
    - `JWT_SECRET` to a secure random string
    - `MONGODB_URI` to your MongoDB Atlas connection string

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

The database will be automatically seeded with default data on first connection.

## Default Credentials

### Admin User (for dashboard login)

### Admin Panel Login

## Database

This project uses **MongoDB Atlas** for cloud database storage:
- Automatic database seeding on first connection
- Cloud-based, no local database files
- Scalable and reliable storage

### MongoDB Connection String Format
```
mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp
```
## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)
- shadcn/ui components

## Project Structure

```
sms/
├── data/                    # SQLite database (auto-created)
│   └── sms_inspector.db
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   └── lib/
│       ├── db.ts            # Database initialization
│       ├── database.ts      # Database operations
│       └── types.ts         # TypeScript types
├── .env.example
├── package.json
└── ...
```

## Build for Production

```bash
npm run build
npm start
```

## License

MIT
