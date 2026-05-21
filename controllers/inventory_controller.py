import csv
import time
from tkinter import filedialog
from models.product import ProductModel
from views.custom_modals import show_error, show_success, show_warning, ConfirmModal
from utils.printer_manager import PrinterManager

class InventoryController:
    def __init__(self, main_controller):
        self.main_controller = main_controller
        self.view = None
        self.all_products = []
        
    def set_view(self, view):
        self.view = view
        self.load_data()
        
    def load_data(self):
        self.all_products = ProductModel.get_all_products()
        self.view.populate_table(self.all_products)
        
    def clear_form(self):
        for ent in self.view.entries.values():
            ent.delete(0, 'end')
            
    def on_save(self):
        data = self.view.get_form_data()
        if not data["codigo"] or not data["nombre"] or not data["precio"] or not data["stock"]:
            show_error("Error", "Faltan campos obligatorios (Código, Nombre, Precio, Stock).")
            return
            
        try:
            precio = float(data["precio"])
            stock = int(data["stock"])
        except ValueError:
            show_error("Error", "Precio debe ser número decimal y Stock entero.")
            return

        success, msg = ProductModel.add_product(
            data["codigo"], data["nombre"], data["categoria"], 
            data["talla"], precio, stock
        )
        if success:
            show_success("Éxito", msg)
            self.clear_form()
            self.load_data()
        else:
            show_error("Error", msg)

    def on_update(self):
        data = self.view.get_form_data()
        if not data["codigo"]:
            show_error("Error", "Seleccione un producto para actualizar.")
            return
            
        try:
            precio = float(data["precio"])
            stock = int(data["stock"])
        except ValueError:
            show_error("Error", "Precio y Stock numéricos.")
            return

        success, msg = ProductModel.update_product(
            data["codigo"], data["nombre"], data["categoria"], 
            data["talla"], precio, stock
        )
        if success:
            show_success("Éxito", msg)
            self.clear_form()
            self.load_data()
        else:
            show_error("Error", msg)

    def on_delete(self):
        data = self.view.get_form_data()
        if not data["codigo"]:
            show_error("Error", "Seleccione un producto para eliminar.")
            return
            
        def confirm():
            success, msg = ProductModel.delete_product(data["codigo"])
            if success:
                show_success("Éxito", msg)
                self.clear_form()
                self.load_data()
            else:
                show_error("Error", msg)
                
        ConfirmModal("Eliminar", f"¿Eliminar definitivamente el producto {data['codigo']}?", confirm)

    def on_tree_select(self, event):
        selected = self.view.tree.selection()
        if selected:
            item = self.view.tree.item(selected[0])['values']
            self.view.set_form_data(item)

    def on_search(self, event):
        term = self.view.search_entry.get().lower()
        filtered = [p for p in self.all_products if term in str(p[0]).lower() or term in str(p[1]).lower()]
        self.view.populate_table(filtered)

    def on_import_csv(self):
        # filedialog nativo para seleccionar la ruta, los modales de aviso son custom
        filepath = filedialog.askopenfilename(filetypes=[("CSV files", "*.csv")])
        if not filepath:
            return
            
        # código, nombre, categoría, talla, precio, stock
        added = 0
        errors = 0
        try:
            with open(filepath, newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None) # skip header
                for row in reader:
                    if len(row) >= 6:
                        codigo, nombre, cat, talla, prec, stock = row[0:6]
                        # auto-generar secuencial si código está vacío
                        if not codigo.strip():
                            codigo = f"AUT-{int(time.time()*1000)}"
                            time.sleep(0.001)
                        try:
                            sc, _ = ProductModel.add_product(codigo, nombre, cat, talla, float(prec), int(stock))
                            if sc: added += 1
                            else: errors += 1
                        except:
                            errors += 1
            show_success("Importación", f"Importación finalizada.\nAgregados: {added}\nErrores/Duplicados: {errors}")
            self.load_data()
        except Exception as e:
            show_error("Error al importar", str(e))

    def on_print_stickers(self):
        # Preparar datos de todos los productos O de los filtrados (aquí usamos los visibles en tabla)
        visualizadas = []
        for child in self.view.tree.get_children():
            v = self.view.tree.item(child)["values"]
            visualizadas.append({
                "codigo": str(v[0]), "nombre": str(v[1]), 
                "talla": str(v[3]), "precio": float(v[4])
            })
            
        if not visualizadas:
            show_warning("Advertencia", "No hay productos en la lista para imprimir.")
            return
            
        def proc_print():
            try:
                PrinterManager.generate_stickers_pdf(visualizadas)
                show_success("Éxito", "PDF de autoadhesivos generado ('stickers_a4.pdf').")
            except Exception as e:
                show_error("Error", f"Error al generar PDF: {e}")
                
        ConfirmModal("Imprimir Etiquetas", f"Se generarán etiquetas para {len(visualizadas)} productos.", proc_print)
