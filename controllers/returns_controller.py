from models.return_model import ReturnModel
from views.custom_modals import show_error, show_success, ConfirmModal

class ReturnsController:
    def __init__(self, main_controller):
        self.main_controller = main_controller
        self.view = None
        self.current_id_venta = None
        
    def set_view(self, view):
        self.view = view
        
    def on_search(self):
        id_venta = self.view.entry_search.get().strip()
        if not id_venta.isdigit():
            show_error("Error", "El número de factura debe ser numérico.")
            return
            
        self.current_id_venta = int(id_venta)
        details = ReturnModel.get_sale_details(self.current_id_venta)
        
        if not details:
            show_error("No encontrado", f"No se encontraron detalles para la Venta #{self.current_id_venta}")
            self.view.populate_details([])
            return
            
        self.view.populate_details(details)
        
    def on_process_return(self):
        selected = self.view.get_selected_item()
        if not selected:
            show_error("Selección Requerida", "Seleccione un producto de la tabla para devolver.")
            return
            
        # selected = [id_detalle, codigo, producto, cantidad_comprada, subtotal]
        codigo_producto = str(selected[1])
        cantidad_comprada = int(selected[3])
        
        cant_str = self.view.entry_cant.get().strip()
        motivo = self.view.entry_motivo.get().strip()
        
        if not cant_str.isdigit() or int(cant_str) <= 0:
            show_error("Error", "Ingrese una cantidad válida mayor a 0.")
            return
            
        cant = int(cant_str)
        if cant > cantidad_comprada:
            show_error("Error", f"No puede devolver más cantidad de la que se compró ({cantidad_comprada}).")
            return
            
        if not motivo:
            show_error("Error", "Debe proporcionar un motivo para la devolución.")
            return

        def confirmar():
            success, msg = ReturnModel.process_return(self.current_id_venta, codigo_producto, cant, motivo)
            if success:
                show_success("Devolución Exitosa", msg)
                self.on_reset()
            else:
                show_error("Error en Devolución", msg)

        ConfirmModal("Confirmar Devolución", f"¿Devolver {cant} de {selected[2]}?\nSe reingresará el stock al inventario.", confirmar)

    def on_reset(self):
        self.current_id_venta = None
        self.view.entry_search.delete(0, 'end')
        self.view.entry_cant.delete(0, 'end')
        self.view.entry_motivo.delete(0, 'end')
        self.view.populate_details([])
