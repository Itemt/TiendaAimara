from models.product import ProductModel
from models.sale import SaleModel
from utils.printer_manager import PrinterManager
from views.custom_modals import show_error, show_success, ConfirmModal
import customtkinter as ctk

class POSController:
    def __init__(self, main_controller):
        self.main_controller = main_controller
        self.view = None
        self.cart = {} # dict of codigo: {product_info, cantidad, subtotal}
        
    def set_view(self, view):
        self.view = view
        
    def on_barcode_scanned(self, event=None):
        codigo = self.view.entry_codigo.get().strip()
        if codigo:
            self._add_to_cart(codigo)
        self.view.entry_codigo.delete(0, 'end')
        
    def on_add_product(self):
        self.on_barcode_scanned()
        
    def _add_to_cart(self, codigo):
        product = ProductModel.get_product_by_code(codigo)
        if not product:
            show_error("Error", "Producto no encontrado.")
            return
            
        # Check stock warning (without blocking Sale)
        stock_disp = product['stock']
        
        if codigo in self.cart:
            if self.cart[codigo]['cantidad'] + 1 > stock_disp:
                show_error("Sin Stock", f"No hay suficiente stock para el producto: {product['nombre']}")
                return
            self.cart[codigo]['cantidad'] += 1
            self.cart[codigo]['subtotal'] = self.cart[codigo]['cantidad'] * product['precio']
        else:
            if stock_disp < 1:
                show_error("Sin Stock", f"El producto {product['nombre']} se encuentra sin stock (0).")
                return
            self.cart[codigo] = {
                "codigo": product['codigo'],
                "nombre": product['nombre'],
                "precio": float(product['precio']),
                "cantidad": 1,
                "subtotal": float(product['precio'])
            }
            
            # Stock warning modal
            if stock_disp <= 5:
                self.view.notify_low_stock(product['nombre'], stock_disp)
                
        self.update_view()
        
    def clear_cart(self):
        self.cart = {}
        self.update_view()
        
    def update_view(self):
        items = list(self.cart.values())
        total = sum(item['subtotal'] for item in items)
        self.view.refresh_cart(items, total)
        
    def show_preview_modal(self):
        if not self.cart:
            show_error("Atención", "El carrito está vacío.")
            return
            
        items = list(self.cart.values())
        total = sum(item['subtotal'] for item in items)
        
        preview = ctk.CTkToplevel(self.view)
        preview.title("Vista Previa de Facturación")
        preview.geometry("500x600")
        preview.grab_set()
        
        preview.grid_columnconfigure(0, weight=1)
        preview.grid_rowconfigure(0, weight=1)
        
        frame = ctk.CTkScrollableFrame(preview)
        frame.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        
        lbl_head = ctk.CTkLabel(frame, text="FACTURA DIGITAL\nTIENDA AIMARA", font=ctk.CTkFont(size=20, weight="bold"), text_color="#FF69B4")
        lbl_head.pack(pady=10)
        
        for item in items:
            lbl_item = ctk.CTkLabel(frame, text=f"{item['nombre']} (x{item['cantidad']}) - ${item['subtotal']:.2f}")
            lbl_item.pack(anchor="w", padx=20)
            
        lbl_tot = ctk.CTkLabel(frame, text=f"TOTAL A PROCESAR: ${total:.2f}", font=ctk.CTkFont(size=18, weight="bold"))
        lbl_tot.pack(pady=20)
        
        btn_frame = ctk.CTkFrame(preview, fg_color="transparent")
        btn_frame.grid(row=1, column=0, pady=10)
        
        btn_confirm = ctk.CTkButton(btn_frame, text="Confirmar e Imprimir", fg_color="#FF69B4", hover_color="#FFB6C1", 
                                    command=lambda: self._confirm_sale(preview, items, total))
        btn_confirm.pack(side="left", padx=10)
        
        btn_back = ctk.CTkButton(btn_frame, text="Volver a Editar", fg_color="gray", command=lambda: preview.destroy())
        btn_back.pack(side="right", padx=10)

    def _confirm_sale(self, modal, items, total):
        success, id_venta_or_error = SaleModel.create_sale(items, total)
        if success:
            id_venta = id_venta_or_error
            sale_data = {"id_venta": id_venta, "total": total}
            # Termal Print
            PrinterManager.print_receipt(sale_data, items)
            show_success("Éxito", f"Venta {id_venta} confirmada e impresa.")
            modal.destroy()
            self.clear_cart()
            # Devolver foco al barcode
            self.view.entry_codigo.focus_set()
        else:
            show_error("Error", f"Fallo al procesar venta: {id_venta_or_error}")
