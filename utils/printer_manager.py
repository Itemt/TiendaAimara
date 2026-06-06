import os
from pathlib import Path

import barcode
from barcode.writer import ImageWriter
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


class PrinterManager:
    @staticmethod
    def print_receipt(sale_data, products_list):
        """
        Imprime un ticket térmico de 58mm (DigitalPos DIG-M220).
        En un entorno real, enviaría comandos ESC/POS vía win32print o pyusb.
        Por ahora, generará un txt o simulará el envío.
        """
        print("--- INICIO IMPRESIÓN TICKETERA 58MM ---")
        receipt_text = "      TIENDA AIMARA      \n"
        receipt_text += "=========================\n"
        receipt_text += f"Ticket #: {sale_data['id_venta']}\n"
        if sale_data.get('cliente_nombre'):
            receipt_text += f"Cliente: {sale_data['cliente_nombre']}\n"
            if sale_data.get('cliente_documento'):
                receipt_text += f"Doc: {sale_data['cliente_documento']}\n"
            if sale_data.get('cliente_telefono'):
                receipt_text += f"Tel: {sale_data['cliente_telefono']}\n"
        receipt_text += "=========================\n"
        for p in products_list:
            receipt_text += f"{p['nombre']} (x{p['cantidad']}) - ${p['subtotal']}\n"
        receipt_text += "=========================\n"
        receipt_text += f"TOTAL: ${sale_data['total']}\n"
        receipt_text += "    GRACIAS POR SU COMPRA!   \n\n\n"

        # Guardar último ticket junto a la base de datos
        from models.database import DB_PATH
        receipt_path = str(Path(DB_PATH).parent / "last_receipt.txt")
        
        with open(receipt_path, "w", encoding="utf-8") as f:
            f.write(receipt_text)

        print(receipt_text)
        print("--- FIN IMPRESIÓN TICKETERA ---")

    @staticmethod
    def generate_stickers_pdf(products_list, output_filename="stickers_a4.pdf"):
        """
        A4 para imprimir stickers (Nombre, Talla, Precio y Código de Barras).
        """
        c = canvas.Canvas(output_filename, pagesize=A4)
        width, height = A4

        # Parámetros de cuadrícula A4
        cols = 3
        rows = 8
        sticker_w = width / cols
        sticker_h = height / rows

        x_offset = 0
        y_offset = height - sticker_h

        for p in products_list:
            codigo = p["codigo"]

            # Generar Barcode Code128 en memoria o archivo temporal
            code128 = barcode.get_barcode_class("code128")
            hrn = code128(codigo, writer=ImageWriter())
            filename = hrn.save(
                f"temp_barcode_{codigo}",
                options={
                    "write_text": False,
                    "module_width": 0.2,
                    "module_height": 5.0,
                },
            )

            # Dibujar etiqueta
            c.rect(x_offset, y_offset, sticker_w, sticker_h)
            c.drawString(
                x_offset + 10, y_offset + sticker_h - 15, f"Producto: {p['nombre']}"
            )
            c.drawString(
                x_offset + 10,
                y_offset + sticker_h - 30,
                f"Talla: {p['talla']} | Precio: ${p['precio']}",
            )

            # Insertar imagen del código de barras
            c.drawImage(
                filename,
                x_offset + 10,
                y_offset + 10,
                width=sticker_w - 20,
                height=sticker_h - 50,
            )
            c.drawString(x_offset + 10, y_offset + 5, f"Cod: {codigo}")

            # Limpiar archivo temporal
            if os.path.exists(filename):
                os.remove(filename)

            x_offset += sticker_w
            if x_offset >= width - 1:
                x_offset = 0
                y_offset -= sticker_h

            if y_offset < 0:
                c.showPage()
                x_offset = 0
                y_offset = height - sticker_h

        c.save()
        return output_filename

    @staticmethod
    def generate_thermal_stickers_pdf(
        products_list, output_filename="stickers_thermal.pdf"
    ):
        """
        Genera PDF de etiquetas para impresora térmica de 58mm en una tira continua.
        """
        LABEL_W = 58 * mm
        ITEM_H = 30 * mm
        # Altura dinámica: total de ítems * altura de cada uno + margen final
        # Garantizamos que sea al menos de 60mm para forzar orientación vertical (portrait)
        LABEL_H = max(60 * mm, len(products_list) * ITEM_H + 4 * mm)
        SIDE = 2.5 * mm

        c = canvas.Canvas(output_filename, pagesize=(LABEL_W, LABEL_H))

        y = LABEL_H - 2 * mm

        for idx, p in enumerate(products_list):
            codigo = str(p.get("codigo", ""))
            nombre = str(p.get("nombre", ""))
            talla = str(p.get("talla") or "").strip()
            precio = float(p.get("precio", 0) or 0)

            # Truncar nombre si supera el ancho imprimible (~26 chars a 7pt)
            if len(nombre) > 26:
                nombre = nombre[:25] + "\u2026"

            item_top_y = y

            # Nombre (negrita)
            c.setFont("Helvetica-Bold", 7.5)
            y -= 6 * mm
            c.drawString(SIDE, y, nombre)

            # Talla / Precio (negrita)
            c.setFont("Helvetica-Bold", 6.5)
            detail = f"Talla: {talla}  \u2022  ${precio:.2f}"
            y -= 4.5 * mm
            c.drawString(SIDE, y, detail)

            # Código de barras Code128
            try:
                code128_cls = barcode.get_barcode_class("code128")
                hrn = code128_cls(codigo, writer=ImageWriter())
                safe = "".join(ch for ch in codigo if ch.isalnum() or ch in "-_.")
                temp_path = f"temp_th_{safe}"
                bc_file = hrn.save(
                    temp_path,
                    options={
                        "write_text": False,
                        "module_width": 0.28,
                        "module_height": 7.0,
                        "quiet_zone": 1.0,
                    },
                )

                bc_h = 11 * mm
                bc_w = LABEL_W - 2 * SIDE
                bc_y = y - bc_h - 1.5 * mm
                c.drawImage(bc_file, SIDE, bc_y, width=bc_w, height=bc_h)

                # Código en texto bajo el barcode (negrita)
                c.setFont("Helvetica-Bold", 6)
                c.drawCentredString(LABEL_W / 2, bc_y - 4.5 * mm, codigo)

                if os.path.exists(bc_file):
                    os.remove(bc_file)

            except Exception:
                c.setFont("Helvetica-Bold", 6.5)
                y -= 8 * mm
                c.drawCentredString(LABEL_W / 2, y, f"[{codigo}]")

            # Mover y al final del item
            y = item_top_y - ITEM_H

            # Dibujar línea punteada separadora si no es el último elemento
            if idx < len(products_list) - 1:
                c.setLineWidth(0.5)
                c.setStrokeColorRGB(0, 0, 0)
                # Patrón de guiones (1.5mm encendido, 1.5mm apagado)
                c.setDash(1.5 * mm, 1.5 * mm)
                c.line(SIDE, y, LABEL_W - SIDE, y)
                # Quitar el dash para los demás dibujos
                c.setDash()

        c.save()
        return output_filename

    @staticmethod
    def generate_receipt_pdf(sale_data, products_list, output_filename):
        """
        Genera un archivo PDF con formato de ticket de 58mm para impresión térmica.
        """
        from pathlib import Path
        import datetime

        # Asegurar que el directorio de salida existe
        Path(output_filename).parent.mkdir(parents=True, exist_ok=True)

        LABEL_W = 58 * mm
        # Altura dinámica: base 105mm + 12mm por producto + espacio para cliente
        base_h = 105
        if sale_data.get('cliente_nombre'):
            base_h += 15
        LABEL_H = (base_h + len(products_list) * 12) * mm

        c = canvas.Canvas(output_filename, pagesize=(LABEL_W, LABEL_H))
        c.setFillColorRGB(0, 0, 0)
        
        # Margen e inicio en y
        margin = 3 * mm
        y = LABEL_H - 8 * mm

        # Header
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(LABEL_W / 2, y, "TIENDA AIMARA")
        y -= 4 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(LABEL_W / 2, y, "POS boutique")
        
        y -= 6 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawString(margin, y, f"TICKET #: {sale_data['id_venta']}")
        
        # Fecha actual (negrita)
        now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
        c.setFont("Helvetica-Bold", 8.5)
        c.drawRightString(LABEL_W - margin, y, now_str)

        y -= 3.5 * mm
        metodo = sale_data.get('metodo_pago', 'Efectivo') or 'Efectivo'
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(margin, y, f"Pago: {metodo}")
        
        # Datos del cliente si existen
        if sale_data.get('cliente_nombre'):
            y -= 4 * mm
            c.setFont("Helvetica", 7.5)
            c.drawString(margin, y, f"Cliente: {sale_data['cliente_nombre']}")
            if sale_data.get('cliente_documento'):
                y -= 3.5 * mm
                c.drawString(margin, y, f"Doc: {sale_data['cliente_documento']}")
            if sale_data.get('cliente_telefono'):
                y -= 3.5 * mm
                c.drawString(margin, y, f"Tel: {sale_data['cliente_telefono']}")

        y -= 3 * mm
        c.setLineWidth(1.0)
        c.line(margin, y, LABEL_W - margin, y)

        # Encabezados de tabla (negrita)
        y -= 4 * mm
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(margin, y, "Cant.")
        c.drawString(margin + 8 * mm, y, "Producto")
        c.drawRightString(LABEL_W - margin, y, "Subtotal")

        y -= 2 * mm
        c.setLineWidth(1.0)
        c.line(margin, y, LABEL_W - margin, y)

        # Productos (todos en negrita para mejor visibilidad térmica)
        c.setFont("Helvetica-Bold", 8.5)
        for p in products_list:
            y -= 4.5 * mm
            c.drawString(margin, y, str(p["cantidad"]))
            
            # Truncar nombre si es muy largo
            nombre = p["nombre"]
            if len(nombre) > 18:
                nombre = nombre[:16] + ".."
            c.drawString(margin + 8 * mm, y, nombre)
            
            subtotal = float(p["subtotal"])
            c.drawRightString(LABEL_W - margin, y, f"${subtotal:.2f}")

        y -= 3 * mm
        c.setLineWidth(1.0)
        c.line(margin, y, LABEL_W - margin, y)

        # Total (negrita) e IVA
        y -= 5 * mm
        c.setFont("Helvetica-Bold", 8.5)
        total_val = float(sale_data['total'])
        iva_val = total_val - (total_val / 1.19)
        c.drawString(margin, y, "IVA (19% inc.):")
        c.drawRightString(LABEL_W - margin, y, f"${iva_val:.2f}")

        y -= 5 * mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "TOTAL:")
        c.drawRightString(LABEL_W - margin, y, f"${total_val:.2f}")

        # Politicas
        y -= 6 * mm
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(LABEL_W / 2, y, "Políticas de cambio:")
        y -= 3 * mm
        c.setFont("Helvetica-Bold", 6.5)
        c.drawCentredString(LABEL_W / 2, y, "Solo cambios en domicilio o regalo.")
        y -= 2.5 * mm
        c.drawCentredString(LABEL_W / 2, y, "Prendas medidas no tienen cambio.")
        y -= 2.5 * mm
        c.drawCentredString(LABEL_W / 2, y, "Traer factura de compra.")
        y -= 2.5 * mm
        c.drawCentredString(LABEL_W / 2, y, "Plazo de 2 dias habiles.")
        y -= 2.5 * mm
        c.drawCentredString(LABEL_W / 2, y, "Conservar estado y etiquetas.")
        y -= 2.5 * mm
        c.drawCentredString(LABEL_W / 2, y, "No hay devoluciones de dinero.")
        y -= 2.5 * mm
        c.drawCentredString(LABEL_W / 2, y, "Sujeto a disponibilidad.")

        # Mensaje final (negrita)
        y -= 6 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(LABEL_W / 2, y, "GRACIAS POR SU COMPRA!")
        
        c.save()
        return output_filename

