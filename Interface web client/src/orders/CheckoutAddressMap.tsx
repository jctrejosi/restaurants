import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Icon from "./Icon";

export type AddressCoords = { lat: number; lng: number };

type Resolution = { address: string; city: string; label: string };

/** Centro por defecto (Puebla capital) mientras el cliente no ubica su dirección. */
const DEFAULT_CENTER: AddressCoords = { lat: 19.0433, lng: -98.1981 };

/** Estilo raster mínimo con tiles de OpenStreetMap (sin API key). */
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Geocodificación inversa: punto → dirección (Nominatim). */
async function reverseGeocode(lat: number, lng: number): Promise<Resolution | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    const parts = data.address ?? {};
    const road = parts.road || parts.pedestrian || parts.footway || parts.neighbourhood || "";
    const short = [road, parts.house_number].filter(Boolean).join(" ");
    return {
      address: [short, parts.suburb].filter(Boolean).join(", ") || data.display_name || "",
      city: parts.city || parts.town || parts.village || parts.municipality || parts.state || "",
      label: data.display_name || "",
    };
  } catch {
    return null;
  }
}

/** Geocodificación directa: texto → punto (Nominatim). */
async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name as string };
  } catch {
    return null;
  }
}

export default function CheckoutAddressMap({
  coords,
  confirmed,
  onCoordsChange,
  onConfirmChange,
  addressQuery,
  onResolvedAddress,
}: {
  coords: AddressCoords | null;
  confirmed: boolean;
  onCoordsChange: (coords: AddressCoords) => void;
  onConfirmChange: (confirmed: boolean) => void;
  /** Dirección escrita en el formulario, para ubicarla desde el mapa. */
  addressQuery: string;
  onResolvedAddress: (value: { address: string; city: string }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const handlersRef = useRef({ onCoordsChange, onConfirmChange });

  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  handlersRef.current = { onCoordsChange, onConfirmChange };

  // Mueve el marcador, avisa al padre y resuelve la dirección del punto.
  const placeMarker = async (point: AddressCoords) => {
    handlersRef.current.onCoordsChange(point);
    handlersRef.current.onConfirmChange(false);
    setResolving(true);
    setResolution(null);
    const result = await reverseGeocode(point.lat, point.lng);
    setResolving(false);
    if (result) setResolution(result);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = coords ?? DEFAULT_CENTER;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [start.lng, start.lat],
      zoom: 15,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const marker = new Marker({ draggable: true, color: "#b94a26" }).setLngLat([start.lng, start.lat]).addTo(map);
    markerRef.current = marker;
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      placeMarker({ lat, lng });
    });
    map.on("click", (event) => {
      const { lat, lng } = event.lngLat;
      marker.setLngLat([lng, lat]);
      placeMarker({ lat, lng });
    });

    // Deja el punto inicial disponible para confirmar.
    handlersRef.current.onCoordsChange(start);

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // El mapa se crea una sola vez; placeMarker usa refs estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateTypedAddress = async () => {
    const query = addressQuery.trim();
    if (query.length < 4) return;
    setLocating(true);
    const hit = await forwardGeocode(query);
    setLocating(false);
    if (!hit || !mapRef.current || !markerRef.current) return;
    const point = { lat: hit.lat, lng: hit.lng };
    mapRef.current.flyTo({ center: [point.lng, point.lat], zoom: 16 });
    markerRef.current.setLngLat([point.lng, point.lat]);
    placeMarker(point);
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsBusy(false);
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 16 });
        markerRef.current?.setLngLat([point.lng, point.lat]);
        placeMarker(point);
      },
      () => setGpsBusy(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="co-map-card">
      <div className="co-map-head">
        <div>
          <h3 className="co-section-title">Ubica tu dirección en el mapa</h3>
          <p className="co-map-hint">Arrastra el marcador o toca el mapa para elegir el punto exacto de entrega.</p>
        </div>
      </div>

      <div className="co-map" ref={containerRef} />

      <div className="co-map-actions">
        <button type="button" className="co-map-action" onClick={locateTypedAddress} disabled={locating || addressQuery.trim().length < 4}>
          <Icon name="search" size={15} /> {locating ? "Ubicando…" : "Ubicar dirección"}
        </button>
        <button type="button" className="co-map-action" onClick={useDeviceLocation} disabled={gpsBusy}>
          <Icon name="pin" size={15} /> {gpsBusy ? "Buscando…" : "Usar mi ubicación"}
        </button>
      </div>

      <div className="co-map-status">
        {resolving ? (
          <span className="co-map-resolving"><Icon name="clock" size={14} /> Buscando la dirección de ese punto…</span>
        ) : resolution ? (
          <>
            <span className="co-map-resolved">
              <Icon name="pin" size={14} /> <span>{resolution.label}</span>
            </span>
            <button
              type="button"
              className="co-map-use"
              onClick={() => {
                onResolvedAddress({ address: resolution.address, city: resolution.city });
                onConfirmChange(true);
              }}
            >
              Usar esta dirección
            </button>
          </>
        ) : (
          <span className="co-map-resolving">Mueve el marcador para resolver la dirección de ese punto.</span>
        )}
      </div>

      <button type="button" className={`co-map-confirm${confirmed ? " done" : ""}`} onClick={() => onConfirmChange(!confirmed)}>
        <Icon name={confirmed ? "check" : "pin"} size={16} />
        {confirmed ? "Ubicación confirmada" : "Confirmar esta ubicación"}
      </button>
    </div>
  );
}
