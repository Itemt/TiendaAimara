@echo off
setlocal enabledelayedexpansion
title Aimara POS - Generador de ejecutable Windows

echo.
echo ============================================================
echo   AIMARA POS  ^|  Build Windows EXE
echo ============================================================
echo.

REM ── Verificar Python ─────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en el PATH.
    echo         Descarga Python 3.11+ desde https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python encontrado:
python --version

echo.
echo [1/3] Instalando dependencias...
echo --------------------------------------------------------
pip install --upgrade pip >nul
pip install pyinstaller "reportlab>=4.0" "python-barcode[images]>=0.15" "Pillow>=10.0"
if errorlevel 1 (
    echo [ERROR] Fallo al instalar dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.

echo.
echo [2/3] Construyendo AimaraPos.exe (puede tardar 1-3 minutos)...
echo --------------------------------------------------------
if exist dist\AimaraPos.exe del /f dist\AimaraPos.exe
pyinstaller aimara_pos.spec --clean --noconfirm
if errorlevel 1 (
    echo.
    echo [ERROR] PyInstaller reporto un error. Revisa los mensajes anteriores.
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando resultado...
echo --------------------------------------------------------
if exist dist\AimaraPos.exe (
    for %%A in (dist\AimaraPos.exe) do set SIZE=%%~zA
    set /a SIZE_MB=!SIZE! / 1048576
    echo.
    echo ============================================================
    echo   BUILD EXITOSO
    echo ============================================================
    echo   Archivo : dist\AimaraPos.exe
    echo   Tamanio : ~!SIZE_MB! MB
    echo.
    echo   Para distribuir: copia dist\AimaraPos.exe a cualquier
    echo   PC con Windows. No requiere Python instalado.
    echo ============================================================
) else (
    echo [ERROR] No se encontro dist\AimaraPos.exe
    pause
    exit /b 1
)

echo.
echo ^>^> Abrir carpeta dist? (S/N)
set /p OPEN_FOLDER=
if /i "!OPEN_FOLDER!"=="S" explorer dist

pause
