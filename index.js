import { createServer as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
    writeFileSync,
    readFileSync,
    existsSync,
} from "fs";

const http = HTTPServer();
const io = new SocketIOServer(http, {
    path: "/socket.io",
});

/** @type {Map<string, {socket: Socket[], data: {}}>} Stores connected users */
let users = new Map();

/**
 * Waits for a connection from a client
 */
io.on("connection", (socket) => {
    users.set(socket);

    io.emit("user-join", {"username": null});

    /**
     * On message reception, handle it
     */
    socket.on("nick-changed", (username) => {
        if(username.length < 1 || username.length > 18) {
            socket.emit("nick-changed", false);
        } else {
            socket.emit("nick-changed", true);
        }
    });

    setInterval(() => {
        socket.emit("message", {
            user: 'test',
            content: 'OMG',
            flags: [
                "staff"
            ]
        });
    }, 1000);

    socket.on("disconnect", () => {
        users.delete(socket);

        io.emit("user-left", {
            
        })
    })
});

/**
 * On http request on port chosen
 */
http.on("request", async(req, res) => {
    let fetchUrl = req.url;
    let url = fetchUrl;
    let GET = null;
    let POST = null;

    if(req.method === "POST") {
        req.on('data', (chunk) => {
            POST += chunk.toString(); //TODO: fix since this goofy ahh stackoverflow code doesnt work
        });
    }

    let params = url.split('?');
    if(params[1]) {
        url = params[0];
        GET = params[1];
    }

    if(GET) {
        let pairs = GET.split("&");
        let obj = {};
        pairs.forEach(pair => {
            let value = pair.split("=");
            obj[value[0]] = value[1] || '';
        });
        GET = obj;
    }

    let continueHttp = true;
    if(url === "/socket.io/") {
        continueHttp = false;
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end();
        return;
    } else if(url === "/credits.html") {
        continueHttp = false;
        let content = await readFileSync("./credits.html");
        res.writeHead(200, { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" });
        res.end(content);
        return;
    }

    if(continueHttp) {
        // Search for the requested path
        switch (url) {
            case "/": {
                url = "/index.html";
                break;
            }
        }

        let errored = false;
        let file = null; // do something so its empty, but still says that theres something

        
        try{
            errored = false;
            file = readFileSync("./web" + url, { encoding: 'utf-8' }); // todo: make it securer, people can do ../index.js
        } catch {
            errored = true;
            file = null;
        }

        // Define default values
        let headers = {};
        let code = 200;
        let content = null;

        // Set Extension
        let extension = url.split('.')[url.split('.').length - 1];

        // Check if the file exists
        if(!file && errored) {
            code = 404;
            content = getHttpError(404);
            extension = "html";
        } else {
            content = file;
        }

        // Define Headers
        if(extension === "html" || extension === "htm") {
            headers["Content-Type"] = "text/html";
        } else if(extension === "css") {
            headers["Content-Type"] = "text/css";
        } else if(extension === "js") {
            headers["Content-Type"] = "text/javascript";
        } else if(extension === "json") {
            headers["Content-Type"] = "application/json";
        } else if(extension === "woff") {
            headers["Content-Type"] = "font/woff";
        } else if(extension === "woff2") {
            headers["Content-Type"] = "font/woff2";
        } else {
            headers["Content-Type"] = "text/plain";
        }
        headers["Access-Control-Allow-Origin"] = "*";

        // Return the value
        try{
            res.writeHead(code, undefined, headers);
            res.end(content);
        } catch (e) {
            console.error(e);
        }
    }
});

function getHttpError(code) {
switch (code) {
    case 404:
        return "<center><h1>404 Not Found</h1><p>The file was not found.</p><hr><p>MsgRoom Custom Server - <a href='/credits.html'>Credits</a></p></center>";
    case 403:
        return "<center><h1>403 Forbidden</h1><p>You are not allowed here.</p><hr><p>MsgRoom Custom Server - <a href='/credits.html'>Credits</a></p></center>";
    default:
        return "<center><h1>500 Internal Server Error</h1><p>Server occurred a problem.</p><hr><p>MsgRoom Custom Server - <a href='/credits.html'>Credits</a></p></center>";
}
}

const args = process.argv;
const PORT = parseInt(args[2]) || 3030; // 0: node, 1: index.js, 2: port

console.debug("Arguments:", args);

console.log(`Starting on port ${PORT}...`);
let started = false;
try{
    http.listen(PORT);
    started = true;
} catch(e) {
    started = false;
    console.error(e);
}
if(started) {
    console.log(`Done: http://localhost:${PORT}`);
}