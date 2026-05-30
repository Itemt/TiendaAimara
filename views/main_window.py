import customtkinter as ctk

class MainWindow(ctk.CTk):
    def __init__(self, main_controller):
        super().__init__()
        self.main_controller = main_controller
        self.title("Tienda Aimara - POS System")
        self.geometry("1100x700")
        
        # Color modes
        ctk.set_appearance_mode("System") # Claro/Oscuro nativo
        ctk.set_default_color_theme("blue")
        
        # Navigation
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        
        # Sidebar
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(5, weight=1)
        
        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="AIMARA", font=ctk.CTkFont(size=24, weight="bold"), text_color="#FF69B4")
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))
        
        self.btn_pos = ctk.CTkButton(self.sidebar_frame, text="Punto de Venta", fg_color="transparent", 
                                     text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                     command=lambda: self.main_controller.show_view("POS"))
        self.btn_pos.grid(row=1, column=0, pady=10, padx=20)
        
        self.btn_inv = ctk.CTkButton(self.sidebar_frame, text="Inventario", fg_color="transparent", 
                                     text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                     command=lambda: self.main_controller.show_view("INV"))
        self.btn_inv.grid(row=2, column=0, pady=10, padx=20)
        
        self.btn_ret = ctk.CTkButton(self.sidebar_frame, text="Devoluciones", fg_color="transparent", 
                                     text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                     command=lambda: self.main_controller.show_view("RET"))
        self.btn_ret.grid(row=3, column=0, pady=10, padx=20)

        self.btn_hist = ctk.CTkButton(self.sidebar_frame, text="Historial/Reportes", fg_color="transparent", 
                                     text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
                                     command=lambda: self.main_controller.show_view("HIST"))
        self.btn_hist.grid(row=4, column=0, pady=10, padx=20)
        
        # Modo Appearance
        self.appearance_mode_optionemenu = ctk.CTkOptionMenu(self.sidebar_frame, values=["Light", "Dark", "System"],

                                                               command=self.change_appearance_mode_event)
        self.appearance_mode_optionemenu.grid(row=6, column=0, padx=20, pady=20, sticky="s")
        
        # Central frame to hold dynamic views
        self.content_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.content_frame.grid(row=0, column=1, sticky="nsew", padx=10, pady=10)
        
    def change_appearance_mode_event(self, new_appearance_mode: str):
        ctk.set_appearance_mode(new_appearance_mode)
        
    def set_content_view(self, view_frame):
        # Limpiar
        for widget in self.content_frame.winfo_children():
            widget.destroy()
        # Mostrar nueva
        view_frame.pack(in_=self.content_frame, fill="both", expand=True)
