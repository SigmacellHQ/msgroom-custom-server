// NEW VERSION
import { MRServer, MRClient } from "./src/index.js";

const server = new MRServer({
    db: "./db.json",
});

await server.start(PORT);