# -*- mode: python ; coding: utf-8 -*-
#
# PyInstaller spec – Aimara POS
# Genera un único AimaraPos.exe para Windows x64.
#
# Para construir:
#   pyinstaller aimara_pos.spec --clean
#
# Requiere (ejecutar primero):
#   pip install pyinstaller reportlab "python-barcode[images]" Pillow
#

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

# ── Recolectar submódulos dinámicos de reportlab y python-barcode ─────────────
hidden = (
    collect_submodules("reportlab")
    + collect_submodules("barcode")
    + [
        "PIL._imaging",
        "PIL.Image",
        "PIL.ImageDraw",
        "PIL.ImageFont",
        "sqlite3",
        "http.server",
        "email.mime",
        "email.mime.text",
    ]
)

extra_datas = (
    collect_data_files("reportlab")
    + collect_data_files("barcode")
)

# ── Análisis del árbol de importaciones ──────────────────────────────────────
a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=[
        # Archivos web (HTML/CSS/JS) → se extraen en sys._MEIPASS/views/web/
        ("views/web", "views/web"),
    ] + extra_datas,
    hiddenimports=hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    # Excluir la interfaz de escritorio (customtkinter) que ya no se usa
    excludes=["customtkinter", "tkinter", "_tkinter", "tcl", "tk"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="AimaraPos",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    # UPX desactivado: evita falsos positivos en antivirus
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    # console=True → muestra la ventana de comandos con la URL del servidor
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # icon="assets/icon.ico",  # Descomenta y agrega tu .ico para personalizar
)
