import sys
import threading
import webbrowser
from pathlib import Path
from web_server import AimaraWebApp

def main():
    if getattr(sys, "frozen", False):
        resource_dir = Path(sys._MEIPASS)
    else:
        resource_dir = Path(__file__).resolve().parent

    web_root = resource_dir / "views" / "web"
    app = AimaraWebApp(web_root)

    server_thread = threading.Thread(target=app.run_server, daemon=True)
    server_thread.start()

    url = f"http://{app.host}:{app.port}/"
    print(f"Aimara POS iniciado en {url}")
    
    # Abrir en el navegador predeterminado
    webbrowser.open(url)

    # Mantener el proceso vivo para que el servidor siga corriendo
    print("Servidor ejecutándose. Presiona Ctrl+C en esta ventana para cerrar el sistema.")
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Cerrando servidor...")

if __name__ == "__main__":
    main()
