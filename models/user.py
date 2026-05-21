from models.database import get_connection

class UserModel:
    @staticmethod
    def verify_login(username, password):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE username = ? AND password = ?", (username, password))
        user = cursor.fetchone()
        conn.close()
        if user:
            return {"id": user[0], "username": user[1], "rol": user[3]}
        return None

    @staticmethod
    def list_users():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, rol FROM usuarios")
        users = [{"id": row[0], "username": row[1], "rol": row[2]} for row in cursor.fetchall()]
        conn.close()
        return users

    @staticmethod
    def add_user(username, password, rol):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)", (username, password, rol))
            conn.commit()
            return True, "Usuario creado exitosamente."
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                return False, f"El nombre de usuario '{username}' ya existe."
            return False, f"Error al crear usuario: {e}"
        finally:
            conn.close()

    @staticmethod
    def update_user(user_id, username, password, rol):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            if password:
                cursor.execute("UPDATE usuarios SET username = ?, password = ?, rol = ? WHERE id = ?", (username, password, rol, user_id))
            else:
                cursor.execute("UPDATE usuarios SET username = ?, rol = ? WHERE id = ?", (username, rol, user_id))
            conn.commit()
            return True, "Usuario actualizado exitosamente."
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                return False, f"El nombre de usuario '{username}' ya está en uso."
            return False, f"Error al actualizar usuario: {e}"
        finally:
            conn.close()

    @staticmethod
    def delete_user(user_id):
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'")
            admin_count = cursor.fetchone()[0]

            cursor.execute("SELECT rol FROM usuarios WHERE id = ?", (user_id,))
            target = cursor.fetchone()

            if not target:
                return False, "Usuario no encontrado."

            if target[0] == 'admin' and admin_count <= 1:
                return False, "No se puede eliminar al único administrador del sistema."

            cursor.execute("DELETE FROM usuarios WHERE id = ?", (user_id,))
            conn.commit()
            return True, "Usuario eliminado exitosamente."
        except Exception as e:
            return False, f"Error al eliminar usuario: {e}"
        finally:
            conn.close()
