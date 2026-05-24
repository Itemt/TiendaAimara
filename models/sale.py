from models.database import get_connection


class SaleModel:
    @staticmethod
    def _rows_to_items(rows):
        return [
            {
                "codigo": row[0],
                "nombre": row[1],
                "categoria": row[2],
                "talla": row[3],
                "precio": row[4],
                "stock": row[5],
                "cantidad": row[6],
                "subtotal": row[7],
            }
            for row in rows
        ]

    @staticmethod
    def create_sale(cart_items, total):
        """
        cart_items: list of dicts {"codigo", "cantidad", "subtotal"}
        Returns id_venta if success
        """
        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 1. Insertar Venta
            cursor.execute("INSERT INTO ventas (total) VALUES (?)", (total,))
            id_venta = cursor.lastrowid

            # 2. Insertar Detalles y Descontar Stock
            for item in cart_items:
                cursor.execute(
                    """
                    INSERT INTO detalles_venta (id_venta, codigo_producto, cantidad, subtotal)
                    VALUES (?, ?, ?, ?)
                """,
                    (id_venta, item["codigo"], item["cantidad"], item["subtotal"]),
                )

                # Descontar stock
                cursor.execute(
                    """
                    UPDATE productos SET stock = stock - ? WHERE codigo = ?
                """,
                    (item["cantidad"], item["codigo"]),
                )

            conn.commit()
            return True, id_venta
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def get_sale_details(id_venta):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT dv.codigo_producto AS codigo, 
                   COALESCE(p.nombre, 'Producto sin stock/registro (' || dv.codigo_producto || ')') AS nombre, 
                   COALESCE(p.categoria, '') AS categoria, 
                   COALESCE(p.talla, '') AS talla, 
                   COALESCE(p.precio, (dv.subtotal / dv.cantidad)) AS precio, 
                   COALESCE(p.stock, 0) AS stock, 
                   dv.cantidad, 
                   dv.subtotal
            FROM detalles_venta dv
            LEFT JOIN productos p ON p.codigo = dv.codigo_producto
            WHERE dv.id_venta = ?
            ORDER BY nombre ASC
            """,
            (id_venta,),
        )
        rows = cursor.fetchall()
        conn.close()
        return SaleModel._rows_to_items(rows)

    @staticmethod
    def replace_sale(id_venta, cart_items, total):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT codigo_producto, cantidad FROM detalles_venta WHERE id_venta = ?",
                (id_venta,),
            )
            original_items = cursor.fetchall()
            for codigo_producto, cantidad in original_items:
                cursor.execute(
                    "UPDATE productos SET stock = stock + ? WHERE codigo = ?",
                    (cantidad, codigo_producto),
                )

            cursor.execute("DELETE FROM detalles_venta WHERE id_venta = ?", (id_venta,))
            cursor.execute(
                "UPDATE ventas SET total = ? WHERE id_venta = ?", (total, id_venta)
            )

            for item in cart_items:
                cursor.execute(
                    """
                    INSERT INTO detalles_venta (id_venta, codigo_producto, cantidad, subtotal)
                    VALUES (?, ?, ?, ?)
                    """,
                    (id_venta, item["codigo"], item["cantidad"], item["subtotal"]),
                )
                cursor.execute(
                    "UPDATE productos SET stock = stock - ? WHERE codigo = ?",
                    (item["cantidad"], item["codigo"]),
                )

            conn.commit()
            return True, id_venta
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def get_all_sales():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT v.id_venta, v.fecha, v.total,
                   COALESCE((SELECT SUM(d.cantidad * (dv.subtotal / dv.cantidad))
                             FROM devoluciones d
                             JOIN detalles_venta dv ON dv.id_venta = d.id_venta AND dv.codigo_producto = d.codigo_producto
                             WHERE d.id_venta = v.id_venta), 0) AS devoluciones_total
            FROM ventas v
            ORDER BY v.fecha DESC
            """
        )
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def get_sales_report():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT v.id_venta,
                   v.fecha,
                   v.total,
                   COALESCE((
                       SELECT SUM(d.cantidad * (dv.subtotal / dv.cantidad))
                       FROM devoluciones d
                       JOIN detalles_venta dv ON dv.id_venta = d.id_venta AND dv.codigo_producto = d.codigo_producto
                       WHERE d.id_venta = v.id_venta
                   ), 0) AS total_devuelto,
                   v.total - COALESCE((
                       SELECT SUM(d.cantidad * (dv.subtotal / dv.cantidad))
                       FROM devoluciones d
                       JOIN detalles_venta dv ON dv.id_venta = d.id_venta AND dv.codigo_producto = d.codigo_producto
                       WHERE d.id_venta = v.id_venta
                   ), 0) AS total_neto
            FROM ventas v
            ORDER BY v.fecha DESC
            """
        )
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "id_venta": row[0],
                "fecha": row[1],
                "total": row[2],
                "total_devuelto": row[3],
                "total_neto": row[4],
            }
            for row in rows
        ]

    @staticmethod
    def get_dashboard_stats():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(total),0) FROM ventas")
        sales_count, gross_total = cursor.fetchone()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(stock),0) FROM productos")
        products_count, stock_total = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) FROM productos WHERE stock < 5")
        low_stock_count = cursor.fetchone()[0]
        cursor.execute("SELECT COALESCE(SUM(cantidad),0) FROM devoluciones")
        returns_qty = cursor.fetchone()[0]
        conn.close()
        return {
            "sales_count": sales_count,
            "gross_total": gross_total,
            "products_count": products_count,
            "stock_total": stock_total,
            "low_stock_count": low_stock_count,
            "returns_qty": returns_qty,
        }

    @staticmethod
    def delete_sale(id_venta):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT codigo_producto, cantidad FROM detalles_venta WHERE id_venta=?",
                (id_venta,),
            )
            details = cursor.fetchall()
            for codigo_producto, cantidad in details:
                cursor.execute(
                    "UPDATE productos SET stock = stock + ? WHERE codigo = ?",
                    (cantidad, codigo_producto),
                )

            cursor.execute("DELETE FROM devoluciones WHERE id_venta=?", (id_venta,))
            cursor.execute("DELETE FROM detalles_venta WHERE id_venta=?", (id_venta,))
            cursor.execute("DELETE FROM ventas WHERE id_venta=?", (id_venta,))
            conn.commit()
            return True, f"Venta #{id_venta} borrada completamente del historial."
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()
