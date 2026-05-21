import customtkinter as ctk
from tkinter import ttk

class InventoryView(ctk.CTkFrame):
    def __init__(self, master, controller):
        super().__init__(master, fg_color="transparent")
        self.controller = controller

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self.lbl_title = ctk.CTkLabel(self, text="GESTIÓN DE INVENTARIO", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF69B4")
        self.lbl_title.grid(row=0, column=0, columnspan=2, pady=15)
        
        # Panel Izquierdo: Formulario
        self.form_frame = ctk.CTkFrame(self, width=300)
        self.form_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        
        # Campos
        fields = ["Código:", "Nombre:", "Categoría:", "Talla:", "Precio:", "Stock:"]
        self.entries = {}
        for i, field in enumerate(fields):
            lbl = ctk.CTkLabel(self.form_frame, text=field)
            lbl.grid(row=i, column=0, sticky="w", padx=10, pady=(15, 0))
            
            ent = ctk.CTkEntry(self.form_frame, width=200)
            ent.grid(row=i, column=1, padx=10, pady=(15, 0))
            self.entries[field] = ent
            
        # Controles
        self.btn_frame = ctk.CTkFrame(self.form_frame, fg_color="transparent")
        self.btn_frame.grid(row=len(fields), column=0, columnspan=2, pady=25)
        
        self.btn_save = ctk.CTkButton(self.btn_frame, text="Guardar/Nuevo", fg_color="#FF69B4", command=self.controller.on_save)
        self.btn_save.pack(fill="x", pady=5)
        
        self.btn_update = ctk.CTkButton(self.btn_frame, text="Actualizar", fg_color="#FFA500", command=self.controller.on_update)
        self.btn_update.pack(fill="x", pady=5)
        
        self.btn_delete = ctk.CTkButton(self.btn_frame, text="Eliminar", fg_color="#FF4C4C", command=self.controller.on_delete)
        self.btn_delete.pack(fill="x", pady=5)
        
        self.btn_clear = ctk.CTkButton(self.btn_frame, text="Limpiar Formulario", fg_color="gray", command=self.controller.clear_form)
        self.btn_clear.pack(fill="x", pady=5)
        
        # Acciones Extra
        self.btn_import = ctk.CTkButton(self.form_frame, text="Importar CSV", command=self.controller.on_import_csv)
        self.btn_import.grid(row=len(fields)+1, column=0, columnspan=2, pady=5, padx=10, sticky="ew")

        self.btn_stickers = ctk.CTkButton(self.form_frame, text="Imprimir Autoadhesivos", command=self.controller.on_print_stickers)
        self.btn_stickers.grid(row=len(fields)+2, column=0, columnspan=2, pady=5, padx=10, sticky="ew")
        
        # Panel Derecho: Treeview (Tabla)
        self.table_frame = ctk.CTkFrame(self)
        self.table_frame.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)
        self.table_frame.grid_columnconfigure(0, weight=1)
        self.table_frame.grid_rowconfigure(1, weight=1)
        
        self.search_entry = ctk.CTkEntry(self.table_frame, placeholder_text="Buscar producto...")
        self.search_entry.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        self.search_entry.bind("<KeyRelease>", self.controller.on_search)

        self.tree = ttk.Treeview(self.table_frame, columns=("Codigo", "Nombre", "Categoria", "Talla", "Precio", "Stock"), show="headings")
        self.tree.heading("Codigo", text="Código")
        self.tree.heading("Nombre", text="Nombre")
        self.tree.heading("Categoria", text="Categoría")
        self.tree.heading("Talla", text="Talla")
        self.tree.heading("Precio", text="Precio")
        self.tree.heading("Stock", text="Stock")
        
        self.tree.column("Codigo", width=120)
        self.tree.column("Nombre", width=250)
        self.tree.column("Categoria", width=120)
        self.tree.column("Talla", width=80)
        self.tree.column("Precio", width=100)
        self.tree.column("Stock", width=80)
        
        self.tree.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        self.tree.bind("<<TreeviewSelect>>", self.controller.on_tree_select)
        
    def populate_table(self, data):
        for item in self.tree.get_children():
            self.tree.delete(item)
        for row in data:
            self.tree.insert("", "end", values=row)

    def get_form_data(self):
        return {
            "codigo": self.entries["Código:"].get().strip(),
            "nombre": self.entries["Nombre:"].get().strip(),
            "categoria": self.entries["Categoría:"].get().strip(),
            "talla": self.entries["Talla:"].get().strip(),
            "precio": self.entries["Precio:"].get().strip(),
            "stock": self.entries["Stock:"].get().strip()
        }
        
    def set_form_data(self, data):
        self.controller.clear_form()
        self.entries["Código:"].insert(0, data[0])
        self.entries["Nombre:"].insert(0, data[1])
        self.entries["Categoría:"].insert(0, data[2])
        self.entries["Talla:"].insert(0, data[3])
        self.entries["Precio:"].insert(0, data[4])
        self.entries["Stock:"].insert(0, data[5])
