import { MRServer } from "./index.js";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { collectOptions } from "./src/utils/cli.js";

const ARGUMENTS = collectOptions(process.argv.slice(2), { valueOptions: [
    "db-file",
    "admin-secret",
    "api-url",
] });
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
    db: ARGUMENTS.options.find(o => o.name === "db-file")?.value || "./db.json",
    adminSecret: ARGUMENTS.options.find(o => o.name === "admin-secret")?.value || "very_secret",
    randomIDs: (ARGUMENTS.options.some(o => o.name === "random-ids")),
    apiURL: ARGUMENTS.options.find(o => o.name === "api-url")?.value || "/api",
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
                } else if (error.code == 'EISDIR') {
                    res.writeHead(500);
                    res.end('Sorry, please visit /index.html or any other file. (This is a directory)');
                    res.end();
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