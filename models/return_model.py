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

            # Determinar estado: si el motivo contiene 'cambio' o 'talla' => PENDIENTE_CAMBIO
            motivo_lower = (motivo or "").lower()
            estado = "PENDIENTE_CAMBIO" if any(
                kw in motivo_lower for kw in ("cambio", "talla")
            ) else None

            # 1. Registrar en tabla devoluciones con estado
            cursor.execute(
                """
                INSERT INTO devoluciones (id_venta, codigo_producto, cantidad, motivo, estado)
                VALUES (?, ?, ?, ?, ?)
            """,
                (id_venta, codigo_producto, cantidad_devuelta, motivo, estado),
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
            estado_msg = " Cambio pendiente registrado." if estado == "PENDIENTE_CAMBIO" else ""
            return True, f"Devolución procesada y stock reingresado.{estado_msg}"
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
    def get_pending_changes(id_venta):
        """
        Devuelve las devoluciones con estado='PENDIENTE_CAMBIO' de esta venta,
        junto con info del producto devuelto.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT d.id_devolucion,
                   d.codigo_producto,
                   COALESCE(p.nombre, d.codigo_producto) AS nombre,
                   COALESCE(p.talla, '') AS talla,
                   d.cantidad,
                   d.motivo,
                   d.fecha
            FROM devoluciones d
            LEFT JOIN productos p ON d.codigo_producto = p.codigo
            WHERE d.id_venta = ? AND d.estado = 'PENDIENTE_CAMBIO'
            ORDER BY d.fecha ASC
            """,
            (id_venta,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "id_devolucion": r[0],
                "codigo_producto": r[1],
                "nombre": r[2],
                "talla": r[3],
                "cantidad": r[4],
                "motivo": r[5],
                "fecha": r[6],
            }
            for r in rows
        ]

    @staticmethod
    def complete_exchange(id_devolucion, new_codigo, cantidad=None, motivo=None):
        """
        Completa un cambio pendiente:
        1. Obtiene la devolución pendiente (producto viejo y cantidad).
        2. Valida stock del nuevo producto.
        3. Descuenta stock del nuevo producto (el viejo ya fue reingresado en process_return).
        4. Reduce subtotal del producto viejo en detalles_venta.
        5. Inserta/fusiona el nuevo producto en detalles_venta.
        6. Recalcula total de la venta.
        7. Registra en tabla cambios.
        8. Si se cambia la cantidad completa: Marca la devolución como COMPLETADO.
           Si es un cambio parcial: reduce la cantidad de la devolución original
           e inserta un nuevo registro de devolución marcado como COMPLETADO.
        Retorna (True/False, mensaje, new_total)
        """
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # 1. Leer la devolución pendiente
            cursor.execute(
                """
                SELECT id_venta, codigo_producto, cantidad, motivo, fecha
                FROM devoluciones
                WHERE id_devolucion = ? AND estado = 'PENDIENTE_CAMBIO'
                """,
                (id_devolucion,),
            )
            dev = cursor.fetchone()
            if not dev:
                return False, "No se encontró una devolución pendiente con ese ID.", None

            id_venta, old_codigo, pending_qty, orig_motivo, fecha = dev

            if cantidad is None or cantidad <= 0:
                cantidad = pending_qty
            
            if cantidad > pending_qty:
                return False, f"La cantidad solicitada ({cantidad}) supera la cantidad pendiente ({pending_qty}).", None

            actual_motivo = motivo if motivo is not None else orig_motivo

            # 2. Validar nuevo producto
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

            # 3. Descontar stock del nuevo producto
            cursor.execute(
                "UPDATE productos SET stock = stock - ? WHERE codigo = ?",
                (cantidad, new_codigo),
            )

            # 4. Reducir subtotal del producto viejo en detalles_venta
            cursor.execute(
                "SELECT id_detalle, cantidad, subtotal FROM detalles_venta WHERE id_venta = ? AND codigo_producto = ?",
                (id_venta, old_codigo),
            )
            old_dv = cursor.fetchone()
            if old_dv:
                id_detalle, old_cant, old_subtotal = old_dv
                old_price_unit = float(old_subtotal) / int(old_cant) if int(old_cant) > 0 else 0
                nuevo_subtotal_viejo = max(old_price_unit * (int(old_cant) - cantidad), 0)
                cursor.execute(
                    "UPDATE detalles_venta SET subtotal = ? WHERE id_detalle = ?",
                    (nuevo_subtotal_viejo, id_detalle),
                )

            # 5. Insertar o fusionar el nuevo producto en detalles_venta
            cursor.execute(
                "SELECT id_detalle FROM detalles_venta WHERE id_venta = ? AND codigo_producto = ?",
                (id_venta, new_codigo),
            )
            existing_new = cursor.fetchone()
            if existing_new:
                cursor.execute(
                    """
                    UPDATE detalles_venta
                    SET cantidad = cantidad + ?, subtotal = subtotal + ?
                    WHERE id_detalle = ?
                    """,
                    (cantidad, float(new_precio) * cantidad, existing_new[0]),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO detalles_venta (id_venta, codigo_producto, cantidad, subtotal)
                    VALUES (?, ?, ?, ?)
                    """,
                    (id_venta, new_codigo, cantidad, float(new_precio) * cantidad),
                )

            # 6. Recalcular total de la venta
            cursor.execute(
                "SELECT COALESCE(SUM(subtotal), 0) FROM detalles_venta WHERE id_venta = ?",
                (id_venta,),
            )
            new_total = cursor.fetchone()[0]
            cursor.execute(
                "UPDATE ventas SET total = ? WHERE id_venta = ?",
                (new_total, id_venta),
            )

            # 7. Manejo del estado de la devolución (completo vs parcial)
            target_id_devolucion = id_devolucion
            if cantidad == pending_qty:
                # Caso completo: marcar la devolución original como COMPLETADO
                cursor.execute(
                    "UPDATE devoluciones SET estado = 'COMPLETADO', motivo = ? WHERE id_devolucion = ?",
                    (actual_motivo, id_devolucion),
                )
            else:
                # Caso parcial:
                # A. Reducir la cantidad de la devolución original (sigue PENDIENTE_CAMBIO)
                cursor.execute(
                    "UPDATE devoluciones SET cantidad = ? WHERE id_devolucion = ?",
                    (pending_qty - cantidad, id_devolucion),
                )
                # B. Crear una nueva fila para la porción completada
                cursor.execute(
                    """
                    INSERT INTO devoluciones (id_venta, codigo_producto, cantidad, motivo, estado, fecha)
                    VALUES (?, ?, ?, ?, 'COMPLETADO', ?)
                    """,
                    (id_venta, old_codigo, cantidad, actual_motivo, fecha),
                )
                target_id_devolucion = cursor.lastrowid

            # 8. Registrar en tabla cambios
            cursor.execute(
                """
                INSERT INTO cambios (id_devolucion, id_venta, producto_anterior, producto_nuevo, cantidad)
                VALUES (?, ?, ?, ?, ?)
                """,
                (target_id_devolucion, id_venta, old_codigo, new_codigo, cantidad),
            )

            conn.commit()
            return True, f"Cambio completado: {new_nombre} ingresado a la venta.", new_total

        except Exception as e:
            conn.rollback()
            return False, str(e), None
        finally:
            conn.close()

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

