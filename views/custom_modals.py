import customtkinter as ctk

# Paleta Rosada de Tienda Aimara
COLOR_PRIMARY = "#FF69B4"      # Hot Pink
COLOR_SECONDARY = "#FFB6C1"    # Light Pink
COLOR_BACKGROUND_DARK = "#2B2B2B"
COLOR_BACKGROUND_LIGHT = "#FFFFFF"
COLOR_TEXT_DARK = "#FFFFFF"
COLOR_TEXT_LIGHT = "#000000"
COLOR_ERROR = "#FF4C4C"
COLOR_WARNING = "#FFA500"
COLOR_SUCCESS = "#4CAF50"

class CustomModal(ctk.CTkToplevel):
    def __init__(self, title, message, modal_type="info", callback=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.title(title)
        self.geometry("400x200")
        self.resizable(False, False)
        
        # Centrar ventana
        self.update_idletasks()
        try:
            x = (self.winfo_screenwidth() // 2) - (400 // 2)
            y = (self.winfo_screenheight() // 2) - (200 // 2)
            self.geometry(f"+{x}+{y}")
        except:
            pass
            
        self.grab_set()  # Modal - bloquea ventana principal
        self.attributes("-topmost", True)
        
        # Colores por tipo
        if modal_type == "error":
            color = COLOR_ERROR
        elif modal_type == "warning":
            color = COLOR_WARNING
        elif modal_type == "success":
            color = COLOR_SUCCESS
        else:
            color = COLOR_PRIMARY

        # UI
        self.frame = ctk.CTkFrame(self, corner_radius=10, fg_color=("gray95", "gray15"))
        self.frame.pack(padx=20, pady=20, fill="both", expand=True)

        self.lbl_title = ctk.CTkLabel(self.frame, text=title, font=ctk.CTkFont(size=18, weight="bold"), text_color=color)
        self.lbl_title.pack(pady=(15, 5))

        self.lbl_msg = ctk.CTkLabel(self.frame, text=message, font=ctk.CTkFont(size=14), wraplength=350)
        self.lbl_msg.pack(pady=(5, 15))

        self.btn_ok = ctk.CTkButton(
            self.frame, text="Aceptar", fg_color=COLOR_PRIMARY, 
            hover_color=COLOR_SECONDARY, text_color="white",
            command=self._on_accept
        )
        self.btn_ok.pack(pady=10)

        self.callback = callback

    def _on_accept(self):
        if self.callback:
            self.callback()
        self.destroy()

def show_error(title, message):
    modal = CustomModal(title, message, modal_type="error")
    modal.wait_window()

def show_warning(title, message):
    modal = CustomModal(title, message, modal_type="warning")
    modal.wait_window()

def show_success(title, message):
    modal = CustomModal(title, message, modal_type="success")
    modal.wait_window()

class ConfirmModal(ctk.CTkToplevel):
    def __init__(self, title, message, on_confirm, on_cancel=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.title(title)
        self.geometry("450x220")
        self.resizable(False, False)
        self.grab_set()
        self.attributes("-topmost", True)
        
        self.frame = ctk.CTkFrame(self, corner_radius=10)
        self.frame.pack(padx=20, pady=20, fill="both", expand=True)

        self.lbl_msg = ctk.CTkLabel(self.frame, text=message, font=ctk.CTkFont(size=14), wraplength=400)
        self.lbl_msg.pack(pady=20)

        self.btn_frame = ctk.CTkFrame(self.frame, fg_color="transparent")
        self.btn_frame.pack(pady=10, fill="x", padx=20)

        self.btn_confirm = ctk.CTkButton(
            self.btn_frame, text="Confirmar", fg_color=COLOR_PRIMARY, 
            hover_color=COLOR_SECONDARY, command=lambda: self._action(on_confirm)
        )
        self.btn_confirm.pack(side="left", padx=10, expand=True)

        self.btn_cancel = ctk.CTkButton(
            self.btn_frame, text="Cancelar", fg_color="gray", 
            hover_color="darkgray", command=lambda: self._action(on_cancel)
        )
        self.btn_cancel.pack(side="right", padx=10, expand=True)

    def _action(self, callback):
        if callback:
            callback()
        self.destroy()
