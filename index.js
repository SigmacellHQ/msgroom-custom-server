import { createServer as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
    writeFileSync,
    readFileSync
} from "fs";

const http = HTTPServer();
const io = new SocketIOServer(http, {
    path: "/socket.io",
});

/**
 * Waits for a connection from a client
 */
io.on("connection", (socket) => {
    console.debug("Socket:", socket);

    /**
     * On message reception, handle it
     */
    socket.on("message", (msg) => {
        console.debug("Message received:", msg);
    });
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
            POST += chunk.toString();
        });
    }

    let params = url.split('?');
    if(params[1]) {
        url = params[0];
        GET = params[1];
    }

    if(url === "/socket.io/") {
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end();
        return;
    } else if(url === "/credits.html") {
        res.writeHead(200, { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" });
        res.end(`<a href='/'>< Back to MsgRoom</a>
<h1>Credits</h1>
<div style="display:flex;margin-top: 10px;"><img src="https://media.discordapp.net/attachments/1124689325330792550/1175570353582518413/gdcube.png?ex=656bb635&is=65594135&hm=e42fd7b5cbb76f7c878d7cbc4d09e5808728de4416b2b3f48f1b53c15dd7b41f&=" style="width: 130px;height: 130px;">
    <div style="margin-left: 10px;">
        <h1 style="margin: 0;">nolanwhy</h1>
        <p>owner of teh project and also did <strong>A LOT</strong></p>
        <div style="display:flex;">
            <a href="http://nolanwhy.github.io/w96-repo">Windows 96 Repo</a>
        </div>
    </div>
</div>
<div style="display:flex;margin-top: 10px;"><img src="/" style="width: 130px;height: 130px;">
    <div style="margin-left: 10px;">
        <h1 style="margin: 0;">Kelbaz</h1>
        <p>a cool guy that helped <strong>A LOT</strong></p>
    </div>
</div>`);
        return;
    }

    // Search for the requested path
    switch (fetchUrl) {
        case "/": {
            url = "/index.html";
            break;
        }
    }

    let file = null;
    try{ //                                          w96 utf reference :screm:
        file = await readFileSync("./web" + url, { encoding: 'utf-8' }); // todo: make it securer, people can do ../index.js
    } catch {
        // No need to do anything then
    }

    // Define default values
    let headers = {};
    let code = 200;
    let content = null;

    // Set Extension
    let extension = url.split('.')[url.split('.').length - 1];

    // Check if the file exists
    if(!file) {
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
        headers["Content-Type"] = "application/javascript";
    } else if(extension === "json") {
        headers["Content-Type"] = "text/json";
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
http.listen(PORT);
console.log(`Done: http://localhost:${PORT}`);