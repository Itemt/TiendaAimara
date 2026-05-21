import sqlite3
import sys
from pathlib import Path


def _get_db_path() -> str:
    """Devuelve la ruta a la BD.
    - En .exe (PyInstaller): junto al ejecutable (persistente entre reinicios).
    - En desarrollo: en la raíz del proyecto.
    """
    if getattr(sys, "frozen", False):
        return str(Path(sys.executable).resolve().parent / "pos_aimara.db")
    return str(Path(__file__).resolve().parent.parent / "pos_aimara.db")


DB_PATH = _get_db_path()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tabla Productos (codigo PK UNIQUE)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS productos (
        codigo TEXT PRIMARY KEY UNIQUE,
        nombre TEXT NOT NULL,
        categoria TEXT,
        talla TEXT,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
    )
    """)

    # Tabla Ventas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ventas (
        id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        total REAL NOT NULL
    )
    """)

    # Tabla Detalles de Venta
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detalles_venta (
        id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
        id_venta INTEGER,
        codigo_producto TEXT,
        cantidad INTEGER NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY(id_venta) REFERENCES ventas(id_venta),
        FOREIGN KEY(codigo_producto) REFERENCES productos(codigo)
    )
    """)

    # Tabla Usuarios
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT NOT NULL
    )
    """)

    # Insertar admin por defecto si no existe
    cursor.execute("SELECT * FROM usuarios WHERE username='admin'")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO usuarios (username, password, rol) VALUES ('admin', 'admin123', 'admin')"
        )

    # Tabla Devoluciones
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS devoluciones (
        id_devolucion INTEGER PRIMARY KEY AUTOINCREMENT,
        id_venta INTEGER,
        codigo_producto TEXT,
        cantidad INTEGER NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        motivo TEXT,
        FOREIGN KEY(id_venta) REFERENCES ventas(id_venta),
        FOREIGN KEY(codigo_producto) REFERENCES productos(codigo)
    )
    """)

    conn.commit()
    conn.close()


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
