# BRLN BFF

Backend for Frontend for the BRLN Dashboard. Built with Express, TypeScript, and MongoDB.

## Requirements

- **Node.js** >= 22.0.0
- **npm** >= 10.x (bundled with Node 22)

## Environment Variables

Copy or create a `.env` file at the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/brln
ALLOWED_ORIGIN=http://localhost:4200,http://localhost:4201
```

| Variable          | Required | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `PORT`            | No       | HTTP port (default: `3000`)                      |
| `MONGO_URI`       | No       | MongoDB connection string. If omitted the server starts without a DB connection |
| `ALLOWED_ORIGIN`  | No       | Comma-separated list of allowed CORS origins     |

## Database

The server connects to MongoDB via Mongoose using the `MONGO_URI` environment variable.

**Local MongoDB:**
```bash
# Start a local instance (requires MongoDB installed)
mongod --dbpath /data/db

# Or with Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

**MongoDB Atlas:**
```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/brln
```

The server will start even if the database is unreachable — a warning is logged and DB-dependent endpoints will fail at runtime.

## Install Dependencies

```bash
npm install
```

## Development

Runs with hot-reload via `ts-node-dev`:

```bash
npm run dev
```

## Build

Compiles TypeScript to `dist/`:

```bash
npm run build
```

## Production

Build first, then start:

```bash
npm run build
npm start
```

## Docker

```bash
# Build image
docker build -t brln-bff .

# Run container
docker run -p 3000:3000 --env-file .env brln-bff
```

## API Routes

| Method | Path      | Description         |
|--------|-----------|---------------------|
| GET    | `/health` | Health check        |
| *      | `/auth/*` | Authentication      |
| *      | `/user/*` | User operations     |
| *      | `/brln/*` | BRLN operations     |
| *      | `/admin/*`| Admin operations    |
| *      | `/dfns/*` | DFNS integration    |
