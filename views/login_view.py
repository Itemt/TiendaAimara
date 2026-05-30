import customtkinter as ctk
from models.user import UserModel
from views.custom_modals import show_error

class LoginView(ctk.CTkFrame):
    def __init__(self, master, controller):
        # Full screen frame over main app
        super().__init__(master, fg_color=("gray95", "gray15"))
        self.controller = controller
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Center box
        self.box = ctk.CTkFrame(self, corner_radius=15, width=400, height=500)
        self.box.grid(row=0, column=0)
        self.box.grid_propagate(False)
        self.box.grid_columnconfigure(0, weight=1)
        
        self.lbl_title = ctk.CTkLabel(self.box, text="TIENDA AIMARA", font=ctk.CTkFont(size=28, weight="bold"), text_color="#FF69B4")
        self.lbl_title.pack(pady=(50, 20))
        
        self.lbl_sub = ctk.CTkLabel(self.box, text="Acceda al Sistema de Punto de Venta", font=ctk.CTkFont(size=16))
        self.lbl_sub.pack(pady=(0, 30))
        
        self.entry_user = ctk.CTkEntry(self.box, placeholder_text="Usuario", width=250, height=40)
        self.entry_user.pack(pady=10)
        
        self.entry_pass = ctk.CTkEntry(self.box, placeholder_text="Contraseña", show="*", width=250, height=40)
        self.entry_pass.pack(pady=10)
        
        self.btn_login = ctk.CTkButton(self.box, text="Ingresar", fg_color="#FF69B4", hover_color="#FFB6C1", 
                                       width=250, height=45, font=ctk.CTkFont(weight="bold"), 
                                       command=self.controller.attemp_login)
        self.btn_login.pack(pady=30)
        
        # Bind enter key
        self.entry_pass.bind("<Return>", lambda e: self.controller.attemp_login())

    def get_credentials(self):
        return self.entry_user.get(), self.entry_pass.get()
