import json
import mimetypes
import socket
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from app_api import AimaraAPI


class AimaraRequestHandler(BaseHTTPRequestHandler):
    api = None
    root_dir = None

    def log_message(self, format, *args):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/":
            path = "/index.html"

        if path.startswith("/api/"):
            self._send_json(
                {"ok": False, "message": "Use POST for API calls."},
                status=HTTPStatus.METHOD_NOT_ALLOWED,
            )
            return

        file_path = (self.root_dir / path.lstrip("/")).resolve()
        if (
            not str(file_path).startswith(str(self.root_dir.resolve()))
            or not file_path.exists()
            or not file_path.is_file()
        ):
            self._send_plain("Not found", status=HTTPStatus.NOT_FOUND)
            return

        content_type, _ = mimetypes.guess_type(str(file_path))
        content_type = content_type or "application/octet-stream"
        with open(file_path, "rb") as file_handle:
            content = file_handle.read()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        parsed = urlparse(self.path)
        route = parsed.path.replace("/api/", "", 1)
        if route.startswith("_"):
            self._send_json(
                {"ok": False, "message": "Ruta no permitida."},
                status=HTTPStatus.FORBIDDEN,
            )
            return
        payload = self._read_json()

        if not hasattr(self.api, route):
            self._send_json(
                {"ok": False, "message": f"Ruta desconocida: {route}"},
                status=HTTPStatus.NOT_FOUND,
            )
            return

        handler = getattr(self.api, route)
        try:
            if route in {
                "login",
                "save_product",
                "create_sale",
                "replace_sale",
                "process_return",
                "import_products",
                "get_sale_preview",
                "save_user",
                "generate_stickers",
                "generate_thermal_stickers",
            }:
                result = handler(payload)
            elif route in {"list_products"}:
                val = (
                    payload.get("search_text", "") if isinstance(payload, dict) else ""
                )
                result = handler(val)
            elif route in {
                "get_product",
                "delete_product",
                "delete_sale",
                "reprint_sale",
            }:
                val = (
                    payload.get("codigo") or payload.get("id_venta")
                    if isinstance(payload, dict)
                    else payload
                )
                result = handler(val)
            elif route in {"get_sale_details", "get_return_ticket"}:
                val = payload.get("id_venta") if isinstance(payload, dict) else payload
                result = handler(val)
            elif route in {"delete_user"}:
                val = payload.get("id") if isinstance(payload, dict) else payload
                result = handler(val)
            elif route in {
                "get_dashboard",
                "get_sales",
                "get_inventory_report",
                "get_low_stock_products",
                "next_product_code",
                "logout",
                "get_users",
            }:
                result = handler()
            else:
                result = handler(payload)
        except Exception as exc:
            self._send_json(
                {"ok": False, "message": str(exc)},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return

        self._send_json(result)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return {}

    def _send_json(self, payload, status=HTTPStatus.OK):
        raw = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _send_plain(self, text, status=HTTPStatus.OK):
        raw = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


class AimaraWebApp:
    def __init__(self, root_dir, host="127.0.0.1", port=8765):
        self.root_dir = Path(root_dir)
        self.host = host
        self.port = self._find_available_port(port)
        self.api = AimaraAPI()
        AimaraRequestHandler.api = self.api
        AimaraRequestHandler.root_dir = self.root_dir
        self.server = ThreadingHTTPServer((self.host, self.port), AimaraRequestHandler)

    def _find_available_port(self, preferred_port):
        for candidate in range(preferred_port, preferred_port + 25):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as test_socket:
                test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                try:
                    test_socket.bind((self.host, candidate))
                except OSError:
                    continue
                return candidate
        raise OSError(
            f"No se encontró un puerto libre desde {preferred_port} en adelante."
        )

    def run(self):
        url = f"http://{self.host}:{self.port}/"
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
        print(f"Aimara POS disponible en {url}")
        try:
            self.server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            self.server.server_close()
