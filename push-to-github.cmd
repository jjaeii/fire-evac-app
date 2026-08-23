@echo off
chcp 65001 >nul
title fire-evac-app - GitHub push
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0.claude\push-to-github.ps1"
