import "dotenv/config";
import { MRServer } from "./index.js";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { collectOptions } from "./src/utils/cli.js";

const ARGUMENTS = collectOptions(process.argv.slice(2), { valueOptions: [] });
const HTTP_SERVER = http.createServer();
const MIME_TYPES = new Map([
    ['.html', 'text/html'],
    ['.js', 'text/javascript'],
    ['.css', 'text/css'],
    ['.json', 'application/json'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpg'],
    ['.wav', 'audio/wav'],
    ['.svg', 'image/svg+xml'],
    ['.ico', 'image/x-icon'],
    ['.otf', 'font/otf'],
    ['.ttf', 'font/ttf'],
    ['.woff', 'font/woff'],
    ['.woff2', 'font/woff2'],
])

// Server Side
const server = new MRServer({
    db: process.env.DB_FILE || "./db.json",
    adminSecret: process.env.ADMIN_SECRET || "very_secret",
    randomIDs: (process.env.RAND_IDS === "true"),
    apiURL: process.env.API_ENDPOINT || "/api",
    server: HTTP_SERVER
});

// Client UI
if (ARGUMENTS.options.some(o => o.name === "client")) {
    HTTP_SERVER.on("request", async (req, res) => {
        if (req.url.startsWith(`${server.apiURL}/`) || req.url.startsWith("/socket.io/")) return;

        var filePath = './web' + req.url;
        if (filePath == './web/')
            filePath = './web/index.html';

        var extname = path.extname(filePath);
        var contentType = MIME_TYPES.get(extname) || 'text/plain';

        fs.readFile(filePath, function (error, content) {
            if (error) {
                if (error.code == 'ENOENT') {
                    fs.readFile('./404.html', function (error, content) {
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(content, 'utf-8');
                    });
                } else {
                    res.writeHead(500);
                    res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
                    res.end();
                }
            }
            else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });
}

const PORT = parseInt(ARGUMENTS.remainder[0]) || 4096;

console.log(`Starting on port ${PORT}...`);
await server.start(PORT);
console.log(`Done: http://localhost:${PORT}`);