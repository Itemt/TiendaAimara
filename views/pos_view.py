import customtkinter as ctk
from views.custom_modals import show_error, show_warning, show_success, ConfirmModal
from tkinter import ttk

class POSView(ctk.CTkFrame):
    def __init__(self, master, controller):
        super().__init__(master, fg_color="transparent")
        self.controller = controller
        
        # Grid config
        self.grid_columnconfigure(0, weight=3)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(1, weight=1)
        
        # Titulo
        self.lbl_title = ctk.CTkLabel(self, text="PUNTO DE VENTA (POS)", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF69B4")
        self.lbl_title.grid(row=0, column=0, columnspan=2, pady=10)
        
        # Panel Izquierdo (Mesa de Trabajo / Productos)
        self.left_panel = ctk.CTkFrame(self)
        self.left_panel.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        self.left_panel.grid_rowconfigure(1, weight=1)
        self.left_panel.grid_columnconfigure(0, weight=1)
        
        # Entrada de Código de Barras (El Lector Físico escribe aquí y da Enter)
        self.entry_frame = ctk.CTkFrame(self.left_panel, fg_color="transparent")
        self.entry_frame.grid(row=0, column=0, sticky="ew", pady=10, padx=10)
        
        self.lbl_codigo = ctk.CTkLabel(self.entry_frame, text="Código de barras:", font=ctk.CTkFont(weight="bold"))
        self.lbl_codigo.pack(side="left", padx=5)
        
        self.entry_codigo = ctk.CTkEntry(self.entry_frame, width=300)
        self.entry_codigo.pack(side="left", padx=5)
        # Evento ENTER físico
        self.entry_codigo.bind("<Return>", self.controller.on_barcode_scanned)
        # Focus por defecto
        self.entry_codigo.focus_set()
        
        self.btn_add = ctk.CTkButton(self.entry_frame, text="Agregar", command=self.controller.on_add_product)
        self.btn_add.pack(side="left", padx=5)
        
        # Treeview para carrito
        self.cart_tree = ttk.Treeview(self.left_panel, columns=("Codigo", "Nombre", "Cant", "Precio", "Subtotal"), show="headings")
        self.cart_tree.heading("Codigo", text="Código")
        self.cart_tree.heading("Nombre", text="Producto")
        self.cart_tree.heading("Cant", text="Cantidad")
        self.cart_tree.heading("Precio", text="Precio U.")
        self.cart_tree.heading("Subtotal", text="Subtotal")
        
        self.cart_tree.column("Codigo", width=100)
        self.cart_tree.column("Nombre", width=250)
        self.cart_tree.column("Cant", width=80, anchor="center")
        self.cart_tree.column("Precio", width=100, anchor="e")
        self.cart_tree.column("Subtotal", width=100, anchor="e")
        self.cart_tree.grid(row=1, column=0, sticky="nsew", padx=10, pady=5)
        
        # Panel Derecho (Resumen y Cobro)
        self.right_panel = ctk.CTkFrame(self)
        self.right_panel.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)
        
        self.lbl_resumen = ctk.CTkLabel(self.right_panel, text="RESUMEN", font=ctk.CTkFont(size=20, weight="bold"))
        self.lbl_resumen.pack(pady=20)
        
        self.lbl_total_txt = ctk.CTkLabel(self.right_panel, text="TOTAL A PAGAR:", font=ctk.CTkFont(size=16))
        self.lbl_total_txt.pack(pady=5)
        
        self.lbl_total = ctk.CTkLabel(self.right_panel, text="$0.00", font=ctk.CTkFont(size=36, weight="bold"), text_color="#FF69B4")
        self.lbl_total.pack(pady=10)
        
        self.btn_cobrar = ctk.CTkButton(self.right_panel, text="COBRAR (Preview)", font=ctk.CTkFont(size=18, weight="bold"), 
                                        fg_color="#FF69B4", hover_color="#FFB6C1", height=50,
                                        command=self.controller.show_preview_modal)
        self.btn_cobrar.pack(pady=30, fill="x", padx=20)
        
        self.btn_clear = ctk.CTkButton(self.right_panel, text="Limpiar Carrito", fg_color="gray", command=self.controller.clear_cart)
        self.btn_clear.pack(pady=5, fill="x", padx=20)

    def refresh_cart(self, cart_items, total):
        for item in self.cart_tree.get_children():
            self.cart_tree.delete(item)
            
        for p in cart_items:
            # p es un dict: codigo, nombre, cantidad, precio, subtotal
            self.cart_tree.insert("", "end", values=(
                p["codigo"], p["nombre"], p["cantidad"], 
                f"${p['precio']:.2f}", f"${p['subtotal']:.2f}"
            ))
            
        self.lbl_total.configure(text=f"${total:.2f}")

    def notify_low_stock(self, product_name, current_stock):
        show_warning("Stock Bajo", f"El producto '{product_name}' tiene poco stock: Quedan {current_stock} unidad(es).")
