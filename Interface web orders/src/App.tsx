import { useEffect, useMemo, useRef, useState } from "react";
import Icon, { type IconName } from "./Icon";
import Checkout, { type CheckoutItem } from "./Checkout";

type PickupOrder = {
  code: string;
  items: CheckoutItem[];
  total: number;
  placedAt: number;
  readyMinutes: number;
};

const products = [
  {
    id: 1,
    name: "Tacos al pastor",
    description: "Cerdo al pastor, piña asada, cebolla y cilantro. Orden de 3.",
    price: 125,
    category: "Favoritos",
    tag: "Más pedido",
    image: "https://images.unsplash.com/photo-1683062332605-4e1209d75346?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=800",
  },
  {
    id: 2,
    name: "Guacamole de la casa",
    description: "Aguacate, pico de gallo, queso fresco y totopos artesanales.",
    price: 105,
    category: "Entradas",
    tag: "Vegetariano",
    image: "https://images.unsplash.com/photo-1647403352248-aeec9a170f7d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=800",
  },
  {
    id: 3,
    name: "Tacos de birria",
    description: "Res cocinada lento, queso, cebolla y consomé para acompañar.",
    price: 145,
    category: "Tacos",
    image: "https://images.unsplash.com/photo-1574782090889-7567420ce7e9?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=800",
  },
  {
    id: 4,
    name: "Papas con chile",
    description: "Papas crujientes, chile de árbol, limón y crema de cilantro.",
    price: 89,
    category: "Entradas",
    image: "https://images.unsplash.com/photo-1606168152642-aae9b879f3bd?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=800",
  },
  {
    id: 5,
    name: "Limonada de la casa",
    description: "Limón recién exprimido, hierbabuena y un toque de agave.",
    price: 45,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1625167171750-419e95f877d8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=800",
  },
];

const categories = ["Favoritos", "Entradas", "Tacos", "Especiales", "Bebidas"];

const branches = [
  { id: "centro", name: "Sucursal Centro", detail: "Av. Juárez 120 · a 1.2 km", hours: "Abierto hasta las 22:30", eta: "35–50 min" },
  { id: "norte", name: "Sucursal Norte", detail: "Blvd. del Norte 45 · a 3.8 km", hours: "Abierto hasta las 23:00", eta: "40–55 min" },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState("Favoritos");
  const [mode, setMode] = useState("Domicilio");
  const [branchId, setBranchId] = useState(branches[0].id);
  const [branchOpen, setBranchOpen] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({ 1: 2 });
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<(typeof products)[number] | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pickupNotice, setPickupNotice] = useState(false);
  const [lastPickupCode, setLastPickupCode] = useState<string | null>(null);
  const [pickupOrders, setPickupOrders] = useState<Record<string, PickupOrder>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("pickup_orders") ?? "{}");
      return parsed && typeof parsed === "object" ? (parsed as Record<string, PickupOrder>) : {};
    } catch {
      return {};
    }
  });
  const [codeQuery, setCodeQuery] = useState("");
  const [lookup, setLookup] = useState<{ code: string; order: PickupOrder | null } | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [toast, setToast] = useState<{ key: number; name: string; quantity: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  const branch = branches.find((item) => item.id === branchId) ?? branches[0];

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = products.reduce((sum, product) => sum + (cart[product.id] || 0) * product.price, 0);
  const deliveryFee = 35;
  const checkoutItems = products
    .filter((product) => cart[product.id])
    .map((product) => ({ id: product.id, name: product.name, image: product.image, price: product.price, quantity: cart[product.id] }));
  const visibleProducts = useMemo(() => {
    if (query.trim()) {
      return products.filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase()));
    }
    if (activeCategory === "Favoritos") return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, query]);
  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products.filter((product) => `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(term));
  }, [query]);
  const showSearchResults = searchFocus && query.trim().length > 0;

  useEffect(() => {
    document.body.style.overflow = selected || cartOpen || checkoutOpen || pickupNotice || lookup ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected, cartOpen, checkoutOpen, pickupNotice, lookup]);

  useEffect(() => {
    try {
      localStorage.setItem("pickup_orders", JSON.stringify(pickupOrders));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [pickupOrders]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchFocus(false);
      if (branchRef.current && !branchRef.current.contains(target)) setBranchOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchFocus(false);
        setBranchOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const changeQuantity = (id: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
  };

  const draftQuantity = (id: number) => draft[id] ?? 1;
  const changeDraft = (id: number, delta: number) => {
    setDraft((current) => ({ ...current, [id]: Math.min(99, Math.max(1, (current[id] ?? 1) + delta)) }));
  };

  const addToCart = (product: (typeof products)[number]) => {
    const quantity = draftQuantity(product.id);
    changeQuantity(product.id, quantity);
    setDraft((current) => ({ ...current, [product.id]: 1 }));
    setToast({ key: Date.now(), name: product.name, quantity });
  };

  const addControl = (product: (typeof products)[number], compact = false) => (
    <div className={compact ? "add-control compact" : "add-control"}>
      <div className="stepper compact">
        <button onClick={() => changeDraft(product.id, -1)} aria-label={`Quitar una unidad de ${product.name}`}><Icon name="minus" size={15} /></button>
        <span>{draftQuantity(product.id)}</span>
        <button onClick={() => changeDraft(product.id, 1)} aria-label={`Sumar una unidad de ${product.name}`}><Icon name="plus" size={15} /></button>
      </div>
      <button className={compact ? "add-button small" : "add-button"} onClick={() => addToCart(product)}>
        <Icon name="plus" size={16} /> Agregar
      </button>
    </div>
  );

  const startCheckout = () => {
    if (!cartCount) return;
    setCartOpen(false);
    if (mode === "En tienda") {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setPickupOrders((current) => ({
        ...current,
        [code]: { code, items: checkoutItems, total: subtotal, placedAt: Date.now(), readyMinutes: 20 + Math.floor(Math.random() * 11) },
      }));
      setLastPickupCode(code);
      setPickupNotice(true);
    } else {
      setCheckoutOpen(true);
    }
  };

  const lookupOrderCode = () => {
    const code = codeQuery.trim();
    if (!code) return;
    setLookup({ code, order: pickupOrders[code] ?? null });
  };

  const finishOrder = () => {
    setCheckoutOpen(false);
    setPickupNotice(false);
    setLastPickupCode(null);
    setCart({});
    setDraft({});
  };

  const formatReadyTime = (order: PickupOrder) =>
    new Date(order.placedAt + order.readyMinutes * 60000).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const isLookupReady = lookup?.order ? Date.now() - lookup.order.placedAt >= lookup.order.readyMinutes * 60000 : false;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" aria-label="Ir al inicio">
          <span className="brand-mark">C</span>
          <span>
            <strong>PUNTO C</strong>
            <small>COCINA DE BARRIO</small>
          </span>
        </button>
        <div className="search-static" ref={searchRef}>
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchFocus(true)}
            placeholder="Buscar en la carta"
            aria-label="Buscar en la carta"
            aria-expanded={showSearchResults}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><Icon name="close" size={15} /></button>
          )}
          {showSearchResults && (
            <div className="search-dropdown">
              {searchResults.length ? (
                searchResults.map((product) => (
                  <div className="search-result" key={product.id}>
                    <button className="search-result-main" onClick={() => { setSelected(product); setSearchFocus(false); }}>
                      <img src={product.image} alt="" />
                      <span><strong>{product.name}</strong><small>{product.category}</small></span>
                    </button>
                    <strong className="search-result-price">${product.price}</strong>
                    {addControl(product, true)}
                  </div>
                ))
              ) : (
                <div className="search-empty">
                  <strong>Sin resultados para "{query}"</strong>
                  <small>Prueba con otro nombre o explora la carta.</small>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="top-actions">
          <form className="order-code" onSubmit={(event) => { event.preventDefault(); lookupOrderCode(); }}>
            <Icon name="search" size={15} />
            <input
              value={codeQuery}
              onChange={(event) => setCodeQuery(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Código"
              inputMode="numeric"
              aria-label="Consultar pedido por código"
            />
            <button type="submit" disabled={!codeQuery} aria-label="Consultar pedido">
              <span className="order-code-text">Ver</span>
              <Icon name="arrow" size={14} />
            </button>
          </form>
          <button className="cart-top" onClick={() => setCartOpen(true)} aria-label={`Abrir carrito con ${cartCount} productos`}>
            <Icon name="bag" />
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="service-panel">
          <div className="location-wrap" ref={branchRef}>
            <button className={branchOpen ? "location open" : "location"} onClick={() => setBranchOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={branchOpen}>
              <span className="location-icon"><Icon name="pin" size={17} /></span>
              <span><small>Estás pidiendo en</small><strong>{branch.name}</strong></span>
              <Icon name="chevron" size={17} />
            </button>
            {branchOpen && (
              <div className="location-menu" role="listbox" aria-label="Elige una sucursal">
                {branches.map((item) => (
                  <button key={item.id} role="option" aria-selected={item.id === branchId} className={item.id === branchId ? "active" : ""} onClick={() => { setBranchId(item.id); setBranchOpen(false); }}>
                    <span className="location-icon"><Icon name="pin" size={16} /></span>
                    <span><strong>{item.name}</strong><small>{item.detail}</small></span>
                    {item.id === branchId && <Icon name="check" size={17} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mode-switch" role="radiogroup" aria-label="Modalidad de pedido">
            {[
              { label: "Domicilio", icon: "bike" as IconName },
              { label: "En tienda", icon: "store" as IconName },
            ].map((item) => (
              <button key={item.label} className={mode === item.label ? "active" : ""} onClick={() => setMode(item.label)} role="radio" aria-checked={mode === item.label}>
                <Icon name={item.icon} size={17} /> {item.label}
              </button>
            ))}
          </div>
          <div className="service-meta">
            <span><i className="status-dot" /> {branch.hours}</span>
            <span><Icon name="clock" size={15} /> {branch.eta}</span>
          </div>
        </section>

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">HOY SE ANTOJA</span>
            <h1>Sabor que se<br />queda contigo.</h1>
            <p>Cocina honesta, ingredientes frescos y ese toque de barrio que siempre se extraña.</p>
            <button onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}>
              Ver la carta <Icon name="arrow" size={18} />
            </button>
          </div>
          <div className="hero-image" role="img" aria-label="Mesa con una selección de tacos mexicanos" />
          <span className="hero-stamp"><strong>HECHO</strong><i>con</i><strong>CARIÑO</strong></span>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div><span className="eyebrow">NUESTRA CARTA</span><h2>¿Qué se te antoja?</h2></div>
            <p>Todo se prepara al momento.</p>
          </div>
          <nav className="categories" aria-label="Categorías del menú">
            {categories.map((category) => (
              <button key={category} className={activeCategory === category && !query ? "active" : ""} onClick={() => { setActiveCategory(category); setQuery(""); }}>
                {category}
              </button>
            ))}
          </nav>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <button className="product-image" onClick={() => setSelected(product)} aria-label={`Ver ${product.name}`}>
                  <img src={product.image} alt={product.name} />
                  {cart[product.id] && <span className="cart-badge" aria-label={`${cart[product.id]} en el pedido`}><Icon name="bag" size={11} /> {cart[product.id]}</span>}
                  {product.tag && <span className={product.tag === "Vegetariano" ? "tag leaf-tag" : "tag"}>{product.tag === "Vegetariano" && <Icon name="leaf" size={12} />}{product.tag}</span>}
                </button>
                <div className="product-info">
                  <button className="product-title" onClick={() => setSelected(product)}><h3>{product.name}</h3></button>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <strong>${product.price}</strong>
                    {addControl(product)}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visibleProducts.length && <div className="empty"><strong>No encontramos ese platillo</strong><p>Prueba con otro nombre o explora nuestras categorías.</p></div>}
        </section>
      </main>

      {cartCount > 0 && (
        <div className="cart-bar-wrap">
          <button className="cart-bar" onClick={() => setCartOpen(true)}>
            <span className="cart-count"><Icon name="bag" size={18} /><i>{cartCount}</i></span>
            <span>Ver mi pedido</span>
            <strong>${subtotal}</strong>
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" key={toast.key} role="status" aria-live="polite">
          <span className="toast-icon"><Icon name="bag" size={18} /></span>
          <div className="toast-copy"><strong>{toast.quantity > 1 ? `${toast.quantity} × ${toast.name}` : toast.name}</strong><small>Se añadió a tu pedido</small></div>
          <button className="toast-action" onClick={() => { setCartOpen(true); setToast(null); }}>Ver pedido</button>
        </div>
      )}

      {selected && (
        <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="product-sheet" role="dialog" aria-modal="true" aria-label={`Personalizar ${selected.name}`}>
            <button className="sheet-close" onClick={() => setSelected(null)} aria-label="Cerrar"><Icon name="close" /></button>
            <img className="sheet-image" src={selected.image} alt="" />
            <div className="sheet-body">
              <span className="eyebrow">{selected.category}</span>
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
              <div className="option-heading"><strong>¿Cómo lo prefieres?</strong><span>Elige 1</span></div>
              {["Tal como viene", "Sin cebolla", "Salsa aparte"].map((option, index) => (
                <label className="radio-option" key={option}><span>{option}</span><input type="radio" name="preference" defaultChecked={index === 0} /></label>
              ))}
              <label className="notes"><span>Notas para cocina <small>Opcional</small></span><textarea placeholder="Ej. Sin picante, por favor" maxLength={100} /></label>
            </div>
            <div className="sheet-footer">
              <div className="stepper large">
                <button onClick={() => changeQuantity(selected.id, -1)} aria-label="Disminuir"><Icon name="minus" size={18} /></button>
                <span>{cart[selected.id] || 1}</span>
                <button onClick={() => changeQuantity(selected.id, 1)} aria-label="Aumentar"><Icon name="plus" size={18} /></button>
              </div>
              <button className="primary-button" onClick={() => { if (!cart[selected.id]) changeQuantity(selected.id, 1); setSelected(null); }}>
                {cart[selected.id] ? "Actualizar" : "Agregar al pedido"} · ${selected.price * (cart[selected.id] || 1)}
              </button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Tu pedido">
            <div className="drawer-head">
              <div><span className="eyebrow">CASI LISTO</span><h2>Tu pedido</h2></div>
              <button className="sheet-close static" onClick={() => setCartOpen(false)} aria-label="Cerrar"><Icon name="close" /></button>
            </div>
            <div className="delivery-note">
              <Icon name={mode === "En tienda" ? "store" : "bike"} />
              <span>
                <strong>{mode === "En tienda" ? "Recoger en tienda" : "Entrega a domicilio"}</strong>
                <small>{mode === "En tienda" ? `Listo en 20–30 min · ${branch.name}` : `35–50 min · ${branch.name}`}</small>
              </span>
            </div>
            <div className="cart-lines">
              {products.filter((product) => cart[product.id]).map((product) => (
                <div className="cart-line" key={product.id}>
                  <img src={product.image} alt="" />
                  <div><strong>{product.name}</strong><small>Tal como viene</small><span>${product.price * cart[product.id]}</span></div>
                  <div className="stepper vertical">
                    <button onClick={() => changeQuantity(product.id, -1)}><Icon name="minus" size={14} /></button>
                    <span>{cart[product.id]}</span>
                    <button onClick={() => changeQuantity(product.id, 1)}><Icon name="plus" size={14} /></button>
                  </div>
                </div>
              ))}
              {!cartCount && <div className="empty"><strong>Tu carrito está vacío</strong><p>Agrega algo rico de la carta.</p></div>}
            </div>
            <div className="drawer-summary">
              <div><span>Subtotal</span><span>${subtotal}</span></div>
              {mode === "Domicilio" && <div><span>Envío</span><span>${deliveryFee}</span></div>}
              <div className="total"><strong>Total</strong><strong>${mode === "Domicilio" ? subtotal + deliveryFee : subtotal}</strong></div>
              <button className="primary-button checkout" disabled={!cartCount} onClick={startCheckout}>Continuar pedido <Icon name="arrow" size={18} /></button>
              <small>{mode === "En tienda" ? "Confirmalo y te avisamos cuando esté listo." : "El total final se confirma en el siguiente paso."}</small>
            </div>
          </aside>
        </div>
      )}

      {pickupNotice && lastPickupCode && (
        <div className="overlay center" onMouseDown={(event) => event.target === event.currentTarget && finishOrder()}>
          <section className="pickup-notice" role="dialog" aria-modal="true" aria-label="Pedido en tienda recibido">
            <span className="pickup-icon"><Icon name="check" size={30} /></span>
            <h2>¡Pedido recibido!</h2>
            <span className="order-code-big">#{lastPickupCode}</span>
            <p>Tu pedido será preparado en breve. Guarda este código: podrás consultar su avance desde la barra superior.</p>
            <button className="primary-button" onClick={finishOrder}>Entendido</button>
          </section>
        </div>
      )}

      {lookup && (
        <div className="overlay center" onMouseDown={(event) => event.target === event.currentTarget && setLookup(null)}>
          <section className="order-modal" role="dialog" aria-modal="true" aria-label="Detalle del pedido">
            <button className="order-modal-close" onClick={() => setLookup(null)} aria-label="Cerrar"><Icon name="close" size={18} /></button>
            {lookup.order ? (
              <>
                <div className="order-modal-head">
                  <span className="eyebrow">PEDIDO EN TIENDA</span>
                  <span className="order-code-big">#{lookup.order.code}</span>
                  <span className={`order-status${isLookupReady ? " ready" : ""}`}>{isLookupReady ? "Listo para recoger" : "En preparación"}</span>
                </div>
                <div className="order-times">
                  <div><Icon name="clock" size={16} /><span>Tiempo de preparación</span><strong>~{lookup.order.readyMinutes} min</strong></div>
                  <div><Icon name="store" size={16} /><span>{isLookupReady ? "Listo desde" : "Listo a las"}</span><strong>{formatReadyTime(lookup.order)}</strong></div>
                  <div><Icon name="pin" size={16} /><span>Sucursal</span><strong>{branch.name}</strong></div>
                </div>
                <div className="order-items">
                  {lookup.order.items.map((item) => (
                    <div className="order-item" key={item.id}>
                      <span className="order-item-qty">{item.quantity}×</span>
                      <strong>{item.name}</strong>
                      <span className="order-item-price">${item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="order-total"><span>Total</span><strong>${lookup.order.total}</strong></div>
              </>
            ) : (
              <div className="order-empty">
                <span className="pickup-icon warn"><Icon name="search" size={26} /></span>
                <h2>No encontramos ese pedido</h2>
                <p>No hay ningún pedido con el código <strong>#{lookup.code}</strong>. Revisa el número e inténtalo de nuevo.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {checkoutOpen && (
        /* Pasarela de pago (solo en modo "Domicilio") */
        <Checkout
          items={checkoutItems}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          onClose={() => setCheckoutOpen(false)}
          onComplete={finishOrder}
        />
      )}
    </div>
  );
}
