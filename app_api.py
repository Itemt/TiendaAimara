import sys
from pathlib import Path

from models.database import init_db
from models.product import ProductModel
from models.return_model import ReturnModel
from models.sale import SaleModel
from models.user import UserModel
from utils.printer_manager import PrinterManager


class AimaraAPI:
    def __init__(self):
        init_db()
        self.user = None

    def _response(self, ok, message="", data=None):
        return {"ok": ok, "message": message, "data": data}

    def _require_login(self):
        if not self.user:
            return self._response(False, "Debes iniciar sesión primero.")
        return None

    def login(self, username, password=None):
        if isinstance(username, dict):
            payload = username
            username = payload.get("username", "")
            password = payload.get("password", "")
        user = UserModel.verify_login(username.strip(), password)
        if not user:
            return self._response(False, "Usuario o contraseña incorrectos.")
        self.user = user
        return self._response(True, "Sesión iniciada correctamente.", user)

    def logout(self):
        self.user = None
        return self._response(True, "Sesión cerrada.")

    def get_dashboard(self):
        protected = self._require_login()
        if protected:
            return protected

        stats = SaleModel.get_dashboard_stats()
        low_stock_products = [
            product
            for product in ProductModel.list_products()
            if int(product["stock"]) < 5
        ]
        low_stock_products = sorted(low_stock_products, key=lambda item: item["stock"])
        return self._response(
            True,
            data={
                "stats": stats,
                "low_stock_products": low_stock_products,
                "low_stock_count": len(low_stock_products),
                "user": self.user,
            },
        )

    def list_products(self, search_text=""):
        protected = self._require_login()
        if protected:
            return protected
        products = ProductModel.list_products(search_text.strip() or None)
        for product in products:
            product["low_stock"] = int(product["stock"]) < 5
        return self._response(True, data=products)

    def get_product(self, codigo):
        protected = self._require_login()
        if protected:
            return protected
        product = ProductModel.get_product_by_code(str(codigo).strip())
        if not product:
            return self._response(False, "Producto no encontrado.")
        product["low_stock"] = int(product["stock"]) < 5
        return self._response(True, data=product)

    def save_product(self, payload):
        protected = self._require_login()
        if protected:
            return protected

        codigo = str(payload.get("codigo", "")).strip()
        original_code = str(payload.get("original_code", "")).strip()
        nombre = str(payload.get("nombre", "")).strip()
        categoria = str(payload.get("categoria", "")).strip()
        talla = str(payload.get("talla", "")).strip()
        precio_text = str(payload.get("precio", "")).strip()
        stock_text = str(payload.get("stock", "")).strip()

        if not nombre or not precio_text or not stock_text:
            return self._response(False, "Nombre, precio y stock son obligatorios.")

        try:
            precio = float(precio_text)
            stock = int(stock_text)
        except ValueError:
            return self._response(False, "Precio debe ser decimal y stock entero.")

        if original_code:
            if not codigo:
                codigo = original_code
            if codigo != original_code:
                return self._response(
                    False, "No se permite cambiar el código de un producto existente."
                )
            success, message = ProductModel.update_product(
                codigo, nombre, categoria, talla, precio, stock
            )
            return self._response(success, message)

        if not codigo:
            codigo = ProductModel.next_product_code()

        existing = ProductModel.get_product_by_code(codigo)
        if existing:
            return self._response(False, f"El código {codigo} ya está en uso.")

        success, message = ProductModel.add_product(
            codigo, nombre, categoria, talla, precio, stock
        )
        return self._response(success, message, {"codigo": codigo} if success else None)

    def delete_product(self, codigo):
        protected = self._require_login()
        if protected:
            return protected
        return self._wrap_pair(ProductModel.delete_product(str(codigo).strip()))

    def next_product_code(self):
        protected = self._require_login()
        if protected:
            return protected
        return self._response(True, data={"codigo": ProductModel.next_product_code()})

    def get_sale_preview(self, cart_items):
        protected = self._require_login()
        if protected:
            return protected
        if isinstance(cart_items, dict):
            cart_items = cart_items.get("cart_items", [])
        lines = []
        total = 0.0
        low_stock_hits = []
        for item in cart_items:
            codigo = str(item.get("codigo", "")).strip()
            quantity = int(item.get("cantidad", 0))
            product = ProductModel.get_product_by_code(codigo)
            if not product:
                return self._response(False, f"El producto {codigo} no existe.")
            if quantity > int(product["stock"]):
                return self._response(
                    False, f"Stock insuficiente para {product['nombre']}."
                )
            subtotal = float(product["precio"]) * quantity
            total += subtotal
            lines.append(
                {
                    "codigo": codigo,
                    "nombre": product["nombre"],
                    "cantidad": quantity,
                    "precio": float(product["precio"]),
                    "subtotal": subtotal,
                }
            )
            if int(product["stock"]) < 5:
                low_stock_hits.append(
                    {
                        "codigo": codigo,
                        "nombre": product["nombre"],
                        "stock": int(product["stock"]),
                    }
                )
        return self._response(
            True,
            data={"items": lines, "total": total, "low_stock_hits": low_stock_hits},
        )

    def create_sale(self, cart_items):
        protected = self._require_login()
        if protected:
            return protected

        metodo_pago = "Efectivo"
        if isinstance(cart_items, dict):
            metodo_pago = str(cart_items.get("metodo_pago", "Efectivo")).strip() or "Efectivo"
            cart_items = cart_items.get("cart_items", [])

        METODOS_VALIDOS = {"Efectivo", "Datáfono", "Transferencia"}
        if metodo_pago not in METODOS_VALIDOS:
            metodo_pago = "Efectivo"

        prepared = []
        for item in cart_items:
            codigo = str(item.get("codigo", "")).strip()
            quantity = int(item.get("cantidad", 0))
            if quantity <= 0:
                return self._response(False, "La cantidad debe ser mayor a cero.")
            product = ProductModel.get_product_by_code(codigo)
            if not product:
                return self._response(False, f"El producto {codigo} no existe.")
            if quantity > int(product["stock"]):
                return self._response(
                    False, f"Stock insuficiente para {product['nombre']}."
                )
            prepared.append(
                {
                    "codigo": codigo,
                    "cantidad": quantity,
                    "subtotal": float(product["precio"]) * quantity,
                }
            )

        total = sum(item["subtotal"] for item in prepared)
        success, result = SaleModel.create_sale(prepared, total, metodo_pago)
        if not success:
            return self._response(False, result)

        ticket_id = result
        receipt_products = []
        for item in prepared:
            product = ProductModel.get_product_by_code(item["codigo"])
            receipt_products.append(
                {
                    "nombre": product["nombre"],
                    "cantidad": item["cantidad"],
                    "subtotal": item["subtotal"],
                }
            )
        PrinterManager.print_receipt(
            {"id_venta": ticket_id, "total": total, "metodo_pago": metodo_pago}, receipt_products
        )
        output_dir = self._get_web_output_dir()
        output_filename = str(output_dir / "receipt.pdf")
        PrinterManager.generate_receipt_pdf(
            {"id_venta": ticket_id, "total": total, "metodo_pago": metodo_pago}, receipt_products, output_filename
        )
        low_stock_hits = [
            product
            for product in ProductModel.list_products()
            if int(product["stock"]) < 5
        ]
        return self._response(
            True,
            "Venta confirmada.",
            {
                "id_venta": ticket_id,
                "total": total,
                "metodo_pago": metodo_pago,
                "low_stock_hits": low_stock_hits,
                "output": "/receipt.pdf",
            },
        )

    def get_sales(self):
        protected = self._require_login()
        if protected:
            return protected
        sales = SaleModel.get_sales_report()
        return self._response(True, data=sales)

    def get_sale_details(self, id_venta):
        protected = self._require_login()
        if protected:
            return protected
        details = SaleModel.get_sale_details(int(id_venta))
        if not details:
            return self._response(False, "No se encontraron detalles para esa venta.")
        return self._response(True, data=details)

    def replace_sale(self, id_venta, cart_items=None):
        protected = self._require_login()
        if protected:
            return protected

        if isinstance(id_venta, dict):
            payload = id_venta
            id_venta = int(payload.get("id_venta"))
            cart_items = payload.get("cart_items", [])

        if cart_items is None:
            cart_items = []

        prepared = []
        for item in cart_items:
            codigo = str(item.get("codigo", "")).strip()
            quantity = int(item.get("cantidad", 0))
            if quantity <= 0:
                return self._response(False, "La cantidad debe ser mayor a cero.")
            product = ProductModel.get_product_by_code(codigo)
            if not product:
                return self._response(False, f"El producto {codigo} no existe.")
            prepared.append(
                {
                    "codigo": codigo,
                    "cantidad": quantity,
                    "subtotal": float(product["precio"]) * quantity,
                }
            )

        total = sum(item["subtotal"] for item in prepared)
        success, result = SaleModel.replace_sale(int(id_venta), prepared, total)
        if not success:
            return self._response(False, result)
        return self._response(
            True,
            "Venta actualizada correctamente.",
            {"id_venta": int(id_venta), "total": total},
        )

    def delete_sale(self, id_venta):
        protected = self._require_login()
        if protected:
            return protected
        return self._wrap_pair(SaleModel.delete_sale(int(id_venta)))

    def get_return_ticket(self, id_venta):
        protected = self._require_login()
        if protected:
            return protected
        details = ReturnModel.get_sale_details(int(id_venta))
        if not details:
            return self._response(False, "No se encontraron detalles para ese ticket.")
        returned_quantities = ReturnModel.get_accepted_return_quantities(int(id_venta))
        # Contar cambios pendientes por código de producto
        pending_changes = ReturnModel.get_pending_changes(int(id_venta))
        pending_count_by_code = {}
        for p in pending_changes:
            code = p["codigo_producto"]
            pending_count_by_code[code] = pending_count_by_code.get(code, 0) + 1
        data = []
        for row in details:
            codigo = row[1]
            original_qty = int(row[6])
            already_returned = int(returned_quantities.get(codigo, 0))
            data.append(
                {
                    "id_detalle": row[0],
                    "codigo": codigo,
                    "nombre": row[2],
                    "categoria": row[3],
                    "talla": row[4],
                    "precio": row[5],
                    "cantidad": original_qty,
                    "subtotal": row[7],
                    "cantidad_devuelta": already_returned,
                    "cantidad_restante": max(original_qty - already_returned, 0),
                    "pending_count": pending_count_by_code.get(codigo, 0),
                }
            )
        return self._response(True, data=data)

    def process_return(self, payload):
        protected = self._require_login()
        if protected:
            return protected

        id_venta = int(payload.get("id_venta"))
        codigo_producto = str(payload.get("codigo_producto", "")).strip()
        cantidad = int(payload.get("cantidad", 0))
        motivo = str(payload.get("motivo", "")).strip()

        if cantidad <= 0:
            return self._response(
                False, "La cantidad a devolver debe ser mayor a cero."
            )
        if not motivo:
            return self._response(False, "El motivo de la devolución es obligatorio.")

        ticket = self.get_return_ticket(id_venta)
        if not ticket["ok"]:
            return ticket

        selected = None
        for row in ticket["data"]:
            if row["codigo"] == codigo_producto:
                selected = row
                break
        if not selected:
            return self._response(
                False, "El producto no pertenece a la venta seleccionada."
            )
        if cantidad > selected["cantidad_restante"]:
            return self._response(
                False, "La cantidad supera lo que todavía puede devolverse."
            )

        return self._wrap_pair(
            ReturnModel.process_return(id_venta, codigo_producto, cantidad, motivo)
        )

    def get_pending_changes(self, payload):
        """Devuelve las devoluciones con estado=PENDIENTE_CAMBIO de una venta."""
        protected = self._require_login()
        if protected:
            return protected
        id_venta = int(payload.get("id_venta", 0) if isinstance(payload, dict) else payload)
        pending = ReturnModel.get_pending_changes(id_venta)
        return self._response(True, data=pending)

    def complete_exchange(self, payload):
        """Completa un cambio pendiente: vincula devolución con el nuevo producto."""
        protected = self._require_login()
        if protected:
            return protected

        if not isinstance(payload, dict):
            return self._response(False, "Payload inválido.")

        id_devolucion = int(payload.get("id_devolucion", 0))
        new_codigo = str(payload.get("new_codigo", "")).strip()
        cantidad = payload.get("cantidad")
        if cantidad is not None:
            cantidad = int(cantidad)
        motivo = payload.get("motivo")

        if not id_devolucion or not new_codigo:
            return self._response(False, "id_devolucion y new_codigo son obligatorios.")

        success, message, new_total = ReturnModel.complete_exchange(
            id_devolucion, new_codigo, cantidad=cantidad, motivo=motivo
        )
        if not success:
            return self._response(False, message)

        # Regenerar PDF de factura actualizada
        try:
            id_venta = None  # se obtiene desde la tabla cambios
            from models.database import get_connection as _gc
            _conn = _gc()
            _cur = _conn.cursor()
            _cur.execute("SELECT id_venta FROM cambios WHERE id_devolucion = ? ORDER BY id_cambio DESC LIMIT 1", (id_devolucion,))
            _row = _cur.fetchone()
            _conn.close()
            if _row:
                id_venta = _row[0]
                details = SaleModel.get_sale_details(id_venta)
                receipt_products = [
                    {"nombre": item["nombre"], "cantidad": item["cantidad"], "subtotal": item["subtotal"]}
                    for item in details
                ]
                output_dir = self._get_web_output_dir()
                PrinterManager.generate_receipt_pdf(
                    {"id_venta": id_venta, "total": new_total}, receipt_products,
                    str(output_dir / "receipt.pdf")
                )
        except Exception:
            pass

        return self._response(True, message, {"new_total": new_total, "output": "/receipt.pdf"})

    def get_inventory_report(self):
        protected = self._require_login()
        if protected:
            return protected
        return self.list_products("")

    def get_low_stock_products(self):
        protected = self._require_login()
        if protected:
            return protected
        products = [
            product
            for product in ProductModel.list_products()
            if int(product["stock"]) < 5
        ]
        return self._response(True, data=products)

    def import_products(self, rows):
        protected = self._require_login()
        if protected:
            return protected

        added = 0
        updated = 0
        duplicates = 0
        for row in rows:
            codigo = str(row.get("codigo", "")).strip()
            nombre = str(row.get("nombre", "")).strip()
            categoria = str(row.get("categoria", "")).strip()
            talla = str(row.get("talla", "")).strip()
            precio = float(row.get("precio", 0) or 0)
            stock = int(row.get("stock", 0) or 0)

            if not codigo:
                codigo = ProductModel.next_product_code()
            existing = ProductModel.get_product_by_code(codigo)
            if existing:
                success, message = ProductModel.update_product(
                    codigo,
                    nombre or existing["nombre"],
                    categoria or existing["categoria"],
                    talla or existing["talla"],
                    precio if precio > 0 else existing["precio"],
                    stock,
                )
                if success:
                    updated += 1
                else:
                    duplicates += 1
            else:
                success, message = ProductModel.add_product(
                    codigo, nombre, categoria, talla, precio, stock
                )
                if success:
                    added += 1
                else:
                    duplicates += 1

        return self._response(
            True,
            f"Importación finalizada. Agregados: {added}, Actualizados: {updated}, Duplicados: {duplicates}",
            {"added": added, "updated": updated, "duplicates": duplicates},
        )

    def _get_web_output_dir(self) -> Path:
        """Directorio donde se guardan los PDFs generados para servir al navegador.
        En frozen usa sys._MEIPASS (donde están los archivos web).
        """
        if getattr(sys, "frozen", False):
            return Path(sys._MEIPASS) / "views" / "web"  # type: ignore[attr-defined]
        return Path(__file__).resolve().parent / "views" / "web"

    def generate_stickers(self, payload=None):
        protected = self._require_login()
        if protected:
            return protected

        codes = payload.get("codes") if isinstance(payload, dict) else None
        if codes:
            source = [
                p for p in (ProductModel.get_product_by_code(c) for c in codes) if p
            ]
        else:
            source = ProductModel.list_products()

        if not source:
            return self._response(False, "No hay productos para imprimir.")

        printable = [
            {
                "codigo": item["codigo"],
                "nombre": item["nombre"],
                "talla": item.get("talla") or "",
                "precio": item["precio"],
            }
            for item in source
        ]
        output_dir = self._get_web_output_dir()
        output_filename = str(output_dir / "stickers_a4.pdf")
        PrinterManager.generate_stickers_pdf(printable, output_filename)
        return self._response(
            True,
            f"PDF A4 listo ({len(printable)} etiquetas).",
            {"output": "/stickers_a4.pdf"},
        )

    def generate_thermal_stickers(self, payload=None):
        protected = self._require_login()
        if protected:
            return protected

        codes = payload.get("codes") if isinstance(payload, dict) else None
        if codes:
            source = [
                p for p in (ProductModel.get_product_by_code(c) for c in codes) if p
            ]
        else:
            source = ProductModel.list_products()

        if not source:
            return self._response(False, "No hay productos para imprimir.")

        printable = [
            {
                "codigo": item["codigo"],
                "nombre": item["nombre"],
                "talla": item.get("talla") or "",
                "precio": item["precio"],
            }
            for item in source
        ]
        output_dir = self._get_web_output_dir()
        output_filename = str(output_dir / "stickers_thermal.pdf")
        PrinterManager.generate_thermal_stickers_pdf(printable, output_filename)
        return self._response(
            True,
            f"PDF térmico listo ({len(printable)} etiquetas).",
            {"output": "/stickers_thermal.pdf"},
        )

    def get_barcode_base64(self, payload):
        import base64
        import barcode
        from barcode.writer import ImageWriter
        import io

        protected = self._require_login()
        if protected:
            return protected

        codigo = str(payload.get("codigo", "") if isinstance(payload, dict) else payload).strip()
        if not codigo:
            return self._response(False, "El código es obligatorio.")

        try:
            code128_cls = barcode.get_barcode_class("code128")
            hrn = code128_cls(codigo, writer=ImageWriter())
            fp = io.BytesIO()
            hrn.write(fp, options={
                "write_text": False,
                "module_width": 0.2,
                "module_height": 5.0,
                "quiet_zone": 1.0,
            })
            base64_data = base64.b64encode(fp.getvalue()).decode("utf-8")
            return self._response(True, data=f"data:image/png;base64,{base64_data}")
        except Exception as e:
            return self._response(False, str(e))

    def update_sale_item(self, payload):
        """
        Reemplaza un producto en una venta existente por otro:
        - Devuelve el viejo al stock
        - Descuenta el nuevo del stock
        - Actualiza detalles_venta
        - Recalcula el total de la venta
        - Regenera el PDF de la factura actualizada
        """
        protected = self._require_login()
        if protected:
            return protected

        if isinstance(payload, dict):
            id_venta = int(payload.get("id_venta", 0))
            old_codigo = str(payload.get("old_codigo", "")).strip()
            new_codigo = str(payload.get("new_codigo", "")).strip()
            cantidad = int(payload.get("cantidad", 1))
            motivo = str(payload.get("motivo", "Cambio de producto")).strip()
        else:
            return self._response(False, "Payload inválido.")

        if not id_venta or not old_codigo or not new_codigo:
            return self._response(False, "id_venta, old_codigo y new_codigo son obligatorios.")

        if old_codigo == new_codigo:
            return self._response(False, "El producto nuevo debe ser diferente al actual.")

        success, message, new_total = ReturnModel.update_sale_item(
            id_venta, old_codigo, new_codigo, cantidad, motivo
        )
        if not success:
            return self._response(False, message)

        # Regenerar el PDF de factura con los datos actualizados
        try:
            details = SaleModel.get_sale_details(id_venta)
            receipt_products = [
                {
                    "nombre": item["nombre"],
                    "cantidad": item["cantidad"],
                    "subtotal": item["subtotal"],
                }
                for item in details
            ]
            output_dir = self._get_web_output_dir()
            output_filename = str(output_dir / "receipt.pdf")
            PrinterManager.generate_receipt_pdf(
                {"id_venta": id_venta, "total": new_total}, receipt_products, output_filename
            )
        except Exception:
            pass  # No bloquear si falla la regeneración del PDF

        return self._response(
            True,
            message,
            {
                "id_venta": id_venta,
                "new_total": new_total,
                "output": "/receipt.pdf",
                "receipt_items": [
                    {
                        "nombre": item["nombre"],
                        "cantidad": item["cantidad"],
                        "precio": item["precio"],
                        "subtotal": item["subtotal"],
                    }
                    for item in SaleModel.get_sale_details(id_venta)
                ],
            },
        )

    def reprint_sale(self, id_venta):
        protected = self._require_login()
        if protected:
            return protected
        details = SaleModel.get_sale_details(int(id_venta))
        if not details:
            return self._response(False, "La venta no existe.")
        receipt_products = [
            {
                "nombre": item["nombre"],
                "cantidad": item["cantidad"],
                "subtotal": item["subtotal"],
            }
            for item in details
        ]
        total = sum(item["subtotal"] for item in receipt_products)
        PrinterManager.print_receipt(
            {"id_venta": int(id_venta), "total": total}, receipt_products
        )
        output_dir = self._get_web_output_dir()
        output_filename = str(output_dir / "receipt.pdf")
        PrinterManager.generate_receipt_pdf(
            {"id_venta": int(id_venta), "total": total}, receipt_products, output_filename
        )
        return self._response(
            True,
            f"Factura #{id_venta} generada.",
            {"id_venta": int(id_venta), "total": total, "output": "/receipt.pdf"},
        )

    def get_users(self):
        protected = self._require_login()
        if protected:
            return protected
        if self.user["rol"] != "admin":
            return self._response(False, "Acceso denegado. Solo administradores.")
        return self._response(True, data=UserModel.list_users())

    def save_user(self, payload):
        protected = self._require_login()
        if protected:
            return protected
        if self.user["rol"] != "admin":
            return self._response(False, "Acceso denegado. Solo administradores.")

        user_id = payload.get("id")
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()
        rol = str(payload.get("rol", "")).strip()

        if not username or not rol:
            return self._response(False, "Usuario y rol son obligatorios.")

        if user_id:
            return self._wrap_pair(
                UserModel.update_user(user_id, username, password, rol)
            )
        else:
            if not password:
                return self._response(
                    False, "La contraseña es obligatoria para nuevos usuarios."
                )
            return self._wrap_pair(UserModel.add_user(username, password, rol))

    def delete_user(self, user_id):
        protected = self._require_login()
        if protected:
            return protected
        if self.user["rol"] != "admin":
            return self._response(False, "Acceso denegado. Solo administradores.")
        return self._wrap_pair(UserModel.delete_user(int(user_id)))

    def reset_database(self):
        protected = self._require_login()
        if protected:
            return protected
        if self.user["rol"] != "admin":
            return self._response(False, "Acceso denegado. Solo administradores.")
        try:
            from models.database import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys = OFF")
            cursor.execute("DELETE FROM cambios")
            cursor.execute("DELETE FROM devoluciones")
            cursor.execute("DELETE FROM detalles_venta")
            cursor.execute("DELETE FROM ventas")
            cursor.execute("DELETE FROM productos")
            cursor.execute(
                "DELETE FROM sqlite_sequence WHERE name IN ('ventas', 'detalles_venta', 'devoluciones', 'cambios', 'productos')"
            )
            cursor.execute("PRAGMA foreign_keys = ON")
            conn.commit()
            conn.close()
            return self._response(True, "La base de datos se ha vaciado con éxito.")
        except Exception as e:
            return self._response(False, f"Error al restablecer la base de datos: {e}")

    def _wrap_pair(self, pair):
        success, message = pair
        return self._response(success, message)

