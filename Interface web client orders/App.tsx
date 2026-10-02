import { useEffect, useMemo, useState } from "react";

type IconName =
  | "arrow"
  | "bag"
  | "bike"
  | "chevron"
  | "clock"
  | "close"
  | "leaf"
  | "minus"
  | "pin"
  | "plus"
  | "search"
  | "store";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bag: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    bike: <><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="m5 17 4-8h4l3 8M8 12h7M14 7h3" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    leaf: <><path d="M19 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 9-7 9-15Z" /><path d="M5 20c2-5 5-8 10-11" /></>,
    minus: <path d="M5 12h14" />,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    store: <><path d="M4 10v10h16V10" /><path d="M3 10 5 4h14l2 6" /><path d="M8 20v-6h8v6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

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

export default function App() {
  const [activeCategory, setActiveCategory] = useState("Favoritos");
  const [mode, setMode] = useState("Domicilio");
  const [cart, setCart] = useState<Record<number, number>>({ 1: 2 });
  const [selected, setSelected] = useState<(typeof products)[number] | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = products.reduce((sum, product) => sum + (cart[product.id] || 0) * product.price, 0);
  const visibleProducts = useMemo(() => {
    if (query.trim()) {
      return products.filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase()));
    }
    if (activeCategory === "Favoritos") return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, query]);

  useEffect(() => {
    document.body.style.overflow = selected || cartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected, cartOpen]);

  const changeQuantity = (id: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
  };

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
        <div className="top-actions">
          <button className="icon-button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Buscar">
            <Icon name="search" />
          </button>
          <button className="cart-top" onClick={() => setCartOpen(true)} aria-label={`Abrir carrito con ${cartCount} productos`}>
            <Icon name="bag" />
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search-panel">
          <Icon name="search" size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en la carta" aria-label="Buscar en la carta" />
          <button onClick={() => { setSearchOpen(false); setQuery(""); }} aria-label="Cerrar búsqueda"><Icon name="close" size={18} /></button>
        </div>
      )}

      <main>
        <section className="service-panel">
          <button className="location">
            <span className="location-icon"><Icon name="pin" size={17} /></span>
            <span><small>Estás pidiendo en</small><strong>Sucursal Centro</strong></span>
            <Icon name="chevron" size={17} />
          </button>
          <div className="mode-switch" role="radiogroup" aria-label="Modalidad de pedido">
            {[
              { label: "Domicilio", icon: "bike" as IconName },
              { label: "Recoger", icon: "store" as IconName },
            ].map((item) => (
              <button key={item.label} className={mode === item.label ? "active" : ""} onClick={() => setMode(item.label)} role="radio" aria-checked={mode === item.label}>
                <Icon name={item.icon} size={17} /> {item.label}
              </button>
            ))}
          </div>
          <div className="service-meta">
            <span><i className="status-dot" /> Abierto hasta las 22:30</span>
            <span><Icon name="clock" size={15} /> 35–50 min</span>
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
                  {product.tag && <span className={product.tag === "Vegetariano" ? "tag leaf-tag" : "tag"}>{product.tag === "Vegetariano" && <Icon name="leaf" size={12} />}{product.tag}</span>}
                </button>
                <div className="product-info">
                  <button className="product-title" onClick={() => setSelected(product)}><h3>{product.name}</h3></button>
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <strong>${product.price}</strong>
                    {cart[product.id] ? (
                      <div className="stepper">
                        <button onClick={() => changeQuantity(product.id, -1)} aria-label={`Quitar un ${product.name}`}><Icon name="minus" size={16} /></button>
                        <span>{cart[product.id]}</span>
                        <button onClick={() => changeQuantity(product.id, 1)} aria-label={`Agregar otro ${product.name}`}><Icon name="plus" size={16} /></button>
                      </div>
                    ) : (
                      <button className="add-button" onClick={() => setSelected(product)}><Icon name="plus" size={17} /> Agregar</button>
                    )}
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
            <div className="delivery-note"><Icon name="bike" /><span><strong>Entrega a domicilio</strong><small>35–50 min · Sucursal Centro</small></span></div>
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
              <div><span>Envío</span><span>$35</span></div>
              <div className="total"><strong>Total</strong><strong>${subtotal + 35}</strong></div>
              <button className="primary-button checkout" disabled={!cartCount}>Continuar pedido <Icon name="arrow" size={18} /></button>
              <small>El total final se confirma en el siguiente paso.</small>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
