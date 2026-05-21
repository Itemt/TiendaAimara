from models.database import get_connection
import sqlite3

class ProductModel:
    @staticmethod
    def add_product(codigo, nombre, categoria, talla, precio, stock):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT codigo FROM productos WHERE codigo = ?", (codigo,))
            if cursor.fetchone():
                return False, "El código de barras ya existe."

            cursor.execute("""
                INSERT INTO productos (codigo, nombre, categoria, talla, precio, stock)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (codigo, nombre, categoria, talla, precio, stock))
            conn.commit()
            return True, "Producto agregado correctamente."
        except sqlite3.IntegrityError:
            return False, "Error de integridad: El código ya existe."
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def next_product_code(prefix="AIM"):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT codigo FROM productos")
        codes = [row[0] for row in cursor.fetchall()]
        conn.close()

        highest = 0
        for code in codes:
            text = str(code)
            if text.startswith(f"{prefix}-"):
                suffix = text.split("-", 1)[1]
                if suffix.isdigit():
                    highest = max(highest, int(suffix))
            elif text.isdigit():
                highest = max(highest, int(text))

        return f"{prefix}-{highest + 1:06d}"

    @staticmethod
    def get_product_by_code(codigo):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM productos WHERE codigo = ?", (codigo,))
        row = cursor.fetchone()
        conn.close()
        if row:
            # codigo, nombre, categoria, talla, precio, stock
            return {"codigo": row[0], "nombre": row[1], "categoria": row[2], 
                    "talla": row[3], "precio": row[4], "stock": row[5]}
        return None

    @staticmethod
    def get_all_products():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM productos")
        rows = cursor.fetchall()
        conn.close()
        return rows

    @staticmethod
    def list_products(search_text=None):
        conn = get_connection()
        cursor = conn.cursor()
        if search_text:
            like = f"%{search_text}%"
            cursor.execute(
                """
                SELECT codigo, nombre, categoria, talla, precio, stock
                FROM productos
                WHERE codigo LIKE ? OR nombre LIKE ? OR categoria LIKE ? OR talla LIKE ?
                ORDER BY nombre ASC
                """,
                (like, like, like, like),
            )
        else:
            cursor.execute(
                "SELECT codigo, nombre, categoria, talla, precio, stock FROM productos ORDER BY nombre ASC"
            )
        rows = cursor.fetchall()
        conn.close()
        return [
            {
                "codigo": row[0],
                "nombre": row[1],
                "categoria": row[2],
                "talla": row[3],
                "precio": row[4],
                "stock": row[5],
            }
            for row in rows
        ]

    @staticmethod
    def update_stock(codigo, amount_to_add):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE productos SET stock = stock + ? WHERE codigo = ?", (amount_to_add, codigo))
        conn.commit()
        conn.close()

    @staticmethod
    def update_product(codigo, nombre, categoria, talla, precio, stock):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE productos 
                SET nombre=?, categoria=?, talla=?, precio=?, stock=?
                WHERE codigo=?
            """, (nombre, categoria, talla, precio, stock, codigo))
            if cursor.rowcount == 0:
                return False, "Producto no encontrado."
            conn.commit()
            return True, "Producto actualizado correctamente."
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def delete_product(codigo):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Primero verificar si está en ventas (para no romper integridad referencial)
            cursor.execute("SELECT id_detalle FROM detalles_venta WHERE codigo_producto=?", (codigo,))
            if cursor.fetchone():
                return False, "No se puede eliminar porque existe en el registro de ventas. (Inactívelo actualizando el stock a 0)"

            cursor.execute("DELETE FROM productos WHERE codigo=?", (codigo,))
            if cursor.rowcount == 0:
                return False, "Producto no encontrado."
            conn.commit()
            return True, "Producto eliminado correctamente."
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
