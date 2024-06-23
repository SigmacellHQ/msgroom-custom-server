/*
################### Hate your life jar ###################
# Developers put an X when you feel like you want to die #
##########################################################
nolanwhy: XX
Kelbaz: X
*/
import express from "express";
import "dotenv/config"; // Automatically config process.env
import WebClient from "./Common/WebClient/main.js";
import API from "./Common/API.js";
console.log(process.env);

const app = express();

const PORT = 4096;

app.use('/', WebClient);
app.use('/api', API);

app.listen(PORT, async () => {
    console.log([
        `Started at http://localhost:${PORT}.`,
        "Thanks for using MRCS!",
        "",
    ].join("\n"));
});