# MsgRoom Custom Server

A custom Windows 96 MsgRoom Server

Made by [nolanwhy](https://github.com/nolanwhy) and [Kelbaz](https://github.com/kelbazz). Feel free to make pull requests!

## Step 1: Download the package

Just click on "Code" then "Download ZIP". If you don't know how to do this, why are you here?

## Step 2: Download dependencies

Open a terminal in the folder and run `npm install`.

## Step 3: Run the package

Execute `npm run start` in your terminal.

### Step 1: Download the package
Just click on Code then Download ZIP, you normally should already know that,<br>
if you didn't, why are you here?
### Step 2: Download dependencies
Open a terminal in the folder, and run ```npm i```<br>
### Step 3: Run the package
If you want the default port (3030), on your terminal, run ```node index.js```<br>
If you want a custom port, on your terminal, run ```node index.js (YOUR PORT HERE)```
### (Optional) Step 4: Share with friends
If you want to share with friends, we recommend using ngrok:
- Run `ngrok http 3030` in your terminal if you want to use the default port.
- Run `ngrok http (YOUR PORT HERE)` in your terminal if you have a custom port.
- You also need an ngrok account, which you can set up [here](https://ngrok.com/).
## Done!
You have successfully installed MsgRoom Custom Server! The terminal will display the URL to visit your custom server.
If you want to share with friends, we recommand ngrok, on your terminal, run ```ngrok http 3030```<br>
Or if you did a custom port, run ```ngrok http (YOUR PORT HERE)```<br>
You also need an ngrok account, setup ngrok [here](https://ngrok.com/)
### Done!
You successfully installed MsgRoom Custom Server!<br>
On the terminal, you should see the Arguments, and the url to visit your custom server.<br>
**Thank you for using our custom server!**
## How to add bots
*Note: this is temporary, a special MRCSAPI will release soon.*
The bot owner needs to make some adjustments, but here's how: \
Go to the source code of the library you want to use, then try finding `io()` or `socket()`. \
When you found it, it should be like `io(URL)`. \
Change it to: `io("http://yourURL.real:port", { transports: ['websocket'] })` \
If the port is 80, don't put `:port`, if you have https, put https, its easy.
**Congrats! 🎉** You successfully made your lib work with MRCS.
## How to give yourself staff and perform mod actions
1. Go to .env and edit the ADMIN_SECRET value
2. Go to /admin and put the admin secret
3. Follow instructions
### Alternative
1. Go to `database/admins.json` and add your ID.
2. You can execute `/a help` to get a list of every admin command.
3. To ban a user, use `/a ban` or add the user's ID to `database/banned.json`.
4. To kick a user, use `/a disconnect`.
## How to give yourself staff, and do mod actions
Go in database/admins.json and add your key and ID.<br>
Then you can execute /a help to get every admin command.<br>
To ban, use /a ban or put the user's id in database/banned.json<br>
To kick, use /a disconnect.<br>
