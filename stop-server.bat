@echo off
title Dong Server Trello (Khu loi EADDRINUSE)
echo Đang tim va tat Server Trello bi treo (Port 3000)...
echo.

:: Tim cac Process ID dang chay cong 3000 va tat chung
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Đã don vung thanh cong! Bay gio ban co the bat lai Start Server.bat.
echo (Ban co the an dau X hoac phim bat ky de dong cua so nay)
pause >nul
