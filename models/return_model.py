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
                   COALESCE(p.nombre, 'Producto sin stock/registro (' || dv.codigo_producto || ')') AS nombre,
                   COALESCE(p.categoria, '') AS categoria,
                   COALESCE(p.talla, '') AS talla,
                   COALESCE(p.precio, (dv.subtotal / dv.cantidad)) AS precio,
                   dv.cantidad,
                   dv.subtotal,
                   COALESCE((SELECT SUM(d.cantidad) FROM devoluciones d WHERE d.id_venta = dv.id_venta AND d.codigo_producto = dv.codigo_producto), 0) AS cantidad_devuelta
            FROM detalles_venta dv
            LEFT JOIN productos p ON dv.codigo_producto = p.codigo
            WHERE dv.id_venta = ?
            ORDER BY nombre ASC
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

    @staticmethod
    def get_sale_info(id_venta):
        """Retorna (id_venta, fecha, total) de la venta."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id_venta, fecha, total FROM ventas WHERE id_venta = ?", (id_venta,)
        )
        row = cursor.fetchone()
        conn.close()
        return row

    @staticmethod
    def update_sale_item(id_venta, old_codigo, new_codigo, cantidad, motivo):
        """
        Reemplaza un producto en la venta por otro, con soporte de cambios parciales.

        Estrategia de datos:
        - detalles_venta.cantidad  NUNCA se reduce: preserva la cantidad original
          comprada para que la UI muestre 'Comprado: N' correctamente.
        - detalles_venta.subtotal  SÍ se reduce en (cantidad * precio_unit_viejo),
          de modo que el total de la venta es correcto.
        - devoluciones             registra cada unidad intercambiada, permitiendo
          calcular 'Devuelto: X' y 'Restante: N-X' en la UI.

        Retorna (True/False, mensaje, new_total)
        """
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # 1. Leer cantidad original y ya-devuelta/intercambiada del producto viejo
            cursor.execute(
                """
                SELECT dv.id_detalle, dv.cantidad, dv.subtotal,
                       COALESCE((
                           SELECT SUM(d.cantidad) FROM devoluciones d
                           WHERE d.id_venta = dv.id_venta AND d.codigo_producto = dv.codigo_producto
                       ), 0) AS ya_devuelto
                FROM detalles_venta dv
                WHERE dv.id_venta = ? AND dv.codigo_producto = ?
                """,
                (id_venta, old_codigo),
            )
            old_row = cursor.fetchone()
            if not old_row:
                return False, "El producto original no se encontró en la venta.", None

            id_detalle, old_cant, old_subtotal, ya_devuelto = old_row
            restante = int(old_cant) - int(ya_devuelto)

            if cantidad <= 0 or cantidad > restante:
                return False, f"La cantidad a cambiar ({cantidad}) es inválida. Disponible: {restante}.", None

            # 2. Verificar producto nuevo
            cursor.execute(
                "SELECT nombre, precio, stock FROM productos WHERE codigo = ?",
                (new_codigo,),
            )
            new_prod = cursor.fetchone()
            if not new_prod:
                return False, f"El producto nuevo (código: {new_codigo}) no existe en el inventario.", None

            new_nombre, new_precio, new_stock = new_prod

            if int(new_stock) < cantidad:
                return (
                    False,
                    f"Stock insuficiente para '{new_nombre}'.\nDisponible: {new_stock}, requerido: {cantidad}.",
                    None,
                )

            old_precio_unit = float(old_subtotal) / int(old_cant)

            # 3. Ajustar stocks
            cursor.execute(
                "UPDATE productos SET stock = stock + ? WHERE codigo = ?",
                (cantidad, old_codigo),
            )
            cursor.execute(
                "UPDATE productos SET stock = stock - ? WHERE codigo = ?",
                (cantidad, new_codigo),
            )

            # 4. Registrar el intercambio en devoluciones para trazabilidad en la UI
            #    Esto permite mostrar "Devuelto: X" sin reducir detalles_venta.cantidad
            cursor.execute(
                """
                INSERT INTO devoluciones (id_venta, codigo_producto, cantidad, motivo)
                VALUES (?, ?, ?, ?)
                """,
                (id_venta, old_codigo, cantidad, motivo if motivo else "Cambio de producto"),
            )

            # 5. Reducir solo el subtotal del producto viejo (cantidad queda intacta = "Comprado: N")
            nuevo_subtotal_viejo = old_precio_unit * (int(old_cant) - cantidad)
            cursor.execute(
                "UPDATE detalles_venta SET subtotal = ? WHERE id_detalle = ?",
                (nuevo_subtotal_viejo, id_detalle),
            )

            # 6. Insertar o fusionar el nuevo producto en detalles_venta
            cursor.execute(
                "SELECT id_detalle FROM detalles_venta WHERE id_venta = ? AND codigo_producto = ?",
                (id_venta, new_codigo),
            )
            existing_new = cursor.fetchone()

            if existing_new:
                new_id_detalle = existing_new[0]
                cursor.execute(
                    """
                    UPDATE detalles_venta
                    SET cantidad = cantidad + ?, subtotal = subtotal + ?
                    WHERE id_detalle = ?
                    """,
                    (cantidad, float(new_precio) * cantidad, new_id_detalle),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO detalles_venta (id_venta, codigo_producto, cantidad, subtotal)
                    VALUES (?, ?, ?, ?)
                    """,
                    (id_venta, new_codigo, cantidad, float(new_precio) * cantidad),
                )

            # 7. Recalcular total de la venta
            cursor.execute(
                "SELECT COALESCE(SUM(subtotal), 0) FROM detalles_venta WHERE id_venta = ?",
                (id_venta,),
            )
            new_total = cursor.fetchone()[0]
            cursor.execute(
                "UPDATE ventas SET total = ? WHERE id_venta = ?",
                (new_total, id_venta),
            )

            conn.commit()
            return True, f"Producto cambiado exitosamente por '{new_nombre}'.", new_total

        except Exception as e:
            conn.rollback()
            return False, str(e), None
        finally:
            conn.close()

