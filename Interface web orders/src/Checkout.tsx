import { useState } from "react";
import Icon from "./Icon";

export type CheckoutItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type Address = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
};

const STEPS = ["Resumen", "Dirección", "Pago"];

const paymentOptions = [
  { key: "efectivo", label: "Efectivo al recibir", description: "Paga al repartidor cuando llegue", icon: "cash" },
  { key: "tarjeta", label: "Tarjeta débito / crédito", description: "Visa, Mastercard, Amex", icon: "card" },
  { key: "transferencia", label: "Transferencia SPEI", description: "Te damos los datos para transferir", icon: "transfer" },
] as const;

type PaymentKey = (typeof paymentOptions)[number]["key"];

const CLABE = "6461 8012 3456 7890 12";
const CLABE_BANK = "BBVA México";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Checkout({
  items,
  subtotal,
  deliveryFee,
  onClose,
  onComplete,
}: {
  items: CheckoutItem[];
  subtotal: number;
  deliveryFee: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState<Address>({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [payment, setPayment] = useState<PaymentKey>("efectivo");
  const [card, setCard] = useState({ cardholderName: "", cardNumber: "", expiry: "", cvv: "" });
  const [acceptance, setAcceptance] = useState({ terms: false, personalData: false });
  const [copied, setCopied] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [orderId] = useState(() => `PC-${Math.floor(100000 + Math.random() * 900000)}`);

  const total = subtotal + deliveryFee;
  const paymentLabel = paymentOptions.find((option) => option.key === payment)?.label ?? "";

  const validPhone = /^\d{10}$/.test(address.phone);
  const validEmail = emailPattern.test(address.email.trim());
  const addressReady =
    address.name.trim() !== "" && validPhone && validEmail && address.address.trim() !== "" && address.city.trim() !== "";
  const cardReady =
    card.cardholderName.trim() !== "" &&
    card.cardNumber.replace(/\D/g, "").length === 16 &&
    /^\d{2}\/\d{2}$/.test(card.expiry) &&
    card.cvv.length >= 3 &&
    acceptance.terms &&
    acceptance.personalData;
  const paymentReady = payment === "tarjeta" ? cardReady : true;

  const update = (key: keyof Address, value: string) => setAddress((prev) => ({ ...prev, [key]: value }));

  const handleCardNumber = (value: string) =>
    setCard((prev) => ({
      ...prev,
      cardNumber: value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(),
    }));

  const handleExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCard((prev) => ({ ...prev, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits }));
  };

  const copyClabe = () => {
    navigator.clipboard?.writeText(CLABE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmOrder = () => {
    setPlacing(true);
    setTimeout(() => {
      setPlacing(false);
      setDone(true);
    }, 1200);
  };

  const fields: { key: keyof Address; label: string; placeholder: string; type: string }[] = [
    { key: "name", label: "Nombre completo", placeholder: "María García", type: "text" },
    { key: "phone", label: "Celular", placeholder: "2212345678", type: "tel" },
    { key: "email", label: "Correo", placeholder: "correo@ejemplo.com", type: "email" },
    { key: "address", label: "Dirección", placeholder: "Av. Reforma 123, Col. Centro", type: "text" },
    { key: "city", label: "Ciudad", placeholder: "Puebla", type: "text" },
    { key: "notes", label: "Indicaciones adicionales (opcional)", placeholder: "Depto 4, portón negro…", type: "text" },
  ];

  return (
    <div className="co-overlay">
      <header className="co-topbar">
        {!done ? (
          <button className="co-icon-btn co-back" onClick={() => (step === 1 ? onClose() : setStep(step - 1))} aria-label="Atrás"><Icon name="arrow" size={19} /></button>
        ) : <span className="co-icon-btn co-spacer" />}
        <span className="co-brand">PUNTO C<small>COCINA DE BARRIO</small></span>
        {!done ? (
          <button className="co-icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={19} /></button>
        ) : <span className="co-icon-btn co-spacer" />}
      </header>

      {!done && (
        <div className="co-steps">
          {STEPS.map((label, index) => {
            const value = index + 1;
            const active = step === value;
            const complete = step > value;
            return (
              <div className="co-step" key={label}>
                <span className={`co-step-dot${complete ? " done" : active ? " active" : ""}`}>{complete ? <Icon name="check" size={13} /> : value}</span>
                <span className={`co-step-label${active ? " active" : ""}`}>{label}</span>
                {index < STEPS.length - 1 && <Icon name="chevron" size={14} />}
              </div>
            );
          })}
        </div>
      )}

      <div className="co-body">
        {!done && step === 1 && (
          <>
            <h2 className="co-title">Resumen del pedido</h2>
            <div className="co-card co-list">
              {items.map((item) => (
                <div className="co-line" key={item.id}>
                  <img src={item.image} alt="" />
                  <div className="co-line-info"><strong>{item.name}</strong><small>{item.quantity} × ${item.price}</small></div>
                  <span className="co-line-price">${item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="co-card co-totals">
              <div><span>Subtotal</span><span>${subtotal}</span></div>
              <div><span>Envío</span><span>${deliveryFee}</span></div>
              <div className="co-total"><strong>Total</strong><strong>${total}</strong></div>
            </div>
            <button className="co-primary" onClick={() => setStep(2)}>Continuar con la dirección →</button>
          </>
        )}

        {!done && step === 2 && (
          <>
            <h2 className="co-title">Datos y dirección de entrega</h2>
            <div className="co-card co-form">
              {fields.map((field) => {
                const value = address[field.key];
                const error =
                  field.key === "phone" && value !== "" && !validPhone
                    ? "Ingresa un celular válido de 10 dígitos"
                    : field.key === "email" && value !== "" && !validEmail
                      ? "Ingresa un correo válido"
                      : "";
                return (
                  <div className="co-field" key={field.key}>
                    <label htmlFor={`co-${field.key}`}>{field.label}</label>
                    <input
                      id={`co-${field.key}`}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(event) =>
                        update(field.key, field.key === "phone" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value)
                      }
                    />
                    {error && <span className="co-error">{error}</span>}
                  </div>
                );
              })}
            </div>
            <button className="co-primary" disabled={!addressReady} onClick={() => setStep(3)}>Continuar con el pago →</button>
          </>
        )}

        {!done && step === 3 && (
          <>
            <h2 className="co-title">Método de pago</h2>
            <div className="co-card co-pay-list">
              {paymentOptions.map((option) => (
                <label className={`co-pay${payment === option.key ? " selected" : ""}`} key={option.key}>
                  <input type="radio" name="co-payment" className="co-sr" checked={payment === option.key} onChange={() => setPayment(option.key)} />
                  <span className="co-radio">{payment === option.key && <i />}</span>
                  <span className="co-pay-icon"><Icon name={option.icon} size={18} /></span>
                  <span className="co-pay-text"><strong>{option.label}</strong><small>{option.description}</small></span>
                </label>
              ))}
            </div>

            {payment === "tarjeta" && (
              <div className="co-card co-form">
                <h3 className="co-section-title">Datos de la tarjeta</h3>
                <div className="co-field">
                  <label htmlFor="co-cardholder">Nombre del titular</label>
                  <input id="co-cardholder" type="text" placeholder="Como aparece en la tarjeta" value={card.cardholderName} onChange={(event) => setCard((prev) => ({ ...prev, cardholderName: event.target.value }))} />
                </div>
                <div className="co-field">
                  <label htmlFor="co-cardnumber">Número de tarjeta</label>
                  <input id="co-cardnumber" type="text" inputMode="numeric" placeholder="1234 5678 9012 3456" value={card.cardNumber} onChange={(event) => handleCardNumber(event.target.value)} />
                </div>
                <div className="co-row">
                  <div className="co-field">
                    <label htmlFor="co-expiry">Vencimiento (MM/AA)</label>
                    <input id="co-expiry" type="text" inputMode="numeric" placeholder="08/29" value={card.expiry} onChange={(event) => handleExpiry(event.target.value)} />
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-cvv">CVV</label>
                    <input id="co-cvv" type="password" inputMode="numeric" placeholder="123" value={card.cvv} onChange={(event) => setCard((prev) => ({ ...prev, cvv: event.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                  </div>
                </div>
                <div className="co-accept">
                  <label><input type="checkbox" checked={acceptance.terms} onChange={(event) => setAcceptance((prev) => ({ ...prev, terms: event.target.checked }))} /><span>Acepto los <a href="#" onClick={(event) => event.preventDefault()}>términos y condiciones</a> del pago.</span></label>
                  <label><input type="checkbox" checked={acceptance.personalData} onChange={(event) => setAcceptance((prev) => ({ ...prev, personalData: event.target.checked }))} /><span>Autorizo el tratamiento de mis datos personales.</span></label>
                </div>
              </div>
            )}

            {payment === "transferencia" && (
              <div className="co-card co-form">
                <h3 className="co-section-title">Transferencia SPEI</h3>
                <div className="co-key">
                  <div><span>CLABE</span><span className="co-key-value"><strong>{CLABE}</strong><button className="co-copy" onClick={copyClabe}>{copied ? <Icon name="check" size={13} /> : <Icon name="transfer" size={13} />}{copied ? "Copiada" : "Copiar"}</button></span></div>
                  <div><span>Banco</span><strong>{CLABE_BANK}</strong></div>
                  <div><span>Monto</span><strong>${total}</strong></div>
                </div>
                <p className="co-note">Tu pedido se confirmará cuando verifiquemos la transferencia. Usa tu nombre como concepto.</p>
              </div>
            )}

            <div className="co-card co-totals">
              <div><span>Subtotal</span><span>${subtotal}</span></div>
              <div><span>Envío</span><span>${deliveryFee}</span></div>
              <div className="co-total"><strong>Total a pagar</strong><strong>${total}</strong></div>
            </div>
            <button className="co-primary" disabled={!paymentReady || placing} onClick={confirmOrder}>{placing ? "Procesando pedido…" : "Confirmar pedido →"}</button>
          </>
        )}

        {done && (
          <div className="co-done">
            <span className="co-done-icon"><Icon name="check" size={34} /></span>
            <h2 className="co-title center">¡Pedido confirmado!</h2>
            <p className="co-sub">Tu pedido <strong>{orderId}</strong> fue recibido.</p>
            <div className="co-card co-summary">
              <div><Icon name="clock" size={16} /> Entrega estimada en 35–50 min</div>
              <div><Icon name="pin" size={16} /> {address.address}, {address.city}</div>
              <div><Icon name="card" size={16} /> {paymentLabel}</div>
            </div>
            <button className="co-primary" onClick={onComplete}>Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  );
}
