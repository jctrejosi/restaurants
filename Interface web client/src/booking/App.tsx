import { FormEvent, ReactNode, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Calendar from "@/components/Calendar";
import DateField from "@/components/DateField";
import TimeField from "@/components/TimeField";
import TimeSlots from "@/components/TimeSlots";
import { addMonths, formatLongDate, toISODate, todayISO } from "@/lib/dates";
import { getAvailabilityCount, getSlots, reservationCode } from "@/lib/availability";
import { routeHref } from "@/lib/router";

const photos = {
  hero: "https://images.unsplash.com/photo-1700625914939-30bf5479e3bc?auto=format&fit=crop&w=1800&q=88",
  tacos: "https://images.unsplash.com/photo-1711306723534-d94adf3c2199?auto=format&fit=crop&w=900&q=84",
  salmon: "https://images.unsplash.com/photo-1628394029760-0d7b0e083f90?auto=format&fit=crop&w=900&q=84",
  enchiladas: "https://images.unsplash.com/photo-1606625736768-f521ab7e23fb?auto=format&fit=crop&w=900&q=84",
  dining: "https://images.unsplash.com/photo-1706267701248-fbbeeb1f8c7c?auto=format&fit=crop&w=1200&q=84",
};

function Button({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return <button className={`button ${className}`} disabled={disabled} onClick={onClick} type={type}>{children}</button>;
}

function AppLink({ children, className = "", href }: { children: ReactNode; className?: string; href: string }) {
  return <a className={className} href={href}>{children}</a>;
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="section-title">
    <span className="eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    {text && <p>{text}</p>}
  </div>;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [people, setPeople] = useState(2);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const minDate = todayISO();
  const maxDate = toISODate(addMonths(new Date(), 3));
  const slots = useMemo(() => (date ? getSlots(date) : []), [date]);

  function chooseDate(iso: string) {
    setDate(iso);
    // Drop a previously chosen time if it is no longer available that day.
    setTime((current) =>
      current && getSlots(iso).some((slot) => slot.time === current && slot.available) ? current : "",
    );
  }

  function openBooking() {
    setBookingOpen(true);
    setMenuOpen(false);
    setConfirmed(false);
  }

  function submitBooking(event: FormEvent) {
    event.preventDefault();
    if (date && time) setConfirmed(true);
  }

  return (
    <div className="site-shell">
      <header className="header">
        <AppLink className="logo" href="#inicio">Punto <em>C</em><span>cocina de casa</span></AppLink>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <AppLink href="#carta">Carta</AppLink>
          <AppLink href="#como-funciona">Reservas</AppLink>
          <AppLink href="#sede">Sedes</AppLink>
          <AppLink href="#historias">Nosotros</AppLink>
          <AppLink href={routeHref("orders")}>Pedidos</AppLink>
        </nav>
        <div className="header-actions">
          <AppLink className="phone-link" href="tel:+525500000000"><Icon name="phone" size={17}/> +52 55 0000 0000</AppLink>
          <Button className="primary compact" onClick={openBooking}>Reservar</Button>
          <Button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="sr-only">Abrir menú</span><Icon name={menuOpen ? "close" : "menu"}/>
          </Button>
        </div>
      </header>

      {menuOpen && <nav className="mobile-nav" aria-label="Navegación móvil">
        {["Carta", "Reservas", "Sedes", "Nosotros"].map((item, index) => (
          <AppLink href={["#carta", "#como-funciona", "#sede", "#historias"][index]} key={item}>{item}<Icon name="arrow"/></AppLink>
        ))}
        <AppLink href={routeHref("orders")}>Pedidos<Icon name="arrow"/></AppLink>
        <p>Av. Principal 123, Ciudad de México</p>
      </nav>}

      <main>
        <section className="hero" id="inicio">
          <img src={photos.hero} alt="Mesa servida con platillos mexicanos para compartir" fetchPriority="high"/>
          <div className="hero-overlay"/>
          <div className="hero-content">
            <div className="trust-row">
              <span><Icon name="star" size={15}/> 4,8 · 320 reseñas</span>
              <span><Icon name="check" size={15}/> Cancelación flexible</span>
            </div>
            <p className="eyebrow light">Bienvenido a Punto C</p>
            <h1>Cocina de casa,<br/><i>hecha al momento.</i></h1>
            <p className="hero-copy">Sabores honestos, ingredientes locales y una mesa siempre lista para recibirte.</p>
            <div className="hero-buttons">
              <Button className="primary large" onClick={openBooking}>Reservar mesa <Icon name="arrow"/></Button>
              <AppLink className="button glass large" href="#carta">Ver la carta</AppLink>
            </div>
          </div>

          <form className="quick-booking" onSubmit={(event) => { event.preventDefault(); openBooking(); }}>
            <DateField
              availability={getAvailabilityCount}
              className="qb-field"
              max={maxDate}
              min={minDate}
              onChange={chooseDate}
              value={date}
            />
            <TimeField className="qb-field" date={date} onChange={setTime} slots={slots} value={time}/>
            <label><span><Icon name="people" size={18}/> Personas</span>
              <select aria-label="Número de personas" onChange={(e) => setPeople(Number(e.target.value))} value={people}>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>)}
              </select>
            </label>
            <Button className="primary booking-submit" type="submit">Buscar mesa <Icon name="arrow"/></Button>
          </form>
        </section>

        <aside className="location-strip">
          <div><span className="open-dot"/> <strong>Abierto ahora</strong><span> · hasta las 23:00</span></div>
          <div><Icon name="map" size={18}/><span>Av. Principal 123, Col. Centro</span></div>
          <AppLink href="#sede">Cómo llegar <Icon name="arrow" size={17}/></AppLink>
        </aside>

        <section className="intro-section" id="historias">
          <div className="intro-copy">
            <span className="eyebrow">Nuestra mesa</span>
            <h2>Lo sencillo,<br/><i>hecho memorable.</i></h2>
          </div>
          <div className="intro-text">
            <p>Cocinamos como en casa: sin prisas, con producto fresco y recetas que saben a sobremesa. Cada plato nace para compartirse.</p>
            <AppLink className="text-link" href="#carta">Conoce nuestra historia <Icon name="arrow"/></AppLink>
          </div>
        </section>

        <section className="dishes-section" id="carta">
          <SectionTitle eyebrow="Favoritos de la casa" title="De nuestra cocina a tu mesa" text="Una selección de esos platos por los que siempre se vuelve."/>
          <div className="dish-grid">
            {[
              { image: photos.tacos, tag: "Favorito", name: "Tacos al pastor", desc: "Cerdo marinado, piña asada, cebolla y cilantro.", price: "$125" },
              { image: photos.salmon, tag: "Sin gluten", name: "Salmón a la plancha", desc: "Vegetales de temporada, limón y mantequilla de hierbas.", price: "$215" },
              { image: photos.enchiladas, tag: "Vegetariano", name: "Enchiladas verdes", desc: "Salsa de tomatillo, queso fresco, crema y aguacate.", price: "$115" },
            ].map((dish) => <article className="dish-card" key={dish.name}>
              <div className="dish-image"><img src={dish.image} alt={dish.name} loading="lazy"/><span>{dish.tag}</span></div>
              <div className="dish-info"><div><h3>{dish.name}</h3><p>{dish.desc}</p></div><strong>{dish.price}</strong></div>
            </article>)}
          </div>
          <AppLink className="button secondary" href="#carta">Descubrir la carta completa <Icon name="arrow"/></AppLink>
        </section>

        <section className="steps-section" id="como-funciona">
          <div className="steps-photo"><img src={photos.dining} alt="Platillos y bebidas servidos sobre una mesa" loading="lazy"/></div>
          <div className="steps-content">
            <SectionTitle eyebrow="Tu mesa te espera" title="Reservar es así de simple"/>
            <ol>
              <li><span>01</span><div><h3>Elige cuándo venir</h3><p>Selecciona el día, la hora y cuántos son.</p></div></li>
              <li><span>02</span><div><h3>Déjanos tu contacto</h3><p>Sin registros ni contraseñas. Solo lo necesario.</p></div></li>
              <li><span>03</span><div><h3>Recibe tu confirmación</h3><p>Te enviamos tu código y listo. Así de fácil.</p></div></li>
            </ol>
            <Button className="primary large" onClick={openBooking}>Reservar mi mesa <Icon name="arrow"/></Button>
          </div>
        </section>

        <section className="review-section">
          <div className="quote-mark">“</div>
          <div className="stars">★★★★★</div>
          <blockquote>“Reservé desde el celular en menos de un minuto. La terraza es preciosa, pero la comida fue lo que nos hizo querer volver.”</blockquote>
          <p><strong>María G.</strong><span> · visita verificada</span></p>
          <div className="review-nav"><button aria-label="Reseña anterior">←</button><span>01 / 03</span><button aria-label="Reseña siguiente">→</button></div>
        </section>

        <section className="location-section" id="sede">
          <div className="location-photo"><img src={photos.hero} alt="Interior cálido de Punto C" loading="lazy"/></div>
          <div className="location-card">
            <span className="eyebrow">Encuéntranos</span>
            <h2>Punto C <i>Centro</i></h2>
            <p className="address">Av. Principal 123, Col. Centro<br/>Ciudad de México</p>
            <div className="hours"><span>Hoy</span><strong>08:00 — 23:00</strong></div>
            <div className="amenities"><span>Terraza</span><span>Estacionamiento</span><span>Accesible</span></div>
            <div className="location-actions">
              <Button className="primary" onClick={openBooking}>Reservar aquí</Button>
              <AppLink className="button secondary" href="https://maps.google.com" >Cómo llegar <Icon name="map"/></AppLink>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-main">
          <div><AppLink className="logo footer-logo" href="#inicio">Punto <em>C</em><span>cocina de casa</span></AppLink><p>Una mesa para disfrutar,<br/>una cocina para volver.</p></div>
          <div><h3>Explorar</h3><AppLink href="#carta">La carta</AppLink><AppLink href="#como-funciona">Reservas</AppLink><AppLink href="#sede">Sedes</AppLink><AppLink href="#historias">Nosotros</AppLink></div>
          <div><h3>Contacto</h3><p>+52 55 0000 0000</p><p>hola@puntoc.mx</p><p>Av. Principal 123, CDMX</p></div>
          <div className="newsletter"><h3>La sobremesa sigue</h3><p>Novedades y menús de temporada. Sin spam.</p><form onSubmit={(e) => e.preventDefault()}><input aria-label="Tu correo electrónico" placeholder="Tu correo electrónico" type="email"/><button aria-label="Suscribirme"><Icon name="arrow"/></button></form></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Punto C</span><div><AppLink href="#privacidad">Privacidad</AppLink><AppLink href="#cookies">Cookies</AppLink><AppLink href="#terminos">Términos</AppLink></div></div>
      </footer>

      <aside className="mobile-booking-bar" aria-label="Acceso rápido a reservas">
        <div>
          <span>Mesas disponibles</span>
          <strong>Reserva en menos de 1 min</strong>
        </div>
        <Button className="primary" onClick={openBooking}>Reservar <Icon name="arrow" size={17}/></Button>
      </aside>

      {bookingOpen && <div className="modal-backdrop" onMouseDown={() => setBookingOpen(false)}>
        <section aria-labelledby="booking-title" aria-modal="true" className="booking-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog">
          <Button className="modal-close" onClick={() => setBookingOpen(false)}><Icon name="close"/><span className="sr-only">Cerrar</span></Button>
          {!confirmed ? <>
            <span className="eyebrow">Reserva rápida</span>
            <h2 id="booking-title">¿Cuándo quieres venir?</h2>
            <p>Elige el día, la hora y cuántos son. Encuentra tu mesa en menos de un minuto.</p>
            <form onSubmit={submitBooking}>
              <Calendar
                availability={getAvailabilityCount}
                max={maxDate}
                min={minDate}
                onChange={chooseDate}
                value={date}
              />
              <div className="booking-time">
                <span className="slot-section-label">Hora{time && <em> · {people} {people === 1 ? "persona" : "personas"}</em>}</span>
                {date
                  ? <TimeSlots onChange={setTime} slots={slots} value={time}/>
                  : <p className="slot-hint">Elige un día para ver los horarios disponibles.</p>}
              </div>
              <div className="party-control"><span>Personas</span><div><Button onClick={() => setPeople(Math.max(1, people - 1))}><Icon name="minus"/></Button><strong>{people}</strong><Button onClick={() => setPeople(Math.min(8, people + 1))}><Icon name="plus"/></Button></div></div>
              <Button className="primary large full" disabled={!date || !time} type="submit">Confirmar reserva <Icon name="arrow"/></Button>
              <small>{date && time ? "Cancelación flexible · Sin registro" : "Elige un día y una hora para continuar"}</small>
            </form>
          </> : <div className="confirmation">
            <div className="confirmation-icon"><Icon name="check" size={30}/></div>
            <span className="eyebrow">Reserva confirmada</span>
            <h2 id="booking-title">Tu mesa está lista</h2>
            <p>{formatLongDate(date)} · {time} · {people} {people === 1 ? "persona" : "personas"}</p>
            <div className="confirmation-code"><span>Código de reserva</span><strong>{reservationCode(date, time, people)}</strong></div>
            <Button className="primary large full" onClick={() => setBookingOpen(false)}>Terminar</Button>
          </div>}
        </section>
      </div>}
    </div>
  );
}
