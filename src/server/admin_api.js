const API_URL = process.env.API_ENDPOINT ?? "/api";
import * as fs from "node:fs";

/** @type {{ url: string, method: string, needsAuth: boolean | undefined, handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => Promise<any> }[]} */
const API_ENDPOINTS = [
    {
        url: "/ping",
        method: "GET",

        async handler(req, res) {
            return ({
                pong: Date.now()
            });
        }
    },
    {
        url: "/keys/list",
        needsAuth: true,
        method: "GET",

        async handler(req, res) {
            const keys = JSON.parse((fs.readFileSync("./src/database/admins.json")).toString());

            return ({
                keys
            })
        }
    },
    {
        url: "/keys/add",
        needsAuth: true,
        method: "POST",

        async handler(req, res) {
            const keys = JSON.parse((fs.readFileSync("./src/database/admins.json")).toString());
            const success = true;
            req.on("data", (data) => {
                const json = JSON.parse(data.toString());
                if (!json.key) {
                    success = false;
                    return;
                }


                keys[json.key] = [];

                fs.writeFileSync("./src/database/admins.json", JSON.stringify(keys));
            });

            return ({
                success
            });
        }
    }
]

function isAllowed(req) {
    // Check if Authorization header is present and valid

    const secret = process.env.ADMIN_SECRET;
    const authHeader = req.headers.authorization;

    if (!authHeader || (authHeader !== `Bearer ${secret}`)) {
        return false;
    }

    return true;
}

function handleAuth(req, res) {
    if (!isAllowed(req)) {
        res.writeHead(401);

        res.end(JSON.stringify({
            error: "Unauthorized",
            code: 401
        }));

        return true;
    }

    return false;
}

/**
 * The handle for the admin api
 * @param {import("node:http").Server} http
 */
export function handle(http) {
    http.on("request", async (req, res) => {
        if (!req.url.startsWith(`${API_URL}/`)) return;

        const fetchURL = req.url.slice(API_URL.length);
        const endpoint = API_ENDPOINTS.find(e => e.url === fetchURL && e.method === req.method);

        if (!endpoint) {
            res.writeHead(404);
            res.end(JSON.stringify({
                error: "Endpoint not found",
                code: 404
            }));
            return;
        }

        res.setHeader("Content-Type", "application/json");

        if (endpoint.needsAuth && handleAuth(req, res)) return;

        const data = await endpoint.handler(req, res);
        if (res.closed) return;
        res.end(JSON.stringify(data));
    });
}