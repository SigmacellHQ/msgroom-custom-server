# MsgRoom Custom Server (VERSION 2 BETA)

WARNING! This is the complete rewrite of MRCS, called MRCSv2.<br>
For production, use the latest MRCSv1 release and wait for the first release of MRCSv2.<br><br>
This README.md file contents after these messages will probably be outdated and will be replaced soon.<br>

A custom Windows 96 MsgRoom Server.<br>

Made by [nolanwhy](https://github.com/nolanwhy) and [Kelbaz](https://github.com/kelbazz). Feel free to make pull requests!

## How to use
```sh
# Step 1: Clone the repository
git clone https://github.com/SigmacellHQ/msgroom-custom-server.git

# Step 2: Go to the folder
cd msgroom-custom-server

# Step 3: Install dependencies
npm install

# Step 4: Run the server
#:           <PORT>   <CLIENT UI>
npm run serve 4096 -- --client

# Step 5: Share with friends (optional)
#:        <PORT>
ngrok http 4096 # (*)
```
> (*): You need an ngrok account, which you can set up [here](https://ngrok.com/).

### Done!
You successfully installed MsgRoom Custom Server!<br>
On the terminal, you should see the Arguments, and the url to visit your custom server.

***Thank you for using our custom server! ❤***

## CLI Options
- `--client`: Starts the client ui server
- `--db-file <PATH>`: Sets the path to the JSON db file
- `--admin-secret <SECRET>`: Sets the admin secret
- `--random-ids`: Randomizes user ids
- `--api-url <URL>`: Sets the api endpoint
- `--require-loginkeys`: Requires login keys to connect
- `--enable-automod`: Enables the AutoMod bot
- `--ratelimit <limit>`: Sets the message rate limit
- `--user-limit <limit>`: Sets the user limit (alt accounts)
- `--user-knowblocks`: Makes users able to see when they're blocked
- `--enable-channels`: Enables channels

## How to add bots
This is up to the bot api owner to add, but if its like msgroom-orm, here's how to do it \
Your client should look like:
```js
const client = new Client("TestBot", [ "!" ]);
```
Now, it's really easy, just add a new argument to Client with an object containing the arguments \
If you don't understand anything, just do it like this:
```js
//                                                             <DOMAIN>   <PORT>
const client = new Client("TestBot", [ "!" ], { server: "wss://example.com:4096" });
```
**Congrats! 🎉** Your bot should now work with MRCS!

## How to give yourself staff and perform mod actions
1. Go to .env and edit the ADMIN_SECRET value
2. Go to /admin and put the admin secret
3. Follow instructions

### Alternative
1. Go to your db file (`db.json` by default) and add your ID.
2. You can execute `/a help` to get a list of every admin command.
3. To ban a user, use `/a ban` or add the user's ID to `database/banned.json`.
4. To kick a user, use `/a disconnect`.

## How to give yourself staff, and do mod actions
Go to your db file (`db.json` by default) and add your key and ID. \
Then you can execute /a help to get every admin command. \
To ban, use /a ban or put the user's id in database/banned.json \
To kick, use /a disconnect.
