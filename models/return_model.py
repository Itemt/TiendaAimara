from models.database import get_connection


class ReturnModel:
    @staticmethod
    def get_sale_details(id_venta):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT dv.id_detalle,
                   dv.codigo_producto,
                   p.nombre,
                   p.categoria,
                   p.talla,
                   p.precio,
                   dv.cantidad,
                   dv.subtotal,
                   COALESCE((SELECT SUM(d.cantidad) FROM devoluciones d WHERE d.id_venta = dv.id_venta AND d.codigo_producto = dv.codigo_producto), 0) AS cantidad_devuelta
            FROM detalles_venta dv
            JOIN productos p ON dv.codigo_producto = p.codigo
            WHERE dv.id_venta = ?
            ORDER BY p.nombre ASC
        """,
            (id_venta,),
        )
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def process_return(id_venta, codigo_producto, cantidad_devuelta, motivo):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT dv.cantidad,
                       COALESCE((
                           SELECT SUM(d.cantidad) FROM devoluciones d
                           WHERE d.id_venta = ? AND d.codigo_producto = ?
                       ), 0)
                FROM detalles_venta dv
                WHERE dv.id_venta = ? AND dv.codigo_producto = ?
                """,
                (id_venta, codigo_producto, id_venta, codigo_producto),
            )
            row = cursor.fetchone()
            if not row:
                return False, "No existe ese producto en la venta seleccionada."
            cantidad_original, ya_devuelto = row[0], int(row[1])
            restante = cantidad_original - ya_devuelto
            if cantidad_devuelta > restante:
                return (
                    False,
                    f"Solo quedan {restante} unidad(es) por devolver de este producto.",
                )

            # 1. Registrar en tabla devoluciones
            cursor.execute(
                """
                INSERT INTO devoluciones (id_venta, codigo_producto, cantidad, motivo)
                VALUES (?, ?, ?, ?)
            """,
                (id_venta, codigo_producto, cantidad_devuelta, motivo),
            )

            # 2. Reingresar el stock
            cursor.execute(
                """
                UPDATE productos
                SET stock = stock + ?
                WHERE codigo = ?
            """,
                (cantidad_devuelta, codigo_producto),
            )

            conn.commit()
            return True, "Devolución procesada y stock reingresado."
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def get_accepted_return_quantities(id_venta):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT codigo_producto, COALESCE(SUM(cantidad), 0)
            FROM devoluciones
            WHERE id_venta = ?
            GROUP BY codigo_producto
            """,
            (id_venta,),
        )
        rows = cursor.fetchall()
        conn.close()
        return {row[0]: row[1] for row in rows}
