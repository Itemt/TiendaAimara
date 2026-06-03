# Aimara POS 🛍️

Sistema de Punto de Venta y Control de Inventarios para **Tienda Aimara** (Boutique de Moda).  
Desarrollado en Python + interfaz web local interactiva (HTML/CSS/JS) con servidor HTTP integrado de respuesta ultra rápida.

> **Versión actual: Final Release**

---

## ✨ Características principales y Funcionalidades

El sistema está diseñado de acuerdo a la operación específica y las políticas comerciales de la boutique:

### 1. Tablero de Control (Dashboard)
- **Métricas en tiempo real**: Visualización rápida del número de tickets emitidos, ingresos brutos facturados, total de productos en catálogo y cantidad de productos con stock bajo.
- **Alertas de reposición**: Listado automático de referencias con stock inferior a 5 unidades para evitar quiebres de inventario.
- **Accesos directos**: Botones de navegación ágil para cobrar ventas, agregar productos o procesar devoluciones.

### 2. Punto de Venta (POS)
- **Lectura de Códigos**: Soporte para pistolas lectoras de códigos de barras convencionales (con traducción automática de caracteres de escáner) e ingreso manual con autocompletado.
- **Carrito Interactivo**: Edición en tiempo real de cantidades de productos directamente sobre la grilla del carrito de ventas con recálculo instantáneo.
- **Múltiples Medios de Pago**: Soporte y registro específico para Efectivo (💵), Datáfono (💳) y Transferencias (📲).
- **Cálculo de Cambio**: Asistente de cálculo de cambio para transacciones en Efectivo a través del indicador "¿Cuánto cancela?".
- **Factura POS Térmica**: Generación y apertura automática para impresión directa de tickets de 58 mm estilo DIAN, con discriminación de IVA del 19% incluido, datos de cliente (nombre, identificación, teléfono), cajero asignado, desglose de ítems, forma de pago y políticas oficiales de cambio de la boutique.

### 3. Gestión de Inventarios
- **Ficha de Producto**: Registro detallado de productos con código (autogenerado si se deja en blanco), nombre, categoría, talla, precio y cantidad física en stock.
- **Importador de Catálogos (CSV)**: Carga masiva desde plantillas Excel. Detecta automáticamente separadores de columnas (`,` o `;`) y remueve marcas de BOM para evitar codificaciones erróneas en tildes y caracteres especiales.
- **Impresión de Etiquetas de Barra (Code128)**:
  - Formato continuo en rollo térmico de 58 mm.
  - Formato planilla A4 (plantilla estándar de 24 stickers por hoja) ideal para impresoras de oficina.

### 4. Módulo de Devoluciones y Cambios
- **Buscador de Ventas**: Ubicación del ticket por número o mediante el panel cronológico de ventas recientes.
- **Devoluciones Parciales o Totales**: Selección de la cantidad exacta a retornar y asignación de motivos de devolución (ej: *Garantía / Defecto* o *Cambio / Talla*).
- **Trazabilidad del Stock**: Al registrar la devolución, los ítems reingresan de manera automática al stock físico del inventario.
- **Actualizar Factura (Flujo de Cambios)**:
  - Control de saldos a favor en estado **"Pendiente de Cambio"**.
  - Permite realizar cambios por múltiples prendas nuevas dentro de la misma transacción original.
  - **Política de Precios**: Validación automática del sistema; el valor total combinado de los nuevos artículos debe ser **igual o superior** al valor de la prenda devuelta (no se hacen reembolsos en efectivo).
  - Recálculo automático de la factura e impresión inmediata de la factura modificada y actualizada.

### 5. Historial, Reportes y Auditoría
- **Auditoría de Transacciones**: Reporte cronológico detallado que muestra número de ticket, fecha de emisión, total bruto original, total neto (después de cualquier cambio o devolución) y método de pago con indicador gráfico.
- **Acciones Rápidas del Historial**:
  - **Reimpresión de Facturas**: Emisión directa del ticket térmico original de cualquier venta registrada.
  - **Edición de Venta**: Corrección directa de ítems de facturas emitidas por errores humanos.
  - **Anulación Completa**: Borrado de la venta de los registros, reversión de stock para todos los productos de la factura y eliminación en cascada de las devoluciones/cambios relacionados para evitar inconsistencias en auditorías.
- **Exportaciones del Historial**:
  - **Exportar Excel (CSV)**: Genera archivos planos compatibles con Microsoft Excel (codificados en UTF-8 con BOM) incluyendo el resumen de transacciones y totales consolidados.
  - **Exportar PDF (A4)**: Genera y abre el reporte formal administrativo de ventas para contabilidad con membrete de la tienda.

### 6. Documentación Integrada
- **Manual de Operación**: Acceso inmediato a un botón de manual de usuario en formato PDF imprimible desde el propio menú lateral de la aplicación.

---

## 🚀 Instalación y Ejecución

### Requisitos del Sistema
- Python 3.9 o superior.
- Librerías listadas en `requirements.txt` (`reportlab`, `python-barcode[images]`, `Pillow`, etc.).

### Ejecución en Modo Desarrollo
```bash
# Instalar dependencias necesarias
pip install -r requirements.txt

# Iniciar servidor y abrir la interfaz
python main.py
```
El POS se ejecutará y abrirá el navegador de forma automática en la dirección local `http://127.0.0.1:8765`.

### Construcción de Distribuciones (Ejecutables Portables)
- **Windows (`dist/AimaraPos.exe`)**:
  ```bat
  build_windows.bat
  ```
- **macOS (`dist/AimaraPos.app`)**:
  ```bash
  pyinstaller aimara_pos.spec --clean
  ```

---

## 🗂️ Estructura de Archivos

```
ProyectoAngie/
├── main.py                  # Punto de entrada (inicializa backend y abre interfaz)
├── web_server.py            # Servidor HTTP embebido en puerto local
├── app_api.py               # Capa lógica de la API central del sistema
├── models/                  # Gestión y modelos de Base de Datos SQLite
│   ├── database.py          # Conexión principal y scripts de migración
│   ├── sale.py              # Operaciones de venta
│   ├── product.py           # Inventario de productos
│   ├── return_model.py      # Retornos de mercancía
│   └── user.py              # Usuarios y permisos
├── utils/
│   └── printer_manager.py   # Renderizador de tickets PDF y códigos de barra
├── views/
│   └── web/                 # Recursos de la Interfaz Web Local
│       ├── index.html       # Diseño de vistas de la UI
│       ├── app.js           # Controlador JavaScript principal de eventos
│       └── styles.css       # Diseño visual (light/dark mode)
├── requirements.txt         # Paquetes y dependencias del sistema
├── aimara_pos.spec          # Configuración de compilación con PyInstaller
└── build_windows.bat        # Automatización de compilación en Windows
```

---

## 📄 Licencia

Derechos Reservados — Tienda Aimara. Uso exclusivo comercial interno.
