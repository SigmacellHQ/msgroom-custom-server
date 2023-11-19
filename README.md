# MsgRoom Custom Server
## A custom Windows 96 MsgRoom Server
# WARNING:
PLEASE DO NOT USE THIS <strong>YET</strong>!!! a lot is different from normal msgroom, so your bots will probably not work with it.<br>
Made by [nolanwhy](https://github.com/nolanwhy) and [Kelbaz](https://github.com/kelbazz)<br>
Please don't tell us that the code is bad, we will ignore you anyways.
### Step 1: Download the package
Just click on Code then Download ZIP, you normally should already know that,<br>
if you didn't, why are you here?
### Step 2: Download dependencies
Open a terminal in the folder, and run ```npm i```<br>
### Step 3: Run the package
If you want the default port (3030), on your terminal, run ```node index.js```<br>
If you want a custom port, on your terminal, run ```node index.js (YOUR PORT HERE)```
### (Optional) Step 4: Share with friends
If you want to share with friends, we recommand ngrok, on your terminal, run ```ngrok http 3030```<br>
Or if you did a custom port, run ```ngrok http (YOUR PORT HERE)```<br>
You also need an ngrok account, setup ngrok [here](https://ngrok.com/)
### Done!
You successfully installed MsgRoom Custom Server!<br>
On the terminal, you should see the Arguments, and the url to visit your custom server.<br>
**Thank you for using our custom server!**
## How to give yourself staff, and do mod actions
Go in database/admins.json and add your ID.<br>
Then you can execute /a help to get every admin command.<br>
To ban, use /a ban or put the user's id in database/banned.json<br>
To kick, use /a disconnect.<br>
(Note: **THIS WILL BE CHANGED SOON TO SOMETHING ELSE**)