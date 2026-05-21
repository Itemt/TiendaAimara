from models.sale import SaleModel
from views.custom_modals import show_error, show_success, ConfirmModal

class HistoryController:
    def __init__(self, main_controller):
        self.main_controller = main_controller
        self.view = None
        self.ventas = []
        
    def set_view(self, view):
        self.view = view
        self.load_data()
        
    def load_data(self):
        self.ventas = SaleModel.get_all_sales()
        self.view.populate_sales(self.ventas)
        
        total_monto = sum(v[2] for v in self.ventas)
        total_transacciones = len(self.ventas)
        self.view.update_kpis(total_monto, total_transacciones)

    def on_sale_select(self, event):
        pass # Optional: Muestra un modal con los detalles de esa venta si lo desean

    def on_anular_venta(self):
        selected = self.view.tree_ventas.selection()
        if not selected:
            show_error("Selección Requerida", "Seleccione una venta para anularla.")
            return
            
        v = self.view.tree_ventas.item(selected[0])['values']
        id_venta = v[0]
        
        def confirm():
            success, msg = SaleModel.delete_sale(id_venta)
            if success:
                show_success("Anulada", msg)
                self.load_data()
            else:
                show_error("Error", msg)
                
        ConfirmModal("Anular Venta", f"¿Está seguro de anular la venta #{id_venta}?\nSe eliminarán los detalles, pero el stock NO volverá automáticamente por este medio (Use el módulo Devoluciones para retornos parciales o exactos).", confirm)
