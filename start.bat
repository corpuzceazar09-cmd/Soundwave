@echo off
title Soundwave Platform Launcher
cls
echo ============================================
echo       SOUNDWAVE PLATFORM LAUNCHER
echo ============================================
echo.
echo   Select a machine to start:
echo.
echo   [1] Admin Portal     (Soundwave\Admin\)
echo   [2] Editor Web App   (Soundwave\Editor\)
echo   [3] Public User      (Soundwave\PublicUser\)
echo   [4] Start ALL machines
echo   [5] Exit
echo.
echo   NOTE: Admin=port 8081, Editor=port 8080, PublicUser=port 8082
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" goto admin
if "%choice%"=="2" goto editor
if "%choice%"=="3" goto public
if "%choice%"=="4" goto all
if "%choice%"=="5" goto end
goto invalid

:admin
call "%~dp0Soundwave\Admin\start.bat"
goto end

:editor
call "%~dp0Soundwave\Editor\start.bat"
goto end

:public
call "%~dp0Soundwave\PublicUser\start.bat"
goto end

:all
cls
echo ============================================
echo   STARTING ALL MACHINES
echo ============================================
echo.
start "Admin" cmd /k "call "%~dp0Soundwave\Admin\start.bat""
start "Editor" cmd /k "call "%~dp0Soundwave\Editor\start.bat""
start "PublicUser" cmd /k "call "%~dp0Soundwave\PublicUser\start.bat""
echo.
echo All machines launched in separate windows.
echo.
echo   Admin:     http://localhost:8081/(admin)
echo   Editor:    http://localhost:8080
echo   User:      http://localhost:8082/
echo.
pause
goto end

:invalid
cls
echo.
echo Invalid choice. Please enter 1 through 5.
echo.
pause
goto start

:end
echo.
pause
