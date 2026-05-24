import customtkinter as ctk
from tkinter import ttk
from views.custom_modals import show_error

class ReturnsView(ctk.CTkFrame):
    def __init__(self, master, controller):
        super().__init__(master, fg_color="transparent")
        self.controller = controller

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        self.lbl_title = ctk.CTkLabel(self, text="CONTROL DE DEVOLUCIONES", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF69B4")
        self.lbl_title.grid(row=0, column=0, pady=20)
        
        # Búsqueda
        self.search_frame = ctk.CTkFrame(self)
        self.search_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=10)
        
        self.lbl_search = ctk.CTkLabel(self.search_frame, text="Número de Factura / Ticket (id_venta):")
        self.lbl_search.pack(side="left", padx=10)
        
        self.entry_search = ctk.CTkEntry(self.search_frame, width=200)
        self.entry_search.pack(side="left", padx=10)
        
        self.btn_search = ctk.CTkButton(self.search_frame, text="Buscar Detalles", command=self.controller.on_search, fg_color="#FF69B4")
        self.btn_search.pack(side="left", padx=10)
        
        self.btn_refresh = ctk.CTkButton(self.search_frame, text="Actualizar", command=self.controller.on_reset, fg_color="#FF69B4")
        self.btn_refresh.pack(side="left", padx=10)
        
        # Tabla de Detalles (id_detalle, codigo, nombre, cantidad, subtotal)
        self.details_tree = ttk.Treeview(self, columns=("ID Detalle", "Codigo", "Producto", "Cantidad Comprada", "Subtotal"), show="headings")
        self.details_tree.heading("ID Detalle", text="ID Detalle")
        self.details_tree.heading("Codigo", text="Código")
        self.details_tree.heading("Producto", text="Producto")
        self.details_tree.heading("Cantidad Comprada", text="Cant.")
        self.details_tree.heading("Subtotal", text="Subtotal")
        self.details_tree.grid(row=2, column=0, sticky="nsew", padx=20, pady=10)
        
        # Controles de devolución
        self.action_frame = ctk.CTkFrame(self)
        self.action_frame.grid(row=3, column=0, sticky="ew", padx=20, pady=20)
        
        self.lbl_cant = ctk.CTkLabel(self.action_frame, text="Cantidad a devolver:")
        self.lbl_cant.grid(row=0, column=0, padx=10, pady=10)
        self.entry_cant = ctk.CTkEntry(self.action_frame, width=100)
        self.entry_cant.grid(row=0, column=1, padx=10)
        
        self.lbl_motivo = ctk.CTkLabel(self.action_frame, text="Motivo:")
        self.lbl_motivo.grid(row=0, column=2, padx=10)
        self.entry_motivo = ctk.CTkEntry(self.action_frame, width=250)
        self.entry_motivo.grid(row=0, column=3, padx=10)
        
        self.btn_return = ctk.CTkButton(self.action_frame, text="Procesar Devolución", command=self.controller.on_process_return, fg_color="#FF69B4")
        self.btn_return.grid(row=0, column=4, padx=20)
        
    def populate_details(self, details_list):
        for item in self.details_tree.get_children():
            self.details_tree.delete(item)
            
        for row in details_list:
            # row: (id_detalle, codigo_producto, nombre, categoria, talla, precio, cantidad, subtotal, cantidad_devuelta)
            # We want Treeview columns: ("ID Detalle", "Codigo", "Producto", "Cantidad Comprada", "Subtotal")
            # For "Cantidad Comprada", we show remaining quantity: row[6] - row[8]
            remaining_qty = max(int(row[6]) - int(row[8]), 0)
            self.details_tree.insert("", "end", values=(row[0], row[1], row[2], remaining_qty, row[7]))

    def get_selected_item(self):
        selected = self.details_tree.selection()
        if not selected:
            return None
        return self.details_tree.item(selected[0])['values']
