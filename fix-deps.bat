@echo off
echo === Hostel Leave QR - Dependency Fix Script ===
echo.

echo Step 1: Deleting node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo    Done.
) else (
    echo    node_modules not found, skipping.
)

echo Step 2: Deleting package-lock.json...
if exist package-lock.json (
    del /f package-lock.json
    echo    Done.
) else (
    echo    package-lock.json not found, skipping.
)

echo Step 3: Running npm install...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo Step 4: Testing npm run build...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: npm run build failed!
    pause
    exit /b 1
)

echo.
echo === All done! Dependencies fixed successfully. ===
echo You can now run: npm run dev
pause
