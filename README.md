# Aimara POS 🛍️

Sistema de Punto de Venta para **Tienda Aimara** — boutique de moda.  
Construido con Python + interfaz web local (HTML/CSS/JS) servida por un servidor HTTP embebido.

> **Versión actual: v2.5.5**

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

### v2.5.5 — 2026-06-01
- 🚫 **Validación de precio en cambio** — Restaurada la regla: el valor **total combinado** de todas las prendas nuevas debe igualar o superar el valor de la prenda devuelta. Si el cliente escoge prendas que juntas suman menos (ej: top $50k → solo crop top $40k), el sistema rechaza el cambio con mensaje claro. Aplica tanto para uno como para varios productos nuevos.

- ✅ **Multi-prenda en cambio** — Ahora al completar un cambio pendiente puedes agregar varias prendas nuevas (ej: cambiar una camisa de $50k por un crop top de $25k + una blusa de $25k). Botón “+ Agregar prenda” disponible en el modal de Cambio Pendiente.
- 💰 **Política flex de precios en cambios** — Eliminada la restricción que impedía elegir prendas de menor valor en cambios pendientes. El valor combinado de los nuevos productos puede ser igual o inferior al de la prenda devuelta.

- 🛠️ **Tinta de factura** — Aumento de peso de fuente (Bold 900) y `text-stroke` en el recibo HTML; fuentes más grandes y líneas separadoras más gruesas en el PDF térmico para mayor densidad de tinta.
- 🐛 **Fix impresión en Cambios** — Corregido bug donde al completar un "cambio pendiente" la factura reimpressa no incluía los datos del cliente ni el método de pago.

- 🛠️ **Caché del Navegador** — Actualización del parámetro de versión del recurso `app.js` a `v2.5.1` en `index.html` para forzar la recarga de scripts en el navegador del cliente y evitar la memoria caché de versiones anteriores.

### v2.5.0 — 2026-06-01
- ✅ **IVA y Políticas** — Agregado IVA del 19% calculado e incluido en el total de la factura. Actualizadas las políticas de cambio impresas en la factura.
- ✅ **Datos de Cliente** — El Punto de Venta ahora captura y persiste los datos del cliente (Nombre, Cédula, Teléfono) y se muestran en la factura.
- ✅ **Tinta de factura** — Ajuste a negro puro (RGB 0,0,0) en la impresión térmica.
- ✅ **Historial y Fix de Devoluciones** — Solucionado el error de foreign key constraint ("Historial no anula las ventas") borrando los registros huérfanos asociados a la venta antes de anularla.

### v2.4.1 — 2026-06-01
- 🛠️ **Hotfix Login** — Corregido error de sintaxis en `app.js` que impedía el inicio de sesión y la carga de la interfaz.

### v2.4.0 — 2026-06-01
- ✅ **Datos de Cliente** — Soporte para capturar Nombre, Cédula/NIT y Teléfono del cliente en las ventas y recibos.
- ✅ **Cambios Multi-producto** — Ahora es posible cambiar una prenda por varias diferentes dentro del mismo flujo de "Actualizar Factura".

### v2.1.0 — 2026-05-28
- ✅ **Optimización de Caché y Cambios Parciales** — Se agregaron cabeceras `Cache-Control: no-cache` y parámetros de versión en los recursos web para evitar que el navegador cachee código JavaScript antiguo.
- ✅ **Flujo de Intercambio Adaptativo** — En la sección "Actualizar Factura", se muestra como texto estático la prenda y cantidad que se devolvió previamente. Permite realizar cambios parciales de forma secuencial reduciendo la cantidad pendiente por ID de devolución.

### v2.0.0 — 2026-05-28
- ✅ **Flujo de Devoluciones y Cambios Vinculados** — Completada la integración del flujo de cambios automáticos. Ahora, al hacer un cambio, no se vuelve a preguntar qué producto cambiar; el sistema ya sabe cuál se devolvió previamente bajo el estado "Pendiente de Cambio" y permite escanear el nuevo producto directamente, asociándolos mediante el ID de la devolución.

### v1.9.1 — 2026-05-28
- ✅ **Optimización de Actualizar Factura** — Se eliminó el flujo clásico manual (selección de producto). Si no hay devoluciones pendientes con estado de cambio, se muestra un mensaje informativo que guía al cajero a realizar primero la devolución con motivo "Cambio / Talla".

### v1.9.0 — 2026-05-28
- ✅ **Estado de Devoluciones** — Agregada columna de estado (`PENDIENTE_CAMBIO`, `COMPLETADO`) en la base de datos para registrar y enlazar los cambios de prendas de forma precisa.

### v1.8.5 — 2026-05-28
- ✅ **Estabilidad y Trazabilidad** — Eliminación de archivos innecesarios de entorno de desarrollo y correcciones finales para el tracking de cambios.

### v1.8.1 — 2026-05-28
- ✅ **Corrección en Cantidad Comprada** — Corrección para conservar la cantidad comprada original en `detalles_venta` al realizar devoluciones parciales y cambios.

### v1.8.0 — 2026-05-28
- ✅ **Devoluciones/Cambios Parciales** — Se rediseñó el flujo de "Actualizar Factura" en el módulo de devoluciones para permitir el cambio de una cantidad seleccionada (no obligatoriamente todo el stock comprado) de un producto.
- ✅ **Barra de desplazamiento en inventario** — Agregada barra de desplazamiento vertical interna en la tabla de productos para una mejor experiencia visual con catálogos grandes.
- ✅ **NIT de tienda oficial** — Actualizado el NIT en los recibos a la identificación fiscal real `700378458`.

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
