import sys
import threading
from pathlib import Path

import webview
from web_server import AimaraWebApp


def main():
    if getattr(sys, "frozen", False):
        # Ejecutable PyInstaller: archivos web extraídos en sys._MEIPASS
        resource_dir = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    else:
        resource_dir = Path(__file__).resolve().parent

    web_root = resource_dir / "views" / "web"
    app = AimaraWebApp(web_root)

    # Iniciar servidor local en un hilo en segundo plano
    server_thread = threading.Thread(target=app.run_server, daemon=True)
    server_thread.start()

    url = f"http://{app.host}:{app.port}/"
    print(f"Aimara POS iniciado en {url}")

    # Iniciar la ventana nativa ligera (pywebview)
    webview.create_window(
        "Tienda Aimara POS",
        url,
        width=1280,
        height=800,
        min_size=(1024, 768)
    )
    webview.start()


if __name__ == "__main__":
    main()
