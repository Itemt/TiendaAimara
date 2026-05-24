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

function printReceiptDirect(saleId, total, items) {
  const printWindow = window.open('', '_blank', 'width=600,height=600');
  const formatMoney = (value) => {
    return '$' + Math.round(Number(value || 0)).toLocaleString('en-US');
  };
  const itemsHtml = items.map(item => `
    <div class="item-row">
      <div class="item-name">${item.nombre.toUpperCase()}</div>
      <div class="item-details">
        <span class="item-qty-price">${item.cantidad} x ${formatMoney(item.precio)}</span>
        <span class="item-subtotal">${formatMoney(item.subtotal)}</span>
      </div>
    </div>
  `).join('');
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  
  const html = `
    <html>
    <head>
      <title>Ticket #${saleId}</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 0;
        }
        body {
          width: 58mm;
          margin: 0;
          padding: 4mm 4mm 8mm 4mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: bold;
          color: #000;
          background: #fff;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .header {
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .title {
          font-size: 18px;
          font-weight: 900;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
        }
        .subtitle-info {
          font-size: 9.5px;
          font-weight: bold;
          margin: 2px 0;
        }
        .separator {
          border-top: 1.8px solid #000;
          margin: 8px 0;
        }
        .info-section {
          font-size: 10.5px;
          line-height: 1.45;
          margin: 6px 0;
        }
        .info-title {
          font-weight: bold;
          font-size: 11.5px;
        }
        .items-section {
          margin: 8px 0;
        }
        .item-row {
          margin-bottom: 8px;
          page-break-inside: avoid;
        }
        .item-name {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
        }
        .item-qty-price {
          font-style: italic;
          font-weight: bold;
        }
        .item-subtotal {
          font-weight: bold;
        }
        .total-container {
          margin-top: 10px;
          page-break-inside: avoid;
        }
        .total-line {
          float: right;
          width: 45%;
          border-top: 1.5px solid #000;
          margin-bottom: 4px;
        }
        .total-row {
          font-size: 13.5px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .policies-section {
          margin-top: 20px;
          font-size: 9.5px;
          line-height: 1.4;
          text-align: center;
          page-break-inside: avoid;
        }
        .policies-title {
          font-weight: bold;
          font-size: 10.5px;
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="text-center header">
        <div class="title">AIMARA MODA</div>
        <div class="subtitle-info">NIT: 1065.890.123-1</div>
        <div class="subtitle-info">Calle 50 #1 -7 Barrancabermeja</div>
        <div class="subtitle-info">WhatsApp: +57 311 837 1495</div>
      </div>
      
      <div class="separator"></div>
      
      <div class="info-section">
        <div class="info-title">TICKET #: ${saleId}</div>
        <div>FECHA: ${dateStr} &nbsp; HORA: ${timeStr}</div>
      </div>
      
      <div class="separator"></div>
      
      <div class="items-section">
        ${itemsHtml}
      </div>
      
      <div class="total-container">
        <div class="total-line"></div>
        <div style="clear: both;"></div>
        <div class="total-row">
          <span>TOTAL:</span>
          <span>${formatMoney(total)}</span>
        </div>
      </div>
      
      <div class="policies-section">
        <div class="policies-title">POLÍTICAS DE CAMBIO</div>
        <div>Conserve este ticket para cambios.</div>
        <div>Plazo: 15 días. Etiquetas originales.</div>
        <div>IG: @Aimara_ModaFashion09</div>
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
  const response = await apiCall("list_products", { search_text: search });
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
  renderDashboard();
}

async function refreshHistory() {
  const response = await apiCall("get_sales", {});
  const sales = response.data || [];
  $("#historyTable").innerHTML = sales
    .map(
      (sale) => `
    <tr data-sale-id="${sale.id_venta}">
      <td>${sale.id_venta}</td>
      <td>${sale.fecha}</td>
      <td>${money(sale.total)}</td>
      <td>${money(sale.total_devuelto)}</td>
      <td>${money(sale.total_neto)}</td>
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
  const response = await apiCall("get_product", code);
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
  const payload = {
    original_code: $("#originalCode").value,
    codigo: $("#productCode").value,
    nombre: $("#productName").value,
    categoria: $("#productCategory").value,
    talla: $("#productSize").value,
    precio: $("#productPrice").value,
    stock: $("#productStock").value,
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
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = values[index];
    });
    if (obj.nombre) {
      rows.push({
        codigo: obj.codigo || "",
        nombre: obj.nombre || "",
        categoria: obj.categoria || "",
        talla: obj.talla || "",
        precio: parseFloat(obj.precio) || 0,
        stock: parseInt(obj.stock) || 0,
      });
    }
  }
  return rows;
}

async function importCsvFlow() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        showModal(
          "Error",
          "El archivo CSV está vacío o el formato no es válido. Verifica que tenga cabeceras: codigo,nombre,categoria,talla,precio,stock",
          [{ label: "Aceptar", kind: "primary-btn" }],
        );
        return;
      }
      const response = await apiCall("import_products", rows);
      showModal("Importación", response.message, [
        { label: "Aceptar", kind: "primary-btn" },
      ]);
      await refreshProducts();
      await refreshDashboard();
    };
    reader.readAsText(file);
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
  const preview = await apiCall("get_sale_preview", state.cart);
  const items = preview.data.items || [];
  const total = preview.data.total || 0;
  const body = `
    <div class="list-card">${items.map((item) => `<div class="list-item"><strong>${item.nombre}</strong><br/>${item.cantidad} x ${money(item.precio)} = ${money(item.subtotal)}</div>`).join("")}</div>
    <h3 style="margin-top:16px;">Total: ${money(total)}</h3>
  `;
  showModal("Vista previa de facturación", body, [
    { label: "Volver a editar", kind: "secondary-btn" },
    {
      label: "Confirmar e imprimir",
      kind: "primary-btn",
      onClick: async () => {
        const result = await apiCall("create_sale", state.cart);
        if (result.ok && result.data) {
          printReceiptDirect(result.data.id_venta, result.data.total, state.cart);
          showModal(
            "Venta confirmada",
            `Ticket #${result.data.id_venta} guardado e impreso.`,
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
  const rows = response.data || [];
  if (rows.length === 0) {
    $("#returnTable").innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay productos en esta venta.</td></tr>';
    return;
  }
  renderReturnTable(rows);
}

function renderReturnTable(rows) {
  $("#returnTable").innerHTML = rows.map((row) => {
    const isReturnedAll = row.cantidad_restante <= 0;
    return `
      <tr data-return-code="${row.codigo}">
        <td>
          <strong>${row.nombre}</strong><br/>
          <span class="hint">${row.codigo} · ${money(row.precio)}</span>
        </td>
        <td>
          Comprado: ${row.cantidad}<br/>
          Devuelto: ${row.cantidad_devuelta}
        </td>
        <td>
          <input type="number" class="return-qty-input" data-code="${row.codigo}" min="1" max="${row.cantidad_restante}" value="${row.cantidad_restante}" ${isReturnedAll ? "disabled" : ""} style="width: 70px; padding: 6px; border: 1px solid var(--line); border-radius: 8px;" />
        </td>
        <td>
          <input type="text" class="return-reason-input" data-code="${row.codigo}" placeholder="Motivo" value="Cambio / Talla" ${isReturnedAll ? "disabled" : ""} style="padding: 6px; min-width: 120px; border: 1px solid var(--line); border-radius: 8px;" />
        </td>
        <td>
          <button class="danger-btn return-row-btn" data-code="${row.codigo}" ${isReturnedAll ? "disabled" : ""} style="padding: 6px 12px; font-size: 0.85rem;">
            Devolver
          </button>
        </td>
      </tr>
    `;
  }).join("");

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
            showModal("Devolución", response.message, [
              { label: "Aceptar", kind: "primary-btn" },
            ]);
            await refreshProducts();
            await refreshDashboard();
            await refreshHistory();
            await loadReturnTicket(state.selectedReturnTicket);
            await loadRecentSalesForReturns();
          }
        }
      ]);
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
      <div style="font-weight:700;">Selecciona la impresora</div>
    </div>
  `;

  showModal("Imprimir etiquetas", bodyHtml, [
    { label: "Cancelar", kind: "secondary-btn" },
    {
      label: "Imp. Directa Facturera (Tira 58mm)",
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
      label: "Imp. Directa Normal A4",
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
        await printA4StickersDirect(productsToPrint);
      },
    },
    {
      label: "Descargar PDF Stickers (58x32mm)",
      kind: "secondary-btn",
      close: false,
      onClick: async () => {
        const scope = document.querySelector('input[name="printScope"]:checked')?.value || "all";
        const codes = scope === "selected" ? Array.from(state.selectedForPrint) : null;
        hideModal();
        await printStickers("thermal", codes);
      },
    },
    {
      label: "Descargar PDF Normal A4",
      kind: "secondary-btn",
      close: false,
      onClick: async () => {
        const scope = document.querySelector('input[name="printScope"]:checked')?.value || "all";
        const codes = scope === "selected" ? Array.from(state.selectedForPrint) : null;
        hideModal();
        await printStickers("a4", codes);
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
        const code = $("#barcodeInput").value.trim();
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
      const code = $("#barcodeInput").value.trim();
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
    await loadRecentSalesForReturns();
    if (state.selectedReturnTicket) {
      await loadReturnTicket(state.selectedReturnTicket);
    }
    showToast("Devoluciones actualizadas.");
  }));

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
