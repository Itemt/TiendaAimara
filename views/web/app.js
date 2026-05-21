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

async function refreshUsers() {
  if (state.user && state.user.rol !== "admin") return;
  try {
    const response = await apiCall("get_users", {});
    state.users = response.data || [];
    $("#usersTable").innerHTML = state.users
      .map(
        (u) => `
      <tr data-user-id="${u.id}">
        <td>${u.username}</td>
        <td>${u.rol === "admin" ? "Administrador" : "Cajero"}</td>
        <td>
          <button class="ghost-btn edit-user-btn" data-id="${u.id}" style="padding: 4px 8px; font-size: 0.85rem;">Editar</button>
          <button class="danger-btn delete-user-btn" data-id="${u.id}" style="padding: 4px 8px; font-size: 0.85rem;">Eliminar</button>
        </td>
      </tr>
    `,
      )
      .join("");

    $$(".edit-user-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.target.dataset.id);
        const user = state.users.find((u) => u.id === id);
        if (user) {
          $("#userId").value = user.id;
          $("#userName").value = user.username;
          $("#userPassword").value = "";
          $("#userRole").value = user.rol;
        }
      });
    });

    $$(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.target.dataset.id);
        showModal(
          "Eliminar usuario",
          "¿Seguro que deseas eliminar este usuario?",
          [
            { label: "Cancelar", kind: "secondary-btn" },
            {
              label: "Eliminar",
              kind: "danger-btn",
              onClick: async () => {
                const res = await apiCall("delete_user", { id: id });
                showModal("Usuarios", res.message, [
                  { label: "Aceptar", kind: "primary-btn" },
                ]);
                refreshUsers();
              },
            },
          ],
        );
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function saveUser(event) {
  event.preventDefault();
  const payload = {
    id: $("#userId").value ? parseInt($("#userId").value) : null,
    username: $("#userName").value,
    password: $("#userPassword").value,
    rol: $("#userRole").value,
  };
  const response = await apiCall("save_user", payload);
  showModal("Usuarios", response.message, [
    { label: "Aceptar", kind: "primary-btn" },
  ]);
  clearUserForm();
  refreshUsers();
}

function clearUserForm() {
  $("#userId").value = "";
  $("#userName").value = "";
  $("#userPassword").value = "";
  $("#userRole").value = "cajero";
}

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

function syncInventoryWarning(product) {
  if (Number(product.stock) < 5) {
    const chipId = `warn-${product.codigo}`;
    if (!document.getElementById(chipId)) {
      const warning = document.createElement("div");
      warning.id = chipId;
      warning.className = "warn-chip";
      warning.textContent = `Stock bajo: ${product.nombre} (${product.stock})`;
      $("#posWarnings").prepend(warning);
    }
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
  syncInventoryWarning(product);
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
  if (state.user && state.user.rol === "admin") {
    await refreshUsers();
  } else {
    // Hide users menu item if not admin
    const usersBtn = document.querySelector('[data-view="users"]');
    if (usersBtn) usersBtn.style.display = "none";
  }
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
  const warnings = preview.data.low_stock_hits || [];
  const warningsHtml = warnings.length
    ? `<div class="warn-chip">Productos con stock bajo: ${warnings.map((item) => `${item.nombre} (${item.stock})`).join(", ")}</div>`
    : "";
  const body = `
    <div>${warningsHtml}</div>
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
        showModal(
          "Venta confirmada",
          `Ticket #${result.data.id_venta} guardado e impreso.`,
          [{ label: "Aceptar", kind: "primary-btn" }],
        );
        state.cart = [];
        renderCart();
        await refreshProducts();
        await refreshDashboard();
        await refreshHistory();
      },
    },
  ]);
}

async function loadReturnTicket() {
  const ticket = Number($("#returnTicketInput").value || 0);
  if (!ticket) {
    showModal("Devoluciones", "Ingresa un número de ticket válido.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  const response = await apiCall("get_return_ticket", { id_venta: ticket });
  state.selectedReturnTicket = ticket;
  const rows = response.data || [];
  $("#returnTable").innerHTML = rows
    .map(
      (row) => `
    <tr data-return-code="${row.codigo}">
      <td>${row.codigo}</td>
      <td>${row.nombre}</td>
      <td>${row.cantidad}</td>
      <td>${row.cantidad_devuelta}</td>
      <td>${row.cantidad_restante}</td>
      <td class="checkbox-cell"><input type="radio" name="returnSelect" value="${row.codigo}" ${row.cantidad_restante <= 0 ? "disabled" : ""} /></td>
    </tr>
  `,
    )
    .join("");
  $("#returnTable")
    .querySelectorAll("tr")
    .forEach((row) => {
      row.addEventListener("click", () => {
        const radio = row.querySelector('input[type="radio"]');
        if (radio && !radio.disabled) {
          radio.checked = true;
          state.selectedReturnRow =
            rows.find((item) => item.codigo === radio.value) || null;
        }
      });
    });
}

async function processReturn() {
  if (!state.selectedReturnTicket || !state.selectedReturnRow) {
    showModal("Devoluciones", "Selecciona un ticket y un producto.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  const quantity = Number($("#returnQty").value || 0);
  const reason = $("#returnReason").value.trim();
  const response = await apiCall("process_return", {
    id_venta: state.selectedReturnTicket,
    codigo_producto: state.selectedReturnRow.codigo,
    cantidad: quantity,
    motivo: reason,
  });
  showModal("Devolución", response.message, [
    { label: "Aceptar", kind: "primary-btn" },
  ]);
  await refreshProducts();
  await refreshDashboard();
  await refreshHistory();
  await loadReturnTicket();
}

async function reprintSelectedSale() {
  if (!state.selectedHistorySale) {
    showModal("Historial", "Selecciona una venta primero.", [
      { label: "Aceptar", kind: "primary-btn" },
    ]);
    return;
  }
  const response = await apiCall("reprint_sale", {
    id_venta: state.selectedHistorySale,
  });
  showModal("Reimpresión", response.message, [
    { label: "Aceptar", kind: "primary-btn" },
  ]);
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
      label: "Imprimir en Térmica 58mm",
      kind: "secondary-btn",
      close: false,
      onClick: async () => {
        const scope =
          document.querySelector('input[name="printScope"]:checked')?.value ||
          "all";
        const codes =
          scope === "selected" ? Array.from(state.selectedForPrint) : null;
        hideModal();
        await printStickers("thermal", codes);
      },
    },
    {
      label: "Imprimir en Normal A4",
      kind: "primary-btn",
      close: false,
      onClick: async () => {
        const scope =
          document.querySelector('input[name="printScope"]:checked')?.value ||
          "all";
        const codes =
          scope === "selected" ? Array.from(state.selectedForPrint) : null;
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
  $("#loadReturnTicketBtn").addEventListener("click", guard(loadReturnTicket));
  $("#processReturnBtn").addEventListener("click", guard(processReturn));
  $("#refreshHistoryBtn").addEventListener("click", guard(refreshHistory));
  $("#reprintBtn").addEventListener("click", guard(reprintSelectedSale));
  $("#editSaleBtn").addEventListener("click", guard(editSelectedSale));
  $("#voidSaleBtn").addEventListener("click", guard(deleteSelectedSale));

  $("#userForm").addEventListener("submit", guard(saveUser));
  $("#clearUserBtn").addEventListener("click", clearUserForm);

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
