@echo off
chcp 65001 >nul
title fire-evac-app - allow phone access
echo.
echo  Opening Windows Firewall so a phone on the SAME Wi-Fi can reach this app.
echo    ports : 8443 (https) and 8123 (http)
echo    scope : local subnet only - NOT exposed to the internet
echo.
echo  A Windows admin prompt will appear. Choose Yes.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0.claude\allow-phone-access.ps1"
