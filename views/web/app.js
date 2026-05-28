const state = {
  user: null,
  dashboard: null,
  products: [],
  cart: [],
  selectedProductCode: null,
  selectedReturnTicket: null,
  selectedReturnRow: null,
  selectedHistorySale: null,
  theme: "light",
  users: [],
  selectedForPrint: new Set(),
  // Pago
  selectedPaymentMethod: "Efectivo",
  canceloAmount: 0,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function apiCall(method, ...args) {
  const payload = args.length === 1 ? args[0] : args;
  const response = await fetch(`/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (data && data.ok === false) {
    throw new Error(data.message || "Operación fallida.");
  }
  return data;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function printReceiptDirect(saleId, total, items, metodoPago, cancelo) {
  const printWindow = window.open('', '_blank', 'width=620,height=800');
  if (!printWindow) {
    alert('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.');
    return;
  }
  const fmt = (value) => '$' + Math.round(Number(value || 0)).toLocaleString('es-CO');
  metodoPago = metodoPago || 'Efectivo';
  cancelo = Number(cancelo) || total;
  const cambio = Math.max(0, cancelo - total);
  const cajero = (state.user && state.user.username) ? state.user.username.toUpperCase() : 'CAJERO';

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Tabla de productos estilo DIAN: # | Descripción | Cant | V.Unit | Total
  const itemRows = items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${String(item.nombre).toUpperCase()}</td>
      <td style="text-align:center">${item.cantidad}</td>
      <td style="text-align:right">${fmt(item.precio)}</td>
      <td style="text-align:right">${fmt(item.subtotal)}</td>
    </tr>
  `).join('');

  const medioPagoLabel = metodoPago === 'Datáfono' ? 'DATÁFONO' :
                         metodoPago === 'Transferencia' ? 'TRANSFERENCIA' : 'EFECTIVO';

  const html = `
    <html>
    <head>
      <title>Ticket #${saleId}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body {
          width: 58mm;
          margin: 0;
          padding: 3mm 3mm 10mm 3mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 9.5px;
          font-weight: bold;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .center { text-align: center; }
        .right  { text-align: right; }
        .bold   { font-weight: 900; }
        .title  { font-size: 13px; font-weight: 900; letter-spacing: 0.5px; margin: 2px 0; }
        .sep    { border-top: 1px dashed #000; margin: 4px 0; }
        .sep2   { border-top: 2px solid #000; margin: 4px 0; }
        table   { width: 100%; border-collapse: collapse; font-size: 8.5px; }
        th      { font-size: 8px; border-bottom: 1px solid #000; padding: 2px 1px; }
        td      { padding: 2px 1px; vertical-align: top; }
        .tot-row { display: flex; justify-content: space-between; margin: 1.5px 0; font-size: 9px; }
        .tot-row.big { font-size: 11px; font-weight: 900; margin-top: 3px; }
        .badge  { border: 1.5px solid #000; padding: 2px 6px; display: inline-block; margin: 3px 0; font-size: 9px; }
        .pago-row { display: flex; justify-content: space-between; font-size: 9px; margin: 1.5px 0; }
      </style>
    </head>
    <body>
      <!-- ENCABEZADO -->
      <div class="center">
        <div class="title">AIMARA MODA</div>
        <div>NIT: 700378458</div>
        <div>Calle 50 #1-7 Barrancabermeja</div>
        <div>Tel: +57 311 837 1495</div>
        <div>IG: @Aimara_ModaFashion09</div>
      </div>
      <div class="sep2"></div>
      <div style="font-size:8px; line-height:1.5;">
        <div>Tipo Contribuyente: Persona Natural</div>
        <div>Responsabilidad Trib.: No aplica</div>
        <div>Régimen Fiscal: R-99-PN</div>
        <div>Tipo de Operación: Estándar</div>
      </div>
      <div class="sep"></div>

      <!-- INFO TICKET -->
      <div style="display:flex; justify-content:space-between;">
        <span class="bold">Sistema POS #${saleId}</span>
        <span>${dateStr}</span>
      </div>
      <div>Hora: ${timeStr}</div>
      <div class="sep"></div>

      <!-- TABLA PRODUCTOS -->
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align:left">Descripción</th>
            <th>C/N</th>
            <th style="text-align:right">V/Uni</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="sep2"></div>

      <!-- TOTALES -->
      <div class="tot-row"><span>TOTAL PRODUCTOS:</span><span>${items.length}</span></div>
      <div class="tot-row big"><span>TOTAL:</span><span>${fmt(total)}</span></div>
      <div class="tot-row"><span>CANCELO:</span><span>${fmt(cancelo)}</span></div>
      <div class="tot-row"><span>CAMBIO:</span><span>${fmt(cambio)}</span></div>
      <div class="sep"></div>

      <!-- FORMA DE PAGO -->
      <div class="center"><div class="badge">✓ ESTADO ACEPTADA</div></div>
      <div class="center bold" style="margin:2px 0; font-size:9.5px;">FORMA DE PAGO</div>
      <div class="pago-row"><span>FORMA DE PAGO:</span><span>CONTADO</span></div>
      <div class="pago-row"><span>MEDIO DE PAGO:</span><span>${medioPagoLabel}</span></div>
      <div class="pago-row big"><span style="font-size:11px;font-weight:900;">TOTAL:</span><span style="font-size:11px;font-weight:900;">${fmt(total)}</span></div>
      <div class="sep"></div>

      <!-- PIE -->
      <div>CAJERO: ${cajero}</div>
      <div>VENDEDOR: ${cajero}</div>
      <div class="sep2"></div>
      <div class="center" style="font-size:8px; margin-top:4px;">
        <div>Conserve este ticket para cambios.</div>
        <div>Plazo: 15 días. Etiquetas originales.</div>
        <div>¡GRACIAS POR SU COMPRA!</div>
      </div>

      <script>
        window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 600); };
      <\/script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

async function printThermalStickersDirect(products) {
  showToast("Generando códigos de barra...");
  const productsWithBarcodes = await Promise.all(products.map(async (p) => {
    try {
      const response = await apiCall("get_barcode_base64", { codigo: p.codigo });
      return { ...p, barcodeSrc: response.data };
    } catch (e) {
      return { ...p, barcodeSrc: "" };
    }
  }));
  
  const printWindow = window.open('', '_blank', 'width=600,height=600');
  const itemsHtml = productsWithBarcodes.map(p => `
    <div class="sticker-item">
      <div class="product-name">${p.nombre.substring(0, 26)}</div>
      <div class="product-detail">Talla: ${p.talla || ''} &bull; $${Number(p.precio).toFixed(2)}</div>
      ${p.barcodeSrc ? `<img class="barcode-img" src="${p.barcodeSrc}" />` : `<div style="height: 12mm; border: 1px dashed #ccc; display: grid; place-items: center; font-size: 8px; font-weight: bold;">[Sin Código]</div>`}
      <div class="product-code">${p.codigo}</div>
    </div>
  `).join('');
  
  const html = `
    <html>
    <head>
      <title>Imprimir Stickers Facturera</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 0;
        }
        body {
          width: 58mm;
          min-height: 60mm; /* Fuerza la orientación vertical/portrait en Chrome para tiras cortas */
          margin: 0;
          padding: 2mm 2mm 6mm 2mm;
          font-family: Arial, Helvetica, sans-serif;
          background: #fff;
          color: #000;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .sticker-item {
          width: 100%;
          height: 30mm;
          box-sizing: border-box;
          padding: 2mm 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px dashed #000;
          page-break-inside: avoid;
        }
        .sticker-item:last-child {
          border-bottom: none;
        }
        .product-name {
          font-size: 7.5pt;
          font-weight: bold;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          line-height: 1.2;
        }
        .product-detail {
          font-size: 6.5pt;
          font-weight: bold;
          text-align: center;
          width: 100%;
          line-height: 1.2;
        }
        .barcode-img {
          width: 90%;
          height: 12mm;
          display: block;
          margin: 2px auto;
        }
        .product-code {
          font-size: 6pt;
          font-weight: bold;
          text-align: center;
          width: 100%;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      ${itemsHtml}
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

async function printA4StickersDirect(products) {
  showToast("Generando códigos de barra...");
  const productsWithBarcodes = await Promise.all(products.map(async (p) => {
    try {
      const response = await apiCall("get_barcode_base64", { codigo: p.codigo });
      return { ...p, barcodeSrc: response.data };
    } catch (e) {
      return { ...p, barcodeSrc: "" };
    }
  }));
  
  const printWindow = window.open('', '_blank', 'width=800,height=800');
  const stickersHtml = productsWithBarcodes.map(p => `
    <div class="sticker-card">
      <div class="product-name">Producto: ${p.nombre}</div>
      <div class="product-detail">Talla: ${p.talla || ''} | Precio: $${Number(p.precio).toFixed(2)}</div>
      ${p.barcodeSrc ? `<img class="barcode-img" src="${p.barcodeSrc}" />` : ''}
      <div class="product-code">Cod: ${p.codigo}</div>
    </div>
  `).join('');
  
  const html = `
    <html>
    <head>
      <title>Imprimir Stickers A4</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Helvetica', 'Arial', sans-serif;
          background: #fff;
          color: #000;
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-auto-rows: calc(297mm / 8);
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          page-break-inside: avoid;
        }
        .sticker-card {
          border: 0.5px solid #ccc;
          box-sizing: border-box;
          padding: 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .product-name {
          font-size: 8pt;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .product-detail {
          font-size: 7pt;
        }
        .barcode-img {
          width: 100%;
          height: 15mm;
          display: block;
          margin: 2px 0;
        }
        .product-code {
          font-size: 7pt;
        }
      </style>
    </head>
    <body>
      <div class="grid-container">
        ${stickersHtml}
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

function showModal(title, body, actions = []) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  const actionsRoot = $("#modalActions");
  actionsRoot.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.className = action.kind || "secondary-btn";
    button.textContent = action.label;
    button.onclick = async () => {
      if (action.close !== false) {
        hideModal();
      }
      if (action.onClick) {
        try {
          await action.onClick();
        } catch (err) {
          showModal("Error", err.message || "Ocurrió un error inesperado.", [
            { label: "Aceptar", kind: "primary-btn" },
          ]);
        }
      }
    };
    actionsRoot.appendChild(button);
  });
  $("#modalRoot").classList.remove("hidden");
}

function hideModal() {
  $("#modalRoot").classList.add("hidden");
  $("#modalBody").innerHTML = "";
  $("#modalActions").innerHTML = "";
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  state.theme = theme;
}

function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function setView(viewName) {
  $$(".menu-item").forEach((item) =>
    item.classList.toggle("active", item.dataset.view === viewName),
  );
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}View`).classList.add("active");
  if (viewName === "returns") {
    loadRecentSalesForReturns();
  }
}

function productToRow(product) {
  const checked = state.selectedForPrint.has(product.codigo) ? "checked" : "";
  return `
    <tr data-code="${product.codigo}" class="product-row ${product.low_stock ? "low-stock" : ""}">
      <td class="print-check-cell" data-noclick>
        <input type="checkbox" class="print-select" data-code="${product.codigo}" ${checked} />
      </td>
      <td>${product.codigo}</td>
      <td>${product.nombre}</td>
      <td>${product.categoria || ""}</td>
      <td>${product.talla || ""}</td>
      <td>${money(product.precio)}</td>
      <td>${product.stock}</td>
      <td><button class="ghost-btn" style="padding: 4px 8px; font-size: 0.85rem;">Editar</button></td>
    </tr>
  `;
}

function renderDashboard() {
  if (!state.dashboard) return;

  const stats = state.dashboard.stats;
  const cards = [
    ["Ventas", stats.sales_count, "Tickets emitidos"],
    ["Ingresos brutos", money(stats.gross_total), "Suma total facturada"],
    ["Productos", stats.products_count, "SKU activos"],
    ["Stock bajo", stats.low_stock_count, "Productos con menos de 5 unidades"],
  ];
  $("#dashboardCards").innerHTML = cards
    .map(
      ([label, value, hint]) => `
    <div class="metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="label">${hint}</div>
    </div>
  `,
    )
    .join("");

  const lowStock = state.dashboard.low_stock_products || [];
  $("#lowStockList").innerHTML = lowStock.length
    ? lowStock
        .map(
          (item) => `
        <div class="list-item">
          <strong>${item.nombre}</strong><br />
          ${item.codigo} · stock ${item.stock}
        </div>
      `,
        )
        .join("")
    : '<div class="list-item">No hay alertas de stock bajo.</div>';
}

function renderCart() {
  $("#cartTable").innerHTML = state.cart
    .map(
      (item, index) => `
    <tr>
      <td>${item.codigo}</td>
      <td>${item.nombre}</td>
      <td>
        <input type="number" min="1" value="${item.cantidad}" data-cart-index="${index}" class="cart-qty" />
      </td>
      <td>${money(item.precio)}</td>
      <td>${money(item.subtotal)}</td>
      <td><button class="danger-btn" data-remove-index="${index}">Quitar</button></td>
    </tr>
  `,
    )
    .join("");
  $("#cartTotal").textContent = money(
    state.cart.reduce((sum, item) => sum + item.subtotal, 0),
  );

  $$(".cart-qty").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = Number(input.dataset.cartIndex);
      const qty = Math.max(1, Number(input.value || 1));
      state.cart[idx].cantidad = qty;
      state.cart[idx].subtotal = qty * state.cart[idx].precio;
      renderCart();
    });
  });

  $$("[data-remove-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.removeIndex);
      state.cart.splice(idx, 1);
      renderCart();
    });
  });
}

async function refreshProducts(search = "") {
  const sanitizedSearch = typeof search === 'string' ? search.replace(/`/g, '-') : search;
  const response = await apiCall("list_products", { search_text: sanitizedSearch });
  state.products = response.data || [];
  $("#inventoryTable").innerHTML = state.products.map(productToRow).join("");
  $("#inventoryTable")
    .querySelectorAll(".product-row")
    .forEach((row) => {
      row.addEventListener("click", async (e) => {
        const code = row.dataset.code;
        const response = await apiCall("get_product", code);
        const product = response.data;
        state.selectedProductCode = product.codigo;
        $("#originalCode").value = product.codigo;
        $("#productCode").value = product.codigo;
        $("#productName").value = product.nombre;
        $("#productCategory").value = product.categoria || "";
        $("#productSize").value = product.talla || "";
        $("#productPrice").value = product.precio;
        $("#productStock").value = product.stock;

        // Provide visual feedback
        $("#productEditTitle").textContent =
          `Editar producto: ${product.codigo}`;
        $("#deleteProductBtn").style.display = "inline-block";
        setView("productEdit");
      });
    });

  // Evitar que el click en el checkbox dispare la edición de la fila
  $("#inventoryTable")
    .querySelectorAll("[data-noclick]")
    .forEach((cell) => {
      cell.addEventListener("click", (e) => e.stopPropagation());
    });

  // Vincular cambio de cada checkbox de selección
  $("#inventoryTable")
    .querySelectorAll(".print-select")
    .forEach((cb) => {
      cb.addEventListener("change", () => {
        if (cb.checked) state.selectedForPrint.add(cb.dataset.code);
        else state.selectedForPrint.delete(cb.dataset.code);
        updateSelectAllState();
      });
    });

  updateSelectAllState();
}

async function refreshDashboard() {
  const response = await apiCall("get_dashboard", {});
  state.dashboard = response.data;
  if (state.dashboard && state.dashboard.user) {
    state.user = state.dashboard.user;
  }
  renderDashboard();
}

async function refreshHistory() {
  const response = await apiCall("get_sales", {});
  const sales = response.data || [];
  const metodoPagoIconos = { 'Efectivo': '💵', 'Datáfono': '💳', 'Transferencia': '📲' };
  $("#historyTable").innerHTML = sales
    .map(
      (sale) => `
    <tr data-sale-id="${sale.id_venta}">
      <td>${sale.id_venta}</td>
      <td>${sale.fecha}</td>
      <td>${money(sale.total)}</td>
      <td>${money(sale.total_devuelto)}</td>
      <td>${money(sale.total_neto)}</td>
      <td><span style="font-size:0.85rem; white-space:nowrap;">${metodoPagoIconos[sale.metodo_pago] || ''} ${sale.metodo_pago || 'Efectivo'}</span></td>
    </tr>
  `,
    )
    .join("");

  $("#historyCards").innerHTML = [
    ["Tickets", sales.length, "Ventas registradas"],
    [
      "Bruto",
      money(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)),
      "Antes de devoluciones",
    ],
    [
      "Neto",
      money(sales.reduce((sum, sale) => sum + Number(sale.total_neto || 0), 0)),
      "Después de devoluciones",
    ],
  ]
    .map(
      ([label, value, hint]) => `
    <div class="metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="label">${hint}</div>
    </div>
  `,
    )
    .join("");

  $("#historyTable")
    .querySelectorAll("tr")
    .forEach((row) => {
      row.addEventListener("click", () => {
        $$("#historyTable tr.selected").forEach((r) =>
          r.classList.remove("selected"),
        );
        row.classList.add("selected");
        state.selectedHistorySale = Number(row.dataset.saleId);
      });
    });
}

// Removida la funcionalidad de usuarios.

function showToast(text) {
  $("#posStatus").textContent = text;
  setTimeout(() => {
    $("#posStatus").textContent = "Listo para escanear";
  }, 2200);
}

function updateSelectAllState() {
  const total = state.products.length;
  const visibleSelected = state.products.filter((p) =>
    state.selectedForPrint.has(p.codigo),
  ).length;
  const cb = $("#selectAllForPrint");
  if (cb) {
    cb.indeterminate = visibleSelected > 0 && visibleSelected < total;
    cb.checked = total > 0 && visibleSelected === total;
  }
  const btn = $("#stickersBtn");
  if (btn) {
    const count = state.selectedForPrint.size;
    btn.textContent =
      count > 0 ? `Imprimir stickers (${count} sel.)` : "Imprimir stickers";
  }
}


async function addToCartByCode(code) {
  const sanitized = code.trim().replace(/`/g, '-');
  const response = await apiCall("get_product", sanitized);
  const product = response.data;
  const existing = state.cart.find((item) => item.codigo === product.codigo);
  if (existing) {
    existing.cantidad += 1;
    existing.subtotal = existing.cantidad * existing.precio;
  } else {
    state.cart.push({
      codigo: product.codigo,
      nombre: product.nombre,
      precio: Number(product.precio),
      cantidad: 1,
      subtotal: Number(product.precio),
    });
  }
  renderCart();
}

async function submitLogin(event) {
  event.preventDefault();
  const response = await apiCall("login", {
    username: $("#loginUser").value,
    password: $("#loginPass").value,
  });
  state.user = response.data;
  $("#appSidebar").classList.remove("hidden");
  $("#loginScreen").classList.add("hidden");
  $("#appArea").classList.remove("hidden");
  await bootstrapApp();
}

async function bootstrapApp() {
  await refreshDashboard();
  await refreshProducts();
  await refreshHistory();
  setView("dashboard");
  $("#barcodeInput").focus();
}

async function saveProduct(event) {
  event.preventDefault();
  // Aseguramos que stock=0 se envíe como "0" nunca como vacío
  const stockRaw = $("#productStock").value;
  const stockVal = stockRaw === "" ? "0" : stockRaw;
  const payload = {
    original_code: $("#originalCode").value,
    codigo: $("#productCode").value,
    nombre: $("#productName").value,
    categoria: $("#productCategory").value,
    talla: $("#productSize").value,
    precio: $("#productPrice").value,
    stock: stockVal,
  };
  const response = await apiCall("save_product", payload);
  showModal("Inventario", response.message, [
    { label: "Aceptar", kind: "primary-btn" },
  ]);
  clearProductForm();
  await refreshProducts($("#inventorySearch").value);
  await refreshDashboard();
}

function clearProductForm() {
  $("#originalCode").value = "";
  $("#productCode").value = "";
  $("#productName").value = "";
  $("#productCategory").value = "";
  $("#productSize").value = "";
  $("#productPrice").value = "";
  $("#productStock").value = "";
  state.selectedProductCode = null;
  $("#productEditTitle").textContent = "Nuevo producto";
  $("#deleteProductBtn").style.display = "none";
}

async function deleteSelectedProduct() {
  if (!state.selectedProductCode) {
    showModal("Inventario", "Selecciona un producto antes de eliminarlo.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  showModal("Eliminar producto", `¿Eliminar ${state.selectedProductCode}?`, [
    { label: "Cancelar", kind: "secondary-btn" },
    {
      label: "Eliminar",
      kind: "danger-btn",
      onClick: async () => {
        const response = await apiCall("delete_product", {
          codigo: state.selectedProductCode,
        });
        showModal("Inventario", response.message, [
          { label: "Aceptar", kind: "primary-btn" },
        ]);
        clearProductForm();
        await refreshProducts($("#inventorySearch").value);
        await refreshDashboard();
        setView("inventory");
      },
    },
  ]);
}

function parseCSV(text) {
  // Eliminar BOM si existe
  text = text.replace(/^\uFEFF/, '');
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line);
  if (lines.length < 2) return [];

  // Detectar separador automáticamente: ; o ,
  const firstLine = lines[0];
  const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

  const headers = firstLine.split(sep).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ''));
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = values[index] !== undefined ? values[index] : '';
    });
    // Aceptar fila si tiene nombre o codigo
    if (obj.nombre || obj.codigo) {
      rows.push({
        codigo: obj.codigo || "",
        nombre: obj.nombre || "",
        categoria: obj.categoria || "",
        talla: obj.talla || "",
        precio: parseFloat((obj.precio || '0').replace(/[^0-9.]/g, '')) || 0,
        stock: parseInt((obj.stock || '0').replace(/[^0-9]/g, '')) || 0,
      });
    }
  }
  return rows;
}

async function importCsvFlow() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,.txt";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        showModal(
          "Error CSV",
          `El archivo no contiene filas válidas.\n\nVerifica que tenga cabeceras: codigo, nombre, categoria, talla, precio, stock\nSeparador: coma (,) o punto y coma (;)`,
          [{ label: "Aceptar", kind: "primary-btn" }],
        );
        return;
      }
      showToast(`Importando ${rows.length} productos...`);
      const response = await apiCall("import_products", rows);
      await refreshProducts();
      await refreshDashboard();
      showModal(
        "✅ Importación completada",
        `<div style="line-height:1.8;">
          ${response.message}<br/>
          <strong>Total procesados:</strong> ${rows.length} filas
        </div>`,
        [{ label: "Aceptar", kind: "primary-btn" }],
      );
    };
    reader.readAsText(file, 'UTF-8');
  };
  input.click();
}

async function previewSale() {
  if (!state.cart.length) {
    showModal("POS", "El carrito está vacío.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }

  // Resetear selección antes de mostrar el modal
  state.selectedPaymentMethod = "Efectivo";
  state.canceloAmount = 0;

  const preview = await apiCall("get_sale_preview", state.cart);
  const items = preview.data.items || [];
  const total = preview.data.total || 0;

  const chipStyle = (active) => `
    padding: 10px 16px; border: 2px solid ${active ? 'var(--primary)' : 'var(--line)'}; border-radius: 12px;
    text-align: center; cursor: pointer; font-weight: 700; font-size: 0.9rem;
    background: ${active ? 'var(--primary)' : 'transparent'}; color: ${active ? '#fff' : 'var(--text)'};
    transition: all 0.15s; user-select: none;
  `;

  const body = `
    <div class="list-card" style="max-height:180px; overflow-y:auto; margin-bottom:10px;">
      ${items.map((item) => `<div class="list-item"><strong>${item.nombre}</strong> &nbsp;<span style="color:var(--muted);">${item.cantidad} x ${money(item.precio)} = ${money(item.subtotal)}</span></div>`).join('')}
    </div>
    <div style="display:flex; justify-content:space-between; font-weight:900; font-size:1.15rem; margin:8px 0 16px;">
      <span>TOTAL A COBRAR:</span><span>${money(total)}</span>
    </div>

    <!-- Método de pago -->
    <div style="font-weight:700; margin-bottom:8px; font-size:0.9rem;">Método de pago:</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
      <div class="payment-chip" data-method="Efectivo" onclick="selectPaymentChip(this)" style="${chipStyle(true)} flex:1; min-width:90px;">💵 Efectivo</div>
      <div class="payment-chip" data-method="Datáfono" onclick="selectPaymentChip(this)" style="${chipStyle(false)} flex:1; min-width:90px;">💳 Datáfono</div>
      <div class="payment-chip" data-method="Transferencia" onclick="selectPaymentChip(this)" style="${chipStyle(false)} flex:1; min-width:90px;">📲 Transferencia</div>
    </div>

    <!-- Campo cancelo (solo si Efectivo) -->
    <div id="canceloSection" style="margin-bottom:8px;">
      <div style="font-weight:700; margin-bottom:6px; font-size:0.9rem;">¿Cuánto cancela el cliente? <span style="color:var(--muted);font-weight:400;font-size:0.8rem;">(opcional)</span></div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input id="canceloInput" type="number" min="0" step="1000" placeholder="Ej: ${Math.ceil(total/1000)*1000}" value=""
          oninput="updateCambio(${total})"
          style="flex:1; padding:10px; border:1.5px solid var(--line); border-radius:10px; font-size:1rem; background:var(--surface); color:var(--text);"
        />
        <div style="min-width:80px; text-align:right;">
          <div style="font-size:0.78rem; color:var(--muted);">Cambio:</div>
          <div id="cambioDisplay" style="font-weight:900; font-size:1.05rem; color:var(--primary);">$0</div>
        </div>
      </div>
    </div>
  `;

  showModal("💰 Cobrar venta", body, [
    { label: "Cancelar", kind: "secondary-btn" },
    {
      label: "✅ Confirmar e imprimir",
      kind: "primary-btn",
      close: false,
      onClick: async () => {
        // Leer valores del DOM ANTES de que hideModal los borre
        const metodoPago = state.selectedPaymentMethod || "Efectivo";
        const canceloRaw = document.getElementById('canceloInput')?.value;
        const cancelo = canceloRaw ? Number(canceloRaw) : total;
        state.canceloAmount = cancelo;
        hideModal();

        const result = await apiCall("create_sale", {
          cart_items: state.cart,
          metodo_pago: metodoPago,
        });
        if (result.ok && result.data) {
          const itemsForPrint = state.cart.map(i => ({ ...i }));
          printReceiptDirect(result.data.id_venta, result.data.total, itemsForPrint, metodoPago, cancelo);
          showModal(
            "✅ Venta confirmada",
            `<div style="text-align:center;padding:8px 0;">
              <div style="font-size:1.8rem;">🧾</div>
              <div style="font-weight:700;margin:6px 0;">Ticket #${result.data.id_venta}</div>
              <div>Método: <strong>${metodoPago}</strong></div>
              <div>Total: <strong>${money(result.data.total)}</strong></div>
              ${cancelo > 0 && metodoPago === 'Efectivo' ? `<div>Cancela: <strong>${money(cancelo)}</strong> · Cambio: <strong>${money(Math.max(0, cancelo - result.data.total))}</strong></div>` : ''}
            </div>`,
            [{ label: "Aceptar", kind: "primary-btn" }],
          );
        }
        state.cart = [];
        renderCart();
        await refreshProducts();
        await refreshDashboard();
        await refreshHistory();
      },
    },
  ]);
}

// Actualiza el display del cambio dinámicamente
function updateCambio(total) {
  const input = document.getElementById('canceloInput');
  const display = document.getElementById('cambioDisplay');
  if (!input || !display) return;
  const cancelo = Number(input.value) || 0;
  const cambio = Math.max(0, cancelo - total);
  display.textContent = '$' + Math.round(cambio).toLocaleString('es-CO');
  display.style.color = cambio >= 0 ? 'var(--primary)' : '#e53e3e';
}

function selectPaymentChip(el) {
  // Guardar en state (sobrevive al hideModal)
  state.selectedPaymentMethod = el.dataset.method;

  // Visual: deselect all, select clicked
  document.querySelectorAll('.payment-chip').forEach(chip => {
    chip.style.background = 'transparent';
    chip.style.color = 'var(--text)';
    chip.style.borderColor = 'var(--line)';
  });
  el.style.background = 'var(--primary)';
  el.style.color = '#fff';
  el.style.borderColor = 'var(--primary)';

  // Mostrar/ocultar sección de cancelo según método
  const canceloSection = document.getElementById('canceloSection');
  if (canceloSection) {
    canceloSection.style.display = (state.selectedPaymentMethod === 'Efectivo') ? 'block' : 'none';
  }
}

async function loadRecentSalesForReturns() {
  const response = await apiCall("get_sales", {});
  const sales = response.data || [];
  if (sales.length === 0) {
    $("#recentSalesReturnList").innerHTML = '<div class="list-item">No hay ventas registradas.</div>';
    return;
  }
  $("#recentSalesReturnList").innerHTML = sales
    .slice(0, 15)
    .map(
      (sale) => `
    <div class="list-item recent-sale-return-item" data-sale-id="${sale.id_venta}" style="cursor: pointer; transition: background 0.2s; padding: 10px; margin-bottom: 4px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>Ticket #${sale.id_venta}</span>
        <span>${money(sale.total_neto)}</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--muted); margin-top: 4px;">
        ${sale.fecha}
      </div>
    </div>
  `,
    )
    .join("");

  $("#recentSalesReturnList")
    .querySelectorAll(".recent-sale-return-item")
    .forEach((item) => {
      item.addEventListener("click", async () => {
        $("#recentSalesReturnList")
          .querySelectorAll(".recent-sale-return-item")
          .forEach((i) => {
            i.style.background = "";
            i.style.border = "";
          });
        item.style.background = "var(--surface-2)";
        item.style.border = "1px solid var(--primary)";
        
        const ticketId = Number(item.dataset.saleId);
        $("#returnTicketInput").value = ticketId;
        await loadReturnTicket(ticketId);
      });
    });
}

async function loadReturnTicket(ticketId) {
  let ticket = ticketId;
  if (!ticket || typeof ticket !== "number") {
    ticket = Number($("#returnTicketInput").value || 0);
  }
  if (!ticket) {
    showModal("Devoluciones", "Ingresa o selecciona un número de ticket válido.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  const response = await apiCall("get_return_ticket", { id_venta: ticket });
  state.selectedReturnTicket = ticket;
  $("#returnTicketInfo").innerHTML = `Ticket: <strong>#${ticket}</strong>`;
  // Mostrar botón Actualizar Factura
  const updateBtn = $("#updateInvoiceBtn");
  if (updateBtn) updateBtn.style.display = "inline-flex";
  const rows = response.data || [];
  if (rows.length === 0) {
    $("#returnTable").innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay productos en esta venta.</td></tr>';
    return;
  }
  renderReturnTable(rows);
}

function renderReturnTable(rows) {
  // Consultar cambios pendientes para este ticket y enriquecer las filas
  const ticketId = state.selectedReturnTicket;

  $("#returnTable").innerHTML = rows.map((row) => {
    const isReturnedAll = row.cantidad_restante <= 0;
    const hasPending = row.pending_count > 0;
    return `
      <tr data-return-code="${row.codigo}">
        <td>
          <strong>${row.nombre}</strong><br/>
          <span class="hint">${row.codigo} · ${money(row.precio)}</span>
        </td>
        <td>
          Comprado: ${row.cantidad}<br/>
          Devuelto: ${row.cantidad_devuelta}<br/>
          <span style="color: var(--muted); font-size:0.82rem;">Disponible: ${row.cantidad_restante}</span>
          ${hasPending ? `<br/><span style="display:inline-block; margin-top:4px; padding:2px 8px; background:var(--warning, #f59e0b); color:#fff; border-radius:6px; font-size:0.78rem; font-weight:700;">🔄 ${row.pending_count} cambio(s) pendiente(s)</span>` : ''}
        </td>
        <td>
          <input type="number" class="return-qty-input" data-code="${row.codigo}" min="1" max="${row.cantidad_restante}" value="${row.cantidad_restante}" ${isReturnedAll ? "disabled" : ""} style="width: 70px; padding: 6px; border: 1px solid var(--line); border-radius: 8px;" />
        </td>
        <td>
          <input type="text" class="return-reason-input" data-code="${row.codigo}" placeholder="Motivo" value="Cambio / Talla" ${isReturnedAll ? "disabled" : ""} style="padding: 6px; min-width: 120px; border: 1px solid var(--line); border-radius: 8px;" />
        </td>
        <td style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <button class="danger-btn return-row-btn" data-code="${row.codigo}" ${isReturnedAll ? "disabled" : ""} style="padding: 6px 12px; font-size: 0.85rem;">
            Devolver
          </button>
          ${hasPending ? `<button class="primary-btn pending-exchange-btn" data-code="${row.codigo}" style="padding: 6px 12px; font-size: 0.85rem; white-space:nowrap;">🔄 Cambio pendiente</button>` : ''}
        </td>
      </tr>
    `;
  }).join("");

  // Botón Devolver
  $("#returnTable").querySelectorAll(".return-row-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.code;
      const qtyInput = $(`#returnTable .return-qty-input[data-code="${code}"]`);
      const reasonInput = $(`#returnTable .return-reason-input[data-code="${code}"]`);
      const quantity = Number(qtyInput.value || 0);
      const reason = reasonInput.value.trim();

      if (quantity <= 0) {
        showModal("Devoluciones", "Ingresa una cantidad válida mayor a cero.", [
          { label: "Aceptar", kind: "primary-btn" },
        ]);
        return;
      }
      if (!reason) {
        showModal("Devoluciones", "El motivo es obligatorio.", [
          { label: "Aceptar", kind: "primary-btn" },
        ]);
        return;
      }

      const item = rows.find(r => r.codigo === code);
      showModal("Confirmar devolución", `¿Deseas devolver ${quantity} unidad(es) de "${item.nombre}"?`, [
        { label: "Cancelar", kind: "secondary-btn" },
        {
          label: "Devolver",
          kind: "danger-btn",
          onClick: async () => {
            const response = await apiCall("process_return", {
              id_venta: state.selectedReturnTicket,
              codigo_producto: code,
              cantidad: quantity,
              motivo: reason,
            });
            // Si se creó un cambio pendiente, abrir modal de cambio inmediatamente
            const esCambioPendiente = response.message && response.message.includes("Cambio pendiente");
            await refreshProducts();
            await refreshDashboard();
            await refreshHistory();
            await loadReturnTicket(state.selectedReturnTicket);
            if (esCambioPendiente) {
              showModal("✅ Devolución registrada",
                `<div style="text-align:center; padding:10px 0;">
                  <div style="font-size:1.8rem; margin-bottom:8px;">🔄</div>
                  <div style="font-weight:700; margin-bottom:6px;">${response.message}</div>
                  <div style="color:var(--muted); font-size:0.9rem;">Puedes completar el cambio ahora o más tarde desde <strong>Actualizar Factura</strong>.</div>
                </div>`,
                [
                  { label: "Después", kind: "secondary-btn" },
                  { label: "🔄 Completar cambio ahora", kind: "primary-btn",
                    onClick: () => openUpdateInvoiceModal() },
                ]
              );
            } else {
              showModal("Devolución", response.message, [
                { label: "Aceptar", kind: "primary-btn" },
              ]);
            }
          }
        }
      ]);
    });
  });

  // Botón Cambio Pendiente (acceso directo)
  $("#returnTable").querySelectorAll(".pending-exchange-btn").forEach((btn) => {
    btn.addEventListener("click", () => openUpdateInvoiceModal());
  });
}

async function openUpdateInvoiceModal() {
  if (!state.selectedReturnTicket) {
    showModal("Actualizar Factura", "Primero selecciona o busca un ticket.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }

  const ticketId = state.selectedReturnTicket;

  // Obtener cambios pendientes para este ticket
  let pending = [];
  try {
    const pendingResp = await apiCall("get_pending_changes", { id_venta: ticketId });
    pending = pendingResp.data || [];
  } catch (e) {
    pending = [];
  }

  if (pending.length === 0) {
    // Sin cambios pendientes: flujo clásico (seleccionar producto)
    await openClassicSwapModal(ticketId);
    return;
  }

  // Hay cambios pendientes → mostrar lista de cambios pendientes pre-cargados
  const pendingCards = pending.map((p) => `
    <div style="
      border: 1.5px solid var(--warning, #f59e0b);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 10px;
      background: rgba(245,158,11,0.07);
    ">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-weight:700; font-size:0.97rem;">${p.nombre}</div>
          <div style="font-size:0.82rem; color:var(--muted); margin-top:2px;">
            ${p.codigo_producto}${p.talla ? ' · Talla ' + p.talla : ''} · ${p.cantidad} unidad(es)
          </div>
          <div style="font-size:0.8rem; color:var(--muted); margin-top:2px;">Motivo: ${p.motivo}</div>
        </div>
        <span style="font-size:1.4rem;">🔄</span>
      </div>
      <div style="margin-top:12px;">
        <div style="font-weight:600; margin-bottom:6px; font-size:0.9rem;">Código del nuevo producto:</div>
        <input
          type="text"
          class="pending-new-code"
          data-id-devolucion="${p.id_devolucion}"
          data-nombre-viejo="${p.nombre}"
          data-cantidad="${p.cantidad}"
          placeholder="Escanear o ingresar código"
          style="width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:9px; font-size:1rem; background:var(--surface); color:var(--text); box-sizing:border-box;"
        />
      </div>
    </div>
  `).join("");

  const modalBody = `
    <div style="display:flex; flex-direction:column; gap:4px;">
      <div style="font-size:0.9rem; color:var(--muted); margin-bottom:8px;">
        Factura <strong>#${ticketId}</strong> · ${pending.length} cambio(s) pendiente(s)
      </div>
      ${pendingCards}
      <div style="margin-top:6px; font-size:0.82rem; color:var(--muted);">
        Deja en blanco los que no deseas completar ahora.
      </div>
    </div>
  `;

  showModal(
    `🔄 Completar Cambio(s) — Factura #${ticketId}`,
    modalBody,
    [
      { label: "Cancelar", kind: "secondary-btn" },
      {
        label: "✅ Confirmar cambio(s)",
        kind: "primary-btn",
        close: false,
        onClick: async () => {
          const inputs = document.querySelectorAll(".pending-new-code");
          let anyDone = false;
          let lastTotal = null;
          let errors = [];

          for (const input of inputs) {
            const newCodigo = input.value.trim().replace(/`/g, "-");
            if (!newCodigo) continue; // saltar si no ingresaron código

            const idDevolucion = Number(input.dataset.idDevolucion);
            const nombreViejo = input.dataset.nombreViejo;
            const cantidad = Number(input.dataset.cantidad);

            // Verificar que el nuevo producto existe antes de confirmar
            let newProd = null;
            try {
              const prodResp = await apiCall("get_product", newCodigo);
              newProd = prodResp.data;
            } catch (err) {
              errors.push(`Producto ${newCodigo} no encontrado.`);
              continue;
            }

            // Pedir confirmación individual
            await new Promise((resolve) => {
              showModal(
                "Confirmar cambio",
                `<div style="line-height:1.7; font-size:0.95rem;">
                  <div><strong>Ticket:</strong> #${ticketId}</div>
                  <div style="margin-top:10px;"><strong>❌ Sale:</strong></div>
                  <div style="padding:8px 14px; background:var(--surface-2); border-radius:8px; margin:4px 0;">
                    ${cantidad} × ${nombreViejo}
                  </div>
                  <div style="margin-top:10px;"><strong>✅ Entra:</strong></div>
                  <div style="padding:8px 14px; background:var(--surface-2); border-radius:8px; margin:4px 0;">
                    ${cantidad} × ${newProd.nombre} <span style="color:var(--muted)">(${newCodigo})</span> · ${money(newProd.precio)}
                  </div>
                </div>`,
                [
                  { label: "Cancelar este", kind: "secondary-btn", onClick: () => resolve(false) },
                  {
                    label: "✅ Confirmar",
                    kind: "primary-btn",
                    onClick: async () => {
                      try {
                        const result = await apiCall("complete_exchange", {
                          id_devolucion: idDevolucion,
                          new_codigo: newCodigo,
                        });
                        lastTotal = result.data?.new_total || lastTotal;
                        anyDone = true;
                        // Imprimir factura actualizada
                        if (result.data?.new_total) {
                          const detRes = await apiCall("get_sale_details", { id_venta: ticketId });
                          printReceiptDirect(ticketId, result.data.new_total, detRes.data || []);
                        }
                      } catch (err) {
                        errors.push(err.message);
                      }
                      resolve(true);
                    }
                  }
                ]
              );
            });
          }

          await refreshProducts();
          await refreshDashboard();
          await refreshHistory();
          await loadReturnTicket(ticketId);

          if (errors.length > 0) {
            showModal("⚠️ Errores", errors.join("<br/>"), [{ label: "Aceptar", kind: "primary-btn" }]);
          } else if (anyDone) {
            showModal(
              "✅ Cambio(s) completado(s)",
              `<div style="text-align:center; padding:10px 0;">
                <div style="font-size:2rem; margin-bottom:8px;">🧾</div>
                <div style="font-weight:700; font-size:1.1rem; margin-bottom:6px;">Cambio(s) completado(s) exitosamente</div>
                <div style="color:var(--muted); font-size:0.9rem;">Ticket #${ticketId} · Nuevo total: ${money(lastTotal)}</div>
              </div>`,
              [{ label: "Aceptar", kind: "primary-btn" }]
            );
          } else {
            hideModal();
          }
        },
      },
    ]
  );
}

// Flujo clásico de cambio cuando NO hay cambios pendientes
async function openClassicSwapModal(ticketId) {
  const response = await apiCall("get_return_ticket", { id_venta: ticketId });
  const rows = response.data || [];

  if (rows.length === 0) {
    showModal("Actualizar Factura", "No hay productos en esta venta.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }

  const productOptions = rows
    .map(
      (row) => `
      <label style="
        display: flex; align-items: center; gap: 12px;
        padding: 10px 14px;
        border: 1.5px solid var(--line);
        border-radius: 10px;
        cursor: pointer;
        margin-bottom: 8px;
        transition: border-color 0.2s, background 0.2s;
      " onmouseover="this.style.borderColor='var(--primary)'" onmouseout="if(!this.querySelector('input').checked)this.style.borderColor='var(--line)'">
        <input type="radio" name="swapProduct" value="${row.codigo}" data-max-qty="${row.cantidad_restante}" style="accent-color: var(--primary);" />
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;">${row.nombre}</div>
          <div style="font-size: 0.8rem; color: var(--muted);">${row.codigo} · ${money(row.precio)} · ${row.cantidad_restante} restante(s) de ${row.cantidad} comprada(s)</div>
        </div>
      </label>
    `
    )
    .join("");

  const modalBody = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <div style="font-weight: 700; margin-bottom: 10px; font-size: 0.95rem;">1. Selecciona el producto a cambiar:</div>
        <div id="swapProductList" style="max-height: 240px; overflow-y: auto; padding-right: 4px;">
          ${productOptions}
        </div>
      </div>
      <div id="swapQtyContainer" style="display: none;">
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">Cantidad a cambiar:</div>
        <input
          id="swapQuantity"
          type="number"
          min="1"
          value="1"
          style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 10px; font-size: 1rem; background: var(--surface); color: var(--text); box-sizing: border-box;"
        />
      </div>
      <div>
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">2. Código del nuevo producto (escanear o escribir):</div>
        <input
          id="newProductCode"
          type="text"
          placeholder="Escanear o ingresar código del nuevo producto"
          style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 10px; font-size: 1rem; background: var(--surface); color: var(--text); box-sizing: border-box;"
          autofocus
        />
      </div>
      <div>
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">3. Motivo del cambio:</div>
        <input
          id="swapMotivo"
          type="text"
          value="Cambio / Talla"
          placeholder="Ej: Cambio de talla, defecto, etc."
          style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 10px; font-size: 1rem; background: var(--surface); color: var(--text); box-sizing: border-box;"
        />
      </div>
    </div>
  `;

  showModal(
    `🔄 Actualizar Factura #${ticketId}`,
    modalBody,
    [
      { label: "Cancelar", kind: "secondary-btn" },
      {
        label: "Confirmar cambio e imprimir",
        kind: "primary-btn",
        close: false,
        onClick: async () => {
          const selectedRadio = document.querySelector('input[name="swapProduct"]:checked');
          if (!selectedRadio) {
            showModal("Actualizar Factura", "Debes seleccionar el producto que deseas cambiar.", [
              { label: "Aceptar", kind: "primary-btn" },
            ]);
            return;
          }
          const oldCodigo = selectedRadio.value;
          const swapQty = Number($("#swapQuantity").value || 1);
          const maxQty = Number(selectedRadio.getAttribute('data-max-qty') || 1);
          const newCodigo = $("#newProductCode").value.trim().replace(/`/g, "-");
          const motivo = $("#swapMotivo").value.trim() || "Cambio de producto";

          if (swapQty <= 0 || swapQty > maxQty || !Number.isInteger(swapQty)) {
            showModal("Actualizar Factura", `Cantidad a cambiar inválida. Debe ser entre 1 y ${maxQty}.`, [
              { label: "Aceptar", kind: "primary-btn" },
            ]);
            return;
          }
          if (!newCodigo) {
            showModal("Actualizar Factura", "Debes ingresar el código del nuevo producto.", [
              { label: "Aceptar", kind: "primary-btn" },
            ]);
            return;
          }
          if (oldCodigo === newCodigo) {
            showModal("Actualizar Factura", "El nuevo producto debe ser diferente al actual.", [
              { label: "Aceptar", kind: "primary-btn" },
            ]);
            return;
          }

          const oldRow = rows.find((r) => r.codigo === oldCodigo);
          const oldNombre = oldRow ? oldRow.nombre : oldCodigo;

          let newProduct = null;
          try {
            const prodResp = await apiCall("get_product", newCodigo);
            newProduct = prodResp.data;
          } catch (err) {
            showModal("Actualizar Factura", `Producto nuevo no encontrado: ${err.message}`, [
              { label: "Aceptar", kind: "primary-btn" },
            ]);
            return;
          }

          hideModal();

          showModal(
            "Confirmar cambio",
            `
              <div style="line-height: 1.7; font-size: 0.95rem;">
                <div><strong>Ticket:</strong> #${ticketId}</div>
                <div style="margin-top: 10px;"><strong>❌ Sale del stock:</strong></div>
                <div style="padding: 8px 14px; background: var(--surface-2); border-radius: 8px; margin: 4px 0;">${swapQty} unidad(es) de ${oldNombre} <span style="color:var(--muted)">(${oldCodigo})</span></div>
                <div style="margin-top: 10px;"><strong>✅ Entra al ticket:</strong></div>
                <div style="padding: 8px 14px; background: var(--surface-2); border-radius: 8px; margin: 4px 0;">${swapQty} unidad(es) de ${newProduct.nombre} <span style="color:var(--muted)">(${newCodigo})</span> · ${money(newProduct.precio)}</div>
                <div style="margin-top: 10px; color: var(--muted); font-size: 0.87rem;">Motivo: ${motivo}</div>
              </div>
            `,
            [
              {
                label: "Cancelar",
                kind: "secondary-btn",
                onClick: () => openClassicSwapModal(ticketId),
              },
              {
                label: "✅ Confirmar y reimprimir",
                kind: "primary-btn",
                onClick: async () => {
                  const result = await apiCall("update_sale_item", {
                    id_venta: ticketId,
                    old_codigo: oldCodigo,
                    new_codigo: newCodigo,
                    cantidad: swapQty,
                    motivo: motivo,
                  });

                  const updatedItems = result.data.receipt_items || [];
                  const newTotal = result.data.new_total || 0;
                  printReceiptDirect(ticketId, newTotal, updatedItems);

                  showModal(
                    "✅ Factura Actualizada",
                    `
                      <div style="text-align: center; padding: 10px 0;">
                        <div style="font-size: 2rem; margin-bottom: 8px;">🧾</div>
                        <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 6px;">${result.message}</div>
                        <div style="color: var(--muted); font-size: 0.9rem;">Ticket #${ticketId} · Nuevo total: ${money(newTotal)}</div>
                        <div style="margin-top: 12px; font-size: 0.85rem; color: var(--muted);">La factura actualizada fue enviada a impresión.</div>
                      </div>
                    `,
                    [
                      {
                        label: "Aceptar",
                        kind: "primary-btn",
                        onClick: async () => {
                          await refreshProducts();
                          await refreshDashboard();
                          await refreshHistory();
                          await loadReturnTicket(ticketId);
                        },
                      },
                    ]
                  );
                },
              },
            ]
          );
        },
      },
    ]
  );

  // Vincular cambio en selección de producto para ajustar cantidad máxima
  const radios = document.querySelectorAll('input[name="swapProduct"]');
  const qtyContainer = document.getElementById('swapQtyContainer');
  const qtyInput = document.getElementById('swapQuantity');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const maxQty = Number(radio.getAttribute('data-max-qty') || 1);
      if (qtyContainer && qtyInput) {
        qtyContainer.style.display = 'block';
        qtyInput.max = maxQty;
        qtyInput.value = 1;
      }
    });
  });
}

async function reprintSelectedSale() {
  if (!state.selectedHistorySale) {
    showModal("Historial", "Selecciona una venta primero.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  try {
    const detailsResponse = await apiCall("get_sale_details", {
      id_venta: state.selectedHistorySale,
    });
    const items = detailsResponse.data || [];
    const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    printReceiptDirect(state.selectedHistorySale, total, items);
    showModal("Reimpresión", `Factura #${state.selectedHistorySale} enviada a impresión directa.`, [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
  } catch (error) {
    showModal("Error", "No se pudieron obtener los detalles de la venta.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
  }
}

async function deleteSelectedSale() {
  if (!state.selectedHistorySale) {
    showModal("Historial", "Selecciona una venta primero.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  showModal("Anular venta", `¿Anular la venta #${state.selectedHistorySale}?`, [
    { label: "Cancelar", kind: "secondary-btn" },
    {
      label: "Anular",
      kind: "danger-btn",
      onClick: async () => {
        const response = await apiCall(
          "delete_sale",
          state.selectedHistorySale,
        );
        state.selectedHistorySale = null;
        showModal("Historial", response.message, [
          { label: "Aceptar", kind: "primary-btn" },
        ]);
        await refreshProducts();
        await refreshDashboard();
        await refreshHistory();
      },
    },
  ]);
}

async function editSelectedSale() {
  if (!state.selectedHistorySale) {
    showModal("Historial", "Selecciona una venta primero.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  const response = await apiCall("get_sale_details", {
    id_venta: state.selectedHistorySale,
  });
  const items = response.data || [];
  const rows = items
    .map(
      (item, index) => `
    <tr>
      <td>${item.codigo}</td>
      <td>${item.nombre}</td>
      <td><input type="number" min="1" value="${item.cantidad}" data-edit-index="${index}" class="edit-qty" /></td>
      <td>${money(item.precio)}</td>
    </tr>
  `,
    )
    .join("");
  showModal(
    "Editar venta",
    `
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead><tbody id="editSaleBody">${rows}</tbody></table></div>
  `,
    [
      { label: "Cancelar", kind: "secondary-btn" },
      {
        label: "Guardar cambios",
        kind: "primary-btn",
        onClick: async () => {
          const nextItems = items.map((item, index) => {
            const qty = Number(
              document.querySelector(`[data-edit-index="${index}"]`).value ||
                item.cantidad,
            );
            return { codigo: item.codigo, cantidad: qty };
          });
          const result = await apiCall("replace_sale", {
            id_venta: state.selectedHistorySale,
            cart_items: nextItems,
          });
          showModal("Editar venta", result.message, [
            { label: "Aceptar", kind: "primary-btn" },
          ]);
          await refreshProducts();
          await refreshDashboard();
          await refreshHistory();
        },
      },
    ],
  );
}

async function generateStickers() {
  const selectedCount = state.selectedForPrint.size;
  const totalCount = state.products.length;

  const bodyHtml = `
    <div style="display:grid; gap:14px;">
      <div>
        <div style="font-weight:700; margin-bottom:10px;">Productos a imprimir</div>
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-bottom:8px;">
          <input type="radio" name="printScope" value="all" ${selectedCount === 0 ? "checked" : ""} />
          Todos los visibles (${totalCount})
        </label>
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; ${selectedCount === 0 ? "opacity:0.4; pointer-events:none;" : ""}">
          <input type="radio" name="printScope" value="selected" ${selectedCount > 0 ? "checked" : ""} ${selectedCount === 0 ? "disabled" : ""} />
          Solo los seleccionados (${selectedCount})
        </label>
      </div>
    </div>
  `;

  showModal("Imprimir etiquetas (58mm)", bodyHtml, [
    { label: "Cancelar", kind: "secondary-btn" },
    {
      label: "Imprimir Directo (58mm)",
      kind: "primary-btn",
      close: false,
      onClick: async () => {
        const scope = document.querySelector('input[name="printScope"]:checked')?.value || "all";
        const codes = scope === "selected" ? Array.from(state.selectedForPrint) : null;
        let productsToPrint = state.products;
        if (codes) {
          productsToPrint = state.products.filter(p => codes.includes(p.codigo));
        }
        hideModal();
        await printThermalStickersDirect(productsToPrint);
      },
    },
    {
      label: "Descargar PDF (58mm)",
      kind: "primary-btn",
      close: false,
      onClick: async () => {
        const scope = document.querySelector('input[name="printScope"]:checked')?.value || "all";
        const codes = scope === "selected" ? Array.from(state.selectedForPrint) : null;
        hideModal();
        await printStickers("thermal", codes);
      },
    },
  ]);
}

async function printStickers(type, codes) {
  const endpoint =
    type === "thermal" ? "generate_thermal_stickers" : "generate_stickers";
  const payload = codes ? { codes } : {};
  const response = await apiCall(endpoint, payload);

  if (response.ok && response.data && response.data.output) {
    const suggestedName =
      type === "thermal" ? "stickers_thermal.pdf" : "stickers_a4.pdf";
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "PDF File",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        const res = await fetch(response.data.output);
        const blob = await res.blob();
        await writable.write(blob);
        await writable.close();
        showModal(
          "Stickers",
          response.message + " PDF guardado exitosamente.",
          [{ label: "Aceptar", kind: "primary-btn" }],
        );
      } else {
        const a = document.createElement("a");
        a.href = response.data.output;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showModal("Stickers", response.message + " Descarga iniciada.", [
          { label: "Aceptar", kind: "primary-btn" },
        ]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        showModal("Error", "No se pudo guardar el archivo.", [
          { label: "Aceptar", kind: "primary-btn" },
        ]);
      }
    }
  } else {
    showModal("Stickers", response.message || "Error al generar el PDF.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
  }
}

async function resetDatabaseFlow() {
  showModal(
    "⚠️ Borrar base de datos",
    `<div style="line-height: 1.6; color: var(--text);">
       ¿Estás absolutamente seguro de que deseas restablecer la base de datos?
       <br/><br/>
       <strong>Esta acción eliminará de forma permanente:</strong>
       <ul style="margin: 10px 0; padding-left: 20px;">
         <li>Todos los productos registrados</li>
         <li>Todos los tickets de ventas</li>
         <li>Todo el historial de devoluciones y caja</li>
       </ul>
       Esta acción <strong>NO se puede deshacer</strong>.
     </div>`,
    [
      { label: "Cancelar", kind: "secondary-btn" },
      {
        label: "⚠️ Sí, continuar",
        kind: "danger-btn",
        close: false,
        onClick: () => {
          showModal(
            "🔴 Confirmación final requerida",
            `<div style="line-height: 1.6; color: var(--text);">
               Para confirmar, escribe la palabra <strong style="color: #e53e3e; font-size: 1.1rem;">BORRAR</strong> a continuación:
               <br/><br/>
               <input
                 id="confirmResetInput"
                 type="text"
                 placeholder="Escribe BORRAR aquí"
                 style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--line); border-radius: 10px; font-size: 1rem; background: var(--surface); color: var(--text); box-sizing: border-box;"
                 autofocus
               />
             </div>`,
            [
              { label: "Cancelar", kind: "secondary-btn" },
              {
                label: "🗑️ Borrar base de datos",
                kind: "danger-btn",
                close: false,
                onClick: async () => {
                  const val = $("#confirmResetInput").value;
                  if (val !== "BORRAR") {
                    showModal("Error de confirmación", "Debes escribir exactamente 'BORRAR' para proceder.", [
                      { label: "Volver a intentar", kind: "primary-btn", onClick: () => resetDatabaseFlow() }
                    ]);
                    return;
                  }
                  hideModal();
                  showToast("Restableciendo base de datos...");
                  try {
                    const response = await apiCall("reset_database", {});
                    showModal("✅ Éxito", response.message || "Base de datos restablecida correctamente.", [
                      {
                        label: "Aceptar",
                        kind: "primary-btn",
                        onClick: async () => {
                          await refreshProducts();
                          await refreshDashboard();
                          await refreshHistory();
                        }
                      }
                    ]);
                  } catch (err) {
                    showModal("Error", err.message || "Error al restablecer la base de datos.", [
                      { label: "Aceptar", kind: "primary-btn" }
                    ]);
                  }
                }
              }
            ]
          );
        }
      }
    ]
  );
}

// Envuelve handlers async: muestra modal de error si lanzan una excepción
function guard(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      showModal("Error", err.message || "Ocurrió un error inesperado.", [
        { label: "Aceptar", kind: "primary-btn" },
      ]);
    }
  };
}

async function bindEvents() {
  $("#loginForm").addEventListener("submit", guard(submitLogin));
  $("#logoutBtn").addEventListener(
    "click",
    guard(async () => {
      await apiCall("logout");
      state.user = null;
      $("#appSidebar").classList.add("hidden");
      $("#appArea").classList.add("hidden");
      $("#loginScreen").classList.remove("hidden");
    }),
  );
  $("#themeBtn").addEventListener("click", toggleTheme);
  $$(".menu-item").forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.view)),
  );
  $$("[data-jump]").forEach((button) =>
    button.addEventListener("click", () => setView(button.dataset.jump)),
  );
  $("#barcodeInput").addEventListener(
    "keydown",
    guard(async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const code = $("#barcodeInput").value.trim().replace(/`/g, '-');
        if (code) {
          await addToCartByCode(code);
        }
        $("#barcodeInput").value = "";
        $("#barcodeInput").focus();
      }
    }),
  );
  $("#addBarcodeBtn").addEventListener(
    "click",
    guard(async () => {
      const code = $("#barcodeInput").value.trim().replace(/`/g, '-');
      if (code) {
        await addToCartByCode(code);
      }
      $("#barcodeInput").value = "";
      $("#barcodeInput").focus();
    }),
  );
  $("#clearCartBtn").addEventListener("click", () => {
    state.cart = [];
    renderCart();
  });
  $("#previewSaleBtn").addEventListener("click", guard(previewSale));

  const prepareAddProduct = () => {
    clearProductForm();
    setView("productEdit");
  };
  $("#addProductBtn").addEventListener("click", prepareAddProduct);
  $("#quickAddProductBtn").addEventListener("click", prepareAddProduct);

  $("#productForm").addEventListener(
    "submit",
    guard(async (e) => {
      await saveProduct(e);
      setView("inventory");
    }),
  );
  $("#clearProductBtn").addEventListener("click", clearProductForm);
  $("#deleteProductBtn").addEventListener(
    "click",
    guard(deleteSelectedProduct),
  );
  $("#inventorySearch").addEventListener(
    "input",
    guard(async (event) => refreshProducts(event.target.value)),
  );
  $("#importCsvBtn").addEventListener("click", guard(importCsvFlow));
  $("#stickersBtn").addEventListener("click", guard(generateStickers));
  $("#refreshHistoryBtn").addEventListener("click", guard(refreshHistory));
  $("#loadReturnTicketBtn").addEventListener("click", guard(loadReturnTicket));
  $("#reprintBtn").addEventListener("click", guard(reprintSelectedSale));
  $("#editSaleBtn").addEventListener("click", guard(editSelectedSale));
  $("#voidSaleBtn").addEventListener("click", guard(deleteSelectedSale));

  $("#refreshDashboardBtn").addEventListener("click", guard(refreshDashboard));
  $("#resetDbBtn").addEventListener("click", guard(resetDatabaseFlow));
  $("#refreshPosBtn").addEventListener("click", guard(async () => {
    state.cart = [];
    renderCart();
    await refreshProducts();
    $("#barcodeInput").value = "";
    $("#barcodeInput").focus();
    showToast("Datos de venta actualizados.");
  }));
  $("#refreshInventoryBtn").addEventListener("click", guard(async () => {
    await refreshProducts($("#inventorySearch").value);
    showToast("Inventario actualizado.");
  }));
  $("#refreshReturnsBtn").addEventListener("click", guard(async () => {
    state.selectedReturnTicket = null;
    $("#returnTicketInput").value = "";
    $("#returnTicketInfo").innerHTML = "Devoluciones";
    // Ocultar botón Actualizar Factura
    const updateBtn = $("#updateInvoiceBtn");
    if (updateBtn) updateBtn.style.display = "none";
    $("#returnTable").innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--muted); padding: 40px 0;">
          Selecciona una venta de la lista o busca un ticket para comenzar.
        </td>
      </tr>
    `;
    await loadRecentSalesForReturns();
    showToast("Módulo de devoluciones restablecido.");
  }));

  $("#updateInvoiceBtn").addEventListener("click", guard(openUpdateInvoiceModal));

  $("#modalRoot").addEventListener("click", (event) => {
    if (event.target.id === "modalRoot") {
      hideModal();
    }
  });

  // Checkbox "Seleccionar todos" del inventario
  const selectAllCb = $("#selectAllForPrint");
  if (selectAllCb) {
    selectAllCb.addEventListener("change", () => {
      if (selectAllCb.checked) {
        state.products.forEach((p) => state.selectedForPrint.add(p.codigo));
      } else {
        state.products.forEach((p) => state.selectedForPrint.delete(p.codigo));
      }
      $("#inventoryTable")
        .querySelectorAll(".print-select")
        .forEach((cb) => {
          cb.checked = state.selectedForPrint.has(cb.dataset.code);
        });
      updateSelectAllState();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await bindEvents();
    setTheme("light");
    $("#loginScreen").classList.remove("hidden");
    $("#barcodeInput").focus();
  } catch (error) {
    showModal("Error", error.message, [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
  }
});
