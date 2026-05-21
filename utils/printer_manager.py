import os

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
        receipt_text += "=========================\n"
        for p in products_list:
            receipt_text += f"{p['nombre']} (x{p['cantidad']}) - ${p['subtotal']}\n"
        receipt_text += "=========================\n"
        receipt_text += f"TOTAL: ${sale_data['total']}\n"
        receipt_text += "    GRACIAS POR SU COMPRA!   \n\n\n"

        # Guardar último ticket junto al ejecutable (o en el proyecto en dev)
        import sys

        if getattr(sys, "frozen", False):
            receipt_path = str(
                Path(sys.executable).resolve().parent / "last_receipt.txt"
            )
        else:
            receipt_path = str(
                Path(__file__).resolve().parent.parent / "last_receipt.txt"
            )
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
        Genera PDF de etiquetas para impresora térmica de 58mm.
        Cada producto ocupa una página propia (58 x 32 mm).
        """
        LABEL_W = 58 * mm
        LABEL_H = 32 * mm
        SIDE = 2.5 * mm

        c = canvas.Canvas(output_filename, pagesize=(LABEL_W, LABEL_H))

        for idx, p in enumerate(products_list):
            if idx > 0:
                c.showPage()
                c.setPageSize((LABEL_W, LABEL_H))

            codigo = str(p.get("codigo", ""))
            nombre = str(p.get("nombre", ""))
            talla = str(p.get("talla") or "").strip()
            precio = float(p.get("precio", 0) or 0)

            # Truncar nombre si supera el ancho imprimible (~26 chars a 7pt)
            if len(nombre) > 26:
                nombre = nombre[:25] + "\u2026"

            y = LABEL_H - SIDE

            # Nombre (negrita)
            c.setFont("Helvetica-Bold", 7)
            y -= 8
            c.drawString(SIDE, y, nombre)

            # Talla / Precio
            c.setFont("Helvetica", 6)
            detail = f"Talla: {talla}  \u2022  ${precio:.2f}"
            y -= 7
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

                bc_h = 12 * mm
                bc_w = LABEL_W - 2 * SIDE
                bc_y = y - bc_h - 1.5 * mm
                c.drawImage(bc_file, SIDE, bc_y, width=bc_w, height=bc_h)

                # Código en texto bajo el barcode
                c.setFont("Helvetica", 5)
                c.drawCentredString(LABEL_W / 2, bc_y - 5, codigo)

                if os.path.exists(bc_file):
                    os.remove(bc_file)

            except Exception:
                c.setFont("Helvetica", 6)
                y -= 10
                c.drawCentredString(LABEL_W / 2, y, f"[{codigo}]")

        c.save()
        return output_filename
