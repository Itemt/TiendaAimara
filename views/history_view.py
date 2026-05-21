import customtkinter as ctk
from tkinter import ttk

class HistoryView(ctk.CTkFrame):
    def __init__(self, master, controller):
        super().__init__(master, fg_color="transparent")
        self.controller = controller

        self.grid_columnconfigure(0, weight=2)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self.lbl_title = ctk.CTkLabel(self, text="HISTORIAL Y REPORTES FINANCIEROS", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF69B4")
        self.lbl_title.grid(row=0, column=0, columnspan=2, pady=15)
        
        # Tabla Principal (Ventas)
        self.table_frame = ctk.CTkFrame(self)
        self.table_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        self.table_frame.grid_columnconfigure(0, weight=1)
        self.table_frame.grid_rowconfigure(1, weight=1)
        
        self.lbl_ventas = ctk.CTkLabel(self.table_frame, text="Registro de Ventas", font=ctk.CTkFont(size=16, weight="bold"))
        self.lbl_ventas.grid(row=0, column=0, pady=5)
        
        self.tree_ventas = ttk.Treeview(self.table_frame, columns=("ID", "Fecha", "Total"), show="headings")
        self.tree_ventas.heading("ID", text="Ticket #")
        self.tree_ventas.heading("Fecha", text="Fecha / Hora")
        self.tree_ventas.heading("Total", text="Total Venta")
        
        self.tree_ventas.column("ID", width=100, anchor="center")
        self.tree_ventas.column("Fecha", width=250, anchor="center")
        self.tree_ventas.column("Total", width=150, anchor="e")
        self.tree_ventas.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        
        self.tree_ventas.bind("<<TreeviewSelect>>", self.controller.on_sale_select)
        
        # Panel Derecho (Resumen y Acciones)
        self.right_panel = ctk.CTkFrame(self)
        self.right_panel.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)
        
        self.lbl_res_title = ctk.CTkLabel(self.right_panel, text="Kpi & Resumen", font=ctk.CTkFont(size=18, weight="bold"))
        self.lbl_res_title.pack(pady=20)
        
        self.lbl_total_ventas = ctk.CTkLabel(self.right_panel, text="Monto Total Ventas: $0.00", font=ctk.CTkFont(size=16))
        self.lbl_total_ventas.pack(pady=10)
        
        self.lbl_conteo_ventas = ctk.CTkLabel(self.right_panel, text="Total Transacciones: 0", font=ctk.CTkFont(size=16))
        self.lbl_conteo_ventas.pack(pady=10)
        
        self.btn_refresh = ctk.CTkButton(self.right_panel, text="Actualizar Datos", fg_color="#FF69B4", command=self.controller.load_data)
        self.btn_refresh.pack(pady=20, fill="x", padx=20)
        
        self.btn_anular = ctk.CTkButton(self.right_panel, text="Anular Venta Seleccionada", fg_color="#FF4C4C", command=self.controller.on_anular_venta)
        self.btn_anular.pack(pady=10, fill="x", padx=20)

    def populate_sales(self, data):
        for item in self.tree_ventas.get_children():
            self.tree_ventas.delete(item)
        for row in data:
            # ID, Fecha, Total
            self.tree_ventas.insert("", "end", values=(row[0], row[1], f"${row[2]:.2f}"))
            
    def update_kpis(self, total_monto, total_transacciones):
        self.lbl_total_ventas.configure(text=f"Monto Ingresos: ${total_monto:.2f}")
        self.lbl_conteo_ventas.configure(text=f"Total Transacciones: {total_transacciones}")
