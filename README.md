# Aimara POS 🛍️

Sistema de Punto de Venta para **Tienda Aimara** — boutique de moda.  
Construido con Python + interfaz web local (HTML/CSS/JS) servida por un servidor HTTP embebido.

> **Versión actual: v1.7.5**

---

## ✨ Características principales

- **Punto de Venta (POS)** — escaneo de código de barras, carrito, facturación rápida
- **Métodos de pago** — Efectivo, Datáfono y Transferencia (selección visual en cobro)
- **Factura impresa** — ticket 58 mm con método de pago, políticas de cambio y QR de contacto
- **Inventario** — alta, edición, búsqueda y eliminación de productos; importación CSV
- **Stickers / etiquetas** — impresión directa 58 mm y PDF A4 con código de barras Code128
- **Devoluciones** — gestión por ticket, reingreso de stock, trazabilidad completa
- **Actualizar Factura** — cambio de producto en una venta existente con reimpresión inmediata
- **Historial de ventas** — reporte con totales brutos, devueltos y netos; columna de método de pago
- **Dashboard** — métricas clave y alertas de stock bajo
- **Usuarios** — roles admin / cajero con contraseña
- **Modo oscuro / claro** — cambio de tema en un clic
- **Multiplataforma** — Windows `.exe` y macOS `.app`

---

## 🚀 Instalación rápida (ejecutable)

### Windows
1. Descarga `AimaraPos.exe` desde [Releases](../../releases/latest)
2. Copia el `.exe` a cualquier carpeta
3. Ejecuta — se abre el navegador automáticamente

### macOS
1. Descarga `AimaraPos.app.zip` desde [Releases](../../releases/latest)
2. Descomprime y arrastra a `/Applications`
3. Ejecuta — la BD se guarda en `~/Documents/AimaraPos/`

> **Credenciales por defecto:** usuario `admin` · contraseña `admin123`

---

## 🛠️ Ejecución en modo desarrollo

```bash
# Clonar
git clone https://github.com/Itemt/TiendaAimara.git
cd TiendaAimara

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar
python main.py
```

El servidor abre automáticamente `http://127.0.0.1:8765` en el navegador.

---

## 📦 Generar ejecutable Windows

```bat
build_windows.bat
```

Requiere Python 3.9+ y PyInstaller instalado. El ejecutable queda en `dist/AimaraPos.exe`.

---

## 📋 Historial de versiones

### v1.7.5 — 2026-05-27
- ✅ **Borrar Base de Datos** — Añadido panel de administración (visible solo para usuarios con rol `admin`) con opción de borrado rápido de la base de datos (ventas, productos, devoluciones) con doble confirmación de seguridad.

### v1.7.0 — 2026-05-27
- ✅ **Factura formato DIAN** — rediseño completo del ticket de 58mm:
  - Encabezado con NIT, dirección, tipo de contribuyente, régimen fiscal R-99-PN, tipo de operación
  - Tabla de ítems estilo POS DIAN: `# | Descripción | C/N | V/Uni | Total`
  - Sección **CANCELO / CAMBIO** en totales
  - Sección **FORMA DE PAGO / MEDIO DE PAGO / ✓ ESTADO ACEPTADA**
  - Pie con **CAJERO / VENDEDOR** (usuario logueado)
- ✅ **Método de pago corregido** — bug donde siempre guardaba "Efectivo" sin importar la selección (el DOM se limpiaba antes de leer el radio; ahora se persiste en `state`)
- ✅ **Campo "¿Cuánto cancela?"** en modal de cobro con cálculo de cambio en tiempo real (solo visible para Efectivo)
- ✅ **Importación CSV mejorada** — detecta separador `,` o `;` automáticamente, maneja BOM UTF-8, elimina comillas, acepta `.txt`
- ✅ **Edición de productos con stock 0** — corregido envío de `"0"` como string válido

### v1.6.0 — 2026-05-27
- ✅ **Métodos de pago** — selector visual (chips) en modal de cobro: Efectivo, Datáfono, Transferencia
- ✅ Guardado de método de pago en base de datos (migración automática para BD existentes)
- ✅ Método de pago visible en ticket impreso, PDF generado e historial de ventas
- ✅ **Actualizar Factura** en módulo Devoluciones — cambia un producto de una venta existente:
  - Devuelve el producto viejo al stock
  - Descuenta el nuevo producto del stock
  - Actualiza `detalles_venta` y recalcula total de la venta
  - Registra el cambio en tabla `devoluciones` (trazabilidad)
  - Reimprime la factura actualizada automáticamente

### v1.5.0
- ✅ Reimpresión directa de facturas desde el navegador (sin PDF intermedio)
- ✅ Botones de actualizar en todos los módulos
- ✅ Diseño de ticket 58 mm con logo, políticas de cambio y contacto WhatsApp

### v1.4.0
- ✅ Códigos de producto sin guión, iniciando en `AIM1001`
- ✅ Restablecimiento del módulo de devoluciones al actualizar
- ✅ Corrección de formato de código autogenerado

### v1.3.5
- ✅ Solución de lectura de guión (`-`) en escáneres
- ✅ Traducción de backticks a guiones para compatibilidad de escáneres
- ✅ Remoción de guiones de códigos autogenerados

### v1.3.0
- ✅ Rediseño completo del ticket de factura para Aimara Moda
- ✅ Impresión continua de etiquetas de códigos de barra en tira 58 mm
- ✅ Orientación vertical forzada en PDFs térmicos

### v1.2.0
- ✅ Soporte multiplataforma macOS (`.app`) y Windows (`.exe`)
- ✅ Ruta de BD persistente en `~/Documents/AimaraPos/` en macOS
- ✅ Ocultamiento de consola en Windows

---

## 🗂️ Estructura del proyecto

```
ProyectoAngie/
├── main.py                  # Punto de entrada
├── web_server.py            # Servidor HTTP embebido
├── app_api.py               # API central (lógica de negocio)
├── models/
│   ├── database.py          # Inicialización y migraciones SQLite
│   ├── sale.py              # Modelo de ventas
│   ├── product.py           # Modelo de productos
│   ├── return_model.py      # Modelo de devoluciones
│   └── user.py              # Modelo de usuarios
├── controllers/             # Controladores (vista Tkinter legacy)
├── utils/
│   └── printer_manager.py   # Generación de PDFs y tickets
├── views/
│   └── web/
│       ├── index.html       # UI principal
│       ├── app.js           # Lógica frontend
│       └── styles.css       # Estilos
├── requirements.txt
├── aimara_pos.spec          # Configuración PyInstaller
└── build_windows.bat        # Script de build para Windows
```

---

## 📄 Licencia

Uso privado — Tienda Aimara. Todos los derechos reservados.
