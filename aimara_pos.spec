# -*- mode: python ; coding: utf-8 -*-
#
# PyInstaller spec multiplataforma – Aimara POS
#   · Windows : dist/AimaraPos.exe  (onefile, con consola)
#   · macOS   : dist/AimaraPos.app  (bundle estándar, sin consola)
#
# Uso:
#   pyinstaller aimara_pos.spec --clean
#
# Dependencias previas:
#   pip install pyinstaller reportlab "python-barcode[images]" Pillow
#

import sys as _sys
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

IS_MAC = _sys.platform == "darwin"
block_cipher = None

# ── Submódulos dinámicos (reportlab y barcode los carga con __import__) ───────
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

extra_datas = collect_data_files("reportlab") + collect_data_files("barcode")

# ── Análisis del árbol de importaciones ──────────────────────────────────────
a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=[
        # Archivos web estáticos → quedan en _MEIPASS/views/web/
        ("views/web", "views/web"),
    ] + extra_datas,
    hiddenimports=hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["customtkinter", "tkinter", "_tkinter", "tcl", "tk"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ═══════════════════════════════════════════════════════════════════════════════
#  macOS → onedir + BUNDLE  →  AimaraPos.app  (arrastrar a /Applications)
# ═══════════════════════════════════════════════════════════════════════════════
if IS_MAC:
    exe = EXE(
        pyz,
        a.scripts,
        [],                     # binaries/datas van en COLLECT, no en el exe
        exclude_binaries=True,
        name="AimaraPos",
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=False,
        console=False,          # Sin ventana de terminal en macOS
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon=None,              # Agrega un .icns aquí si tienes icono
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=False,
        upx_exclude=[],
        name="AimaraPos",
    )
    app = BUNDLE(
        coll,
        name="AimaraPos.app",
        icon=None,
        bundle_identifier="com.tiendaaimara.pos",
        info_plist={
            "CFBundleName":             "Aimara POS",
            "CFBundleDisplayName":      "Aimara POS",
            "CFBundleShortVersionString": "1.3.0",
            "NSHighResolutionCapable":  True,
            "LSMinimumSystemVersion":   "12.0",
        },
    )

# ═══════════════════════════════════════════════════════════════════════════════
#  Windows → onefile  →  AimaraPos.exe  (un único archivo portable)
# ═══════════════════════════════════════════════════════════════════════════════
else:
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
        upx=False,              # UPX off: evita falsos positivos en antivirus
        upx_exclude=[],
        runtime_tmpdir=None,
        console=True,           # Muestra ventana con la URL del servidor
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon=None,              # Agrega un .ico aquí si tienes icono
    )
