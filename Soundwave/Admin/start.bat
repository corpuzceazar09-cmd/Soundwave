@echo off
title Soundwave Admin Portal
cd /d "%~dp0"
set PORT=8081
node server.js
pause
