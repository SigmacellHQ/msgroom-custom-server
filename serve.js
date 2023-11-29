import "dotenv/config";
import { MRServer } from "./index.js";

const server = new MRServer({
    db: process.env.DB_FILE || "./db.json",
    adminSecret: process.env.ADMIN_SECRET || "very_secret",
    randomIDs: (process.env.RAND_IDS === "true"),
    apiURL: process.env.API_ENDPOINT || "/api"
});

const PORT = process.argv[2] ? parseInt(process.argv[2]) : 4096;

console.log(`Starting on port ${PORT}...`);
await server.start(PORT);
console.log(`Done: http://localhost:${PORT}`);