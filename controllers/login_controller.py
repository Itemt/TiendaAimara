from models.user import UserModel
from views.custom_modals import show_error

class LoginController:
    def __init__(self, main_controller):
        self.main_controller = main_controller
        self.view = None
        
    def set_view(self, view):
        self.view = view
        
    def attemp_login(self):
        user, pwd = self.view.get_credentials()
        if not user or not pwd:
            show_error("Error", "Ingrese usuario y contraseña.")
            return
            
        auth_user = UserModel.verify_login(user, pwd)
        if auth_user:
            self.main_controller.on_login_success(auth_user)
        else:
            show_error("Credenciales Inválidas", "Usuario o contraseña incorrectos.")
