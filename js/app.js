"use strict";

/* ============ Utilidades ============ */
const $ = (sel) => document.querySelector(sel);
const moneda = (n) => "S/ " + n.toFixed(2);

// Lectura/escritura segura de localStorage (puede fallar en modo privado)
const guardar = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {} };
const leer = (clave, defecto) => {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; }
};

/* ============ Estado ============ */
let carrito = leer("tn_carrito", []);          // [{id, cantidad}]
let productoActual = null;                      // producto abierto en el modal

/* ============ Referencias al DOM ============ */
const contProductos = $("#productos");
const inputBuscar = $("#buscador");
const selCategoria = $("#categoria");
const selOrden = $("#orden");

const toastEl = new bootstrap.Toast($("#toast"), { delay: 2500 });
const modalEl = new bootstrap.Modal($("#modalProducto"));

function avisar(mensaje) {
  $("#toastMsg").textContent = mensaje;
  toastEl.show();
}

/* ============ Catálogo: filtros, búsqueda y orden ============ */
function cargarCategorias() {
  const cats = ["Todas", ...new Set(PRODUCTOS.map((p) => p.categoria))];
  selCategoria.innerHTML = cats.map((c) => `<option value="${c}">${c === "Todas" ? "Todas las categorías" : c}</option>`).join("");
}

function productosFiltrados() {
  const texto = inputBuscar.value.trim().toLowerCase();
  const cat = selCategoria.value;
  let lista = PRODUCTOS.filter((p) =>
    (cat === "Todas" || p.categoria === cat) &&
    (p.nombre.toLowerCase().includes(texto) || p.desc.toLowerCase().includes(texto))
  );
  switch (selOrden.value) {
    case "asc":    lista.sort((a, b) => a.precio - b.precio); break;
    case "desc":   lista.sort((a, b) => b.precio - a.precio); break;
    case "nombre": lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")); break;
  }
  return lista;
}

function pintarProductos() {
  const lista = productosFiltrados();
  contProductos.innerHTML = lista.map((p, i) => `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <article class="card product-card" style="animation-delay:${i * 60}ms">
        <div class="product-img" style="background:${p.color}" data-detalle="${p.id}"
             role="button" tabindex="0" aria-label="Ver detalle de ${p.nombre}">${p.emoji}</div>
        <div class="card-body d-flex flex-column">
          <span class="badge text-bg-secondary badge-cat align-self-start mb-2">${p.categoria}</span>
          <h3 class="h6 card-title">${p.nombre}</h3>
          <p class="price mt-auto mb-2">${moneda(p.precio)}</p>
          <button class="btn btn-accent w-100" data-agregar="${p.id}" type="button">Agregar al carrito</button>
        </div>
      </article>
    </div>`).join("");

  $("#sinResultados").classList.toggle("d-none", lista.length > 0);
  $("#contador").textContent = `Mostrando ${lista.length} de ${PRODUCTOS.length} productos`;
}

/* ============ Carrito ============ */
function agregarAlCarrito(id) {
  const item = carrito.find((i) => i.id === id);
  if (item) item.cantidad++;
  else carrito.push({ id, cantidad: 1 });
  actualizarCarrito();
  avisar("Producto agregado al carrito ✅");
}

function cambiarCantidad(id, delta) {
  const item = carrito.find((i) => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter((i) => i.id !== id);
  actualizarCarrito();
}

function actualizarCarrito() {
  const cont = $("#carritoItems");
  if (carrito.length === 0) {
    cont.innerHTML = '<p class="text-secondary text-center mt-4">Tu carrito está vacío 🛒</p>';
  } else {
    cont.innerHTML = carrito.map((i) => {
      const p = PRODUCTOS.find((x) => x.id === i.id);
      return `
      <div class="cart-item">
        <div class="cart-thumb" style="background:${p.color}">${p.emoji}</div>
        <div>
          <div class="fw-semibold small">${p.nombre}</div>
          <div class="text-secondary small">${moneda(p.precio)} c/u</div>
          <div class="d-flex align-items-center gap-2 mt-1">
            <button class="btn btn-outline-secondary btn-sm qty-btn" data-menos="${p.id}" aria-label="Quitar uno">−</button>
            <span>${i.cantidad}</span>
            <button class="btn btn-outline-secondary btn-sm qty-btn" data-mas="${p.id}" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <div class="fw-bold">${moneda(p.precio * i.cantidad)}</div>
      </div>`;
    }).join("");
  }
  const total = carrito.reduce((s, i) => s + PRODUCTOS.find((x) => x.id === i.id).precio * i.cantidad, 0);
  const unidades = carrito.reduce((s, i) => s + i.cantidad, 0);
  $("#carritoTotal").textContent = moneda(total);
  $("#cartBadge").textContent = unidades;
  guardar("tn_carrito", carrito);
}

/* ============ Eventos (delegación) ============ */
contProductos.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-agregar]");
  if (btn) return agregarAlCarrito(Number(btn.dataset.agregar));
  const img = e.target.closest("[data-detalle]");
  if (img) abrirDetalle(Number(img.dataset.detalle));
});
contProductos.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.dataset.detalle) {
    e.preventDefault();
    abrirDetalle(Number(e.target.dataset.detalle));
  }
});

$("#carritoItems").addEventListener("click", (e) => {
  const mas = e.target.closest("[data-mas]");
  const menos = e.target.closest("[data-menos]");
  if (mas) cambiarCantidad(Number(mas.dataset.mas), 1);
  if (menos) cambiarCantidad(Number(menos.dataset.menos), -1);
});

$("#btnVaciar").addEventListener("click", () => { carrito = []; actualizarCarrito(); });
$("#btnComprar").addEventListener("click", () => {
  if (carrito.length === 0) return avisar("Tu carrito está vacío");
  carrito = [];
  actualizarCarrito();
  avisar("¡Gracias por tu compra! 🎉");
});

[inputBuscar, selCategoria, selOrden].forEach((el) => el.addEventListener("input", pintarProductos));
$("#limpiar").addEventListener("click", () => {
  inputBuscar.value = ""; selCategoria.value = "Todas"; selOrden.value = "default";
  pintarProductos();
});

/* ============ Modal de detalle ============ */
function abrirDetalle(id) {
  productoActual = PRODUCTOS.find((p) => p.id === id);
  $("#modalTitulo").textContent = productoActual.nombre;
  $("#modalDesc").textContent = productoActual.desc;
  $("#modalPrecio").textContent = moneda(productoActual.precio);
  const img = $("#modalImg");
  img.textContent = productoActual.emoji;
  img.style.background = productoActual.color;
  modalEl.show();
}
$("#modalAgregar").addEventListener("click", () => {
  if (productoActual) agregarAlCarrito(productoActual.id);
  modalEl.hide();
});

/* ============ Modo oscuro ============ */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-bs-theme", tema);
  $("#themeToggle").textContent = tema === "dark" ? "☀️" : "🌙";
  guardar("tn_tema", tema);
}
$("#themeToggle").addEventListener("click", () => {
  const actual = document.documentElement.getAttribute("data-bs-theme");
  aplicarTema(actual === "dark" ? "light" : "dark");
});

/* ============ Validación del formulario ============ */
$("#formContacto").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const ok = form.checkValidity();
  form.classList.add("was-validated");
  $("#formOk").classList.toggle("d-none", !ok);
  if (ok) { form.reset(); form.classList.remove("was-validated"); }
});

/* ============ Inicio ============ */
$("#anio").textContent = new Date().getFullYear();
aplicarTema(leer("tn_tema", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
cargarCategorias();
pintarProductos();
actualizarCarrito();
