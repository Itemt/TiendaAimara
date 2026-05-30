import sys
from pathlib import Path

from web_server import AimaraWebApp


def main():
    if getattr(sys, "frozen", False):
        # Ejecutable PyInstaller: archivos web extraídos en sys._MEIPASS
        resource_dir = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    else:
        resource_dir = Path(__file__).resolve().parent

    web_root = resource_dir / "views" / "web"
    app = AimaraWebApp(web_root)
    app.run()


if __name__ == "__main__":
    main()
