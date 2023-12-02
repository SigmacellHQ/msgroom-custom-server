@echo off
:loop
npm run serve 4096 -- --client
goto loop