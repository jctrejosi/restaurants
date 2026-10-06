import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import {
  BORRADOR_STORAGE_KEY,
  type Agotado,
  type AgotadoOrigen,
  type Borrador,
  type BorradorPayload,
  type CartaRespuesta,
  type CategoriaCarta,
  type ClienteNuevoPayload,
  type ClienteResumen,
  type CobroRespuesta,
  type ContextoRespuesta,
  type EnvioPayload,
  type EnvioRespuesta,
  type Estacion,
  type EtiquetaCarta,
  type GrupoModificador,
  type Impuesto,
  type MesaCarta,
  type Mesero,
  type Modificador,
  type PrecuentaRespuesta,
  type ProductoCarta,
  type TurnoCajaResumen,
} from "@/modules/tomar-pedido/types"
import { calcularTotales } from "@/modules/tomar-pedido/totales"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/tomar-pedido/*` (§5).    */
/* Los mocks de `contexto`, `enviar` y `cobrar` aceptan `?turno=cerrado` para  */
/* QA del caso «sin turno de caja abierto» (se puede enviar, no cobrar).      */
/* -------------------------------------------------------------------------- */

const MIN = 60_000

function haceMinutos(min: number): string {
  return new Date(Date.now() - min * MIN).toISOString()
}

function enMinutos(min: number): string {
  return new Date(Date.now() + min * MIN).toISOString()
}

/* ------------------------------ Impuestos y estaciones -------------------- */

const IVA16: Impuesto = { id: "iva-16", nombre: "IVA 16%", tasaBps: 1600, tipo: "adicionado" }
const IEPS8: Impuesto = { id: "ieps-8", nombre: "IEPS 8% bebidas", tasaBps: 800, tipo: "adicionado" }

const ESTACIONES: Record<string, Estacion> = {
  parrilla: { id: "est-parrilla", nombre: "Parrilla" },
  cocina: { id: "est-cocina", nombre: "Cocina" },
  barraFria: { id: "est-barra-fria", nombre: "Barra fría" },
  barra: { id: "est-barra", nombre: "Barra" },
  postres: { id: "est-postres", nombre: "Postres" },
}

/* ------------------------------ Grupos de modificadores ------------------- */

function modificador(id: string, nombre: string, sobreprecioCentavos = 0): Modificador {
  return { id, nombre, sobreprecioCentavos, activo: true }
}

function grupoTermino(): GrupoModificador {
  return {
    id: "gr-termino",
    nombre: "Término de la carne",
    minimo: 1,
    maximo: 1,
    obligatorio: true,
    modificadores: [
      modificador("mod-rojo", "Rojo"),
      modificador("mod-medio", "Medio"),
      modificador("mod-tres-cuartos", "Tres cuartos"),
      modificador("mod-bien-cocido", "Bien cocido"),
    ],
  }
}

function grupoExtrasParrilla(): GrupoModificador {
  return {
    id: "gr-extras-parrilla",
    nombre: "Extras",
    minimo: 0,
    maximo: 4,
    obligatorio: false,
    modificadores: [
      modificador("mod-tocino", "Tocino", 1500),
      modificador("mod-queso-extra", "Queso extra", 1200),
      modificador("mod-aguacate", "Aguacate", 2000),
      modificador("mod-champinones", "Champiñones", 1800),
      modificador("mod-huevo", "Huevo estrellado", 1000),
    ],
  }
}

function grupoSinIngredientes(nombres: string[]): GrupoModificador {
  return {
    id: "gr-sin",
    nombre: "Sin ingredientes",
    minimo: 0,
    maximo: nombres.length,
    obligatorio: false,
    modificadores: nombres.map((nombre, indice) => modificador(`mod-sin-${indice}`, `Sin ${nombre.toLowerCase()}`)),
  }
}

function grupoAderezo(): GrupoModificador {
  return {
    id: "gr-aderezo",
    nombre: "Aderezo",
    minimo: 1,
    maximo: 2,
    obligatorio: true,
    modificadores: [
      modificador("mod-cesar", "César"),
      modificador("mod-ranch", "Ranch"),
      modificador("mod-mostaza-miel", "Mostaza-miel"),
      modificador("mod-vinagreta", "Vinagreta de la casa"),
      modificador("mod-sin-aderezo", "Sin aderezo"),
    ],
  }
}

function grupoProteina(): GrupoModificador {
  return {
    id: "gr-proteina",
    nombre: "Proteína adicional",
    minimo: 0,
    maximo: 2,
    obligatorio: false,
    modificadores: [
      modificador("mod-pollo", "Pollo a la parrilla", 3500),
      modificador("mod-res", "Res", 4000),
      modificador("mod-camaron", "Camarón", 5500),
    ],
  }
}

function grupoSalsa(): GrupoModificador {
  return {
    id: "gr-salsa",
    nombre: "Salsas",
    minimo: 0,
    maximo: 2,
    obligatorio: false,
    modificadores: [
      modificador("mod-salsa-roja", "Roja"),
      modificador("mod-salsa-verde", "Verde"),
      modificador("mod-salsa-habanero", "Habanero"),
    ],
  }
}

function grupoHielo(): GrupoModificador {
  return {
    id: "gr-hielo",
    nombre: "Hielo",
    minimo: 1,
    maximo: 1,
    obligatorio: true,
    modificadores: [modificador("mod-con-hielo", "Con hielo"), modificador("mod-sin-hielo", "Sin hielo")],
  }
}

function grupoEndulzante(): GrupoModificador {
  return {
    id: "gr-endulzante",
    nombre: "Endulzante",
    minimo: 0,
    maximo: 2,
    obligatorio: false,
    modificadores: [
      modificador("mod-sin-azucar", "Sin azúcar"),
      modificador("mod-ligero", "Endulzante ligero"),
      modificador("mod-stevia", "Stevia"),
    ],
  }
}

function grupoExtrasDulces(): GrupoModificador {
  return {
    id: "gr-extras-dulces",
    nombre: "Extras dulces",
    minimo: 0,
    maximo: 3,
    obligatorio: false,
    modificadores: [
      modificador("mod-bola-nieve", "Bola de nieve", 1500),
      modificador("mod-cajeta", "Cajeta extra", 1000),
      modificador("mod-chispas", "Chispas de chocolate", 800),
    ],
  }
}

/* ---------------------------------- Carta --------------------------------- */

const CATEGORIAS: { id: string; nombre: string; orden: number }[] = [
  { id: "cat-entradas", nombre: "Entradas", orden: 1 },
  { id: "cat-ensaladas", nombre: "Ensaladas", orden: 2 },
  { id: "cat-cortes", nombre: "Cortes y parrilla", orden: 3 },
  { id: "cat-pastas", nombre: "Pastas", orden: 4 },
  { id: "cat-postres", nombre: "Postres", orden: 5 },
  { id: "cat-bebidas", nombre: "Bebidas", orden: 6 },
]

type AgotadoCfg = {
  origen: AgotadoOrigen
  detalle: string
  motivo: string
  /** Minutos desde ahora; `null` = sin reactivación estimada. */
  reactivacionMin: number | null
}

type ProductoCfg = {
  id: string
  nombre: string
  descripcion: string
  categoriaId: string
  centavos: number
  impuesto?: Impuesto
  estacion: Estacion | null
  etiquetas?: EtiquetaCarta[]
  grupos?: GrupoModificador[]
  agotado?: AgotadoCfg
  alternativaNombre?: string
}

const PRODUCTOS_CFG: ProductoCfg[] = [
  /* Entradas */
  {
    id: "prod-guacamole",
    nombre: "Guacamole con totopos",
    descripcion: "Aguacate hass, cebolla, cilantro y chile serrano.",
    categoriaId: "cat-entradas",
    centavos: 12900,
    estacion: ESTACIONES.cocina,
    etiquetas: ["recomendado", "vegetariano"],
    grupos: [grupoSinIngredientes(["Cebolla", "Tomate", "Cilantro", "Picante"])],
    alternativaNombre: "Queso fundido con chorizo",
  },
  {
    id: "prod-queso-fundido",
    nombre: "Queso fundido con chorizo",
    descripcion: "Mezcla de quesos fundidos con chorizo español y tortillas de harina.",
    categoriaId: "cat-entradas",
    centavos: 14500,
    estacion: ESTACIONES.cocina,
    grupos: [grupoSinIngredientes(["Chorizo", "Cebolla"])],
  },
  {
    id: "prod-sopa-tortilla",
    nombre: "Sopa de tortilla",
    descripcion: "Caldo de jitomate, tiras de tortilla, aguacate y chile pasilla.",
    categoriaId: "cat-entradas",
    centavos: 9900,
    estacion: ESTACIONES.cocina,
    etiquetas: ["menu_del_dia"],
    grupos: [grupoSinIngredientes(["Crema", "Aguacate", "Chile pasilla", "Queso"])],
  },
  {
    id: "prod-esquites",
    nombre: "Esquites de la casa",
    descripcion: "Granos de elote salteados con epazote, mayonesa y queso cotija.",
    categoriaId: "cat-entradas",
    centavos: 8500,
    estacion: ESTACIONES.cocina,
    etiquetas: ["vegetariano", "picante"],
    grupos: [grupoSinIngredientes(["Mayonesa", "Chile", "Limón", "Queso"])],
  },
  {
    id: "prod-alitas",
    nombre: "Alitas BBQ (8 pzas)",
    descripcion: "Alitas marinadas con salsa BBQ de la casa y apio.",
    categoriaId: "cat-entradas",
    centavos: 15900,
    estacion: ESTACIONES.parrilla,
    grupos: [
      {
        id: "gr-salsa-alitas",
        nombre: "Salsa",
        minimo: 1,
        maximo: 1,
        obligatorio: true,
        modificadores: [
          modificador("mod-bbq", "BBQ de la casa"),
          modificador("mod-bufalo", "Búfalo"),
          modificador("mod-natural", "Natural"),
        ],
      },
      grupoSinIngredientes(["Apio", "Aderezo ranch"]),
    ],
  },
  /* Ensaladas */
  {
    id: "prod-cesar",
    nombre: "César con pollo",
    descripcion: "Lechuga romana, pollo a la parrilla, parmesano y crutones.",
    categoriaId: "cat-ensaladas",
    centavos: 14900,
    estacion: ESTACIONES.barraFria,
    etiquetas: ["recomendado"],
    grupos: [grupoAderezo(), grupoProteina(), grupoSinIngredientes(["Crutones", "Parmesano"])],
  },
  {
    id: "prod-ensalada-casa",
    nombre: "Ensalada de la casa",
    descripcion: "Mezcla de hojas verdes, jitomate cherry, pepino y semillas.",
    categoriaId: "cat-ensaladas",
    centavos: 11900,
    estacion: ESTACIONES.barraFria,
    etiquetas: ["vegetariano"],
    grupos: [grupoAderezo(), grupoSinIngredientes(["Pepino", "Jitomate", "Semillas"])],
  },
  {
    id: "prod-ensalada-atun",
    nombre: "Ensalada de atún",
    descripcion: "Atún sellado, hojas mixtas, ajonjolí y aderezo agridulce.",
    categoriaId: "cat-ensaladas",
    centavos: 13900,
    estacion: ESTACIONES.barraFria,
    grupos: [grupoAderezo(), grupoSinIngredientes(["Ajonjolí", "Jitomate"])],
  },
  {
    id: "prod-bowl-quinoa",
    nombre: "Bowl de quinoa",
    descripcion: "Quinoa, aguacate, elote, frijol negro y aderezo de limón.",
    categoriaId: "cat-ensaladas",
    centavos: 15500,
    estacion: ESTACIONES.barraFria,
    etiquetas: ["vegetariano", "nuevo"],
    grupos: [grupoProteina(), grupoAderezo(), grupoSinIngredientes(["Aguacate", "Elote", "Frijol"])],
  },
  /* Cortes y parrilla */
  {
    id: "prod-arrachera",
    nombre: "Arrachera 300 g",
    descripcion: "Arrachera al carbón con guarnición de papas y cebollitas.",
    categoriaId: "cat-cortes",
    centavos: 39500,
    estacion: ESTACIONES.parrilla,
    etiquetas: ["recomendado"],
    grupos: [grupoTermino(), grupoExtrasParrilla(), grupoSinIngredientes(["Sal", "Cebollitas"])],
  },
  {
    id: "prod-rib-eye",
    nombre: "Rib eye 350 g",
    descripcion: "Corte madurado al carbón con mantequilla de hierbas.",
    categoriaId: "cat-cortes",
    centavos: 52000,
    estacion: ESTACIONES.parrilla,
    grupos: [grupoTermino(), grupoExtrasParrilla(), grupoSinIngredientes(["Mantequilla", "Sal"])],
  },
  {
    id: "prod-sirloin",
    nombre: "Sirloin 300 g",
    descripcion: "Sirloin a la parrilla con papa al horno.",
    categoriaId: "cat-cortes",
    centavos: 34900,
    estacion: ESTACIONES.parrilla,
    grupos: [grupoTermino(), grupoExtrasParrilla()],
  },
  {
    id: "prod-costillas",
    nombre: "Costillas BBQ (media costilla)",
    descripcion: "Costillas de cerdo glaseadas, elote y ensalada de col.",
    categoriaId: "cat-cortes",
    centavos: 32900,
    estacion: ESTACIONES.parrilla,
    grupos: [grupoExtrasParrilla(), grupoSinIngredientes(["Ensalada de col", "Elote"])],
  },
  {
    id: "prod-hamburguesa",
    nombre: "Hamburguesa Punto C",
    descripcion: "Res 180 g, queso cheddar, tocino y papas a la francesa.",
    categoriaId: "cat-cortes",
    centavos: 18900,
    estacion: ESTACIONES.parrilla,
    etiquetas: ["recomendado"],
    grupos: [
      {
        id: "gr-termino-burger",
        nombre: "Término de la carne",
        minimo: 1,
        maximo: 1,
        obligatorio: true,
        modificadores: [
          modificador("mod-burger-rojo", "Rojo"),
          modificador("mod-burger-medio", "Medio"),
          modificador("mod-burger-bien", "Bien cocido"),
        ],
      },
      grupoExtrasParrilla(),
      grupoSinIngredientes(["Cebolla", "Tomate", "Lechuga", "Catsup", "Mostaza", "Queso"]),
    ],
  },
  {
    id: "prod-tacos-rib-eye",
    nombre: "Tacos de rib eye (3 pzas)",
    descripcion: "Tortillas de maíz, rib eye, cebollitas y guacamole.",
    categoriaId: "cat-cortes",
    centavos: 17500,
    estacion: ESTACIONES.parrilla,
    grupos: [grupoSalsa(), grupoSinIngredientes(["Cebollitas", "Cilantro"])],
  },
  {
    id: "prod-pechuga",
    nombre: "Pechuga a la parrilla",
    descripcion: "Pechuga marinada con verduras al vapor.",
    categoriaId: "cat-cortes",
    centavos: 21500,
    estacion: ESTACIONES.parrilla,
    grupos: [grupoExtrasParrilla(), grupoSinIngredientes(["Verduras", "Sal"])],
  },
  {
    id: "prod-salmon",
    nombre: "Salmón a las brasas",
    descripcion: "Filete de salmón con costra de ajonjolí y puré de papa.",
    categoriaId: "cat-cortes",
    centavos: 27500,
    estacion: ESTACIONES.parrilla,
    etiquetas: ["nuevo"],
    grupos: [
      {
        id: "gr-termino-salmon",
        nombre: "Término del salmón",
        minimo: 1,
        maximo: 1,
        obligatorio: true,
        modificadores: [
          modificador("mod-salmon-sellado", "Sellado"),
          modificador("mod-salmon-medio", "Medio"),
          modificador("mod-salmon-bien", "Bien cocido"),
        ],
      },
      grupoSinIngredientes(["Ajonjolí", "Puré"]),
    ],
    agotado: {
      origen: "salon",
      detalle: "Salón · mesa 14",
      motivo: "El cliente reportó que se terminó la porción del día",
      reactivacionMin: null,
    },
    alternativaNombre: "Pechuga a la parrilla",
  },
  {
    id: "prod-camarones",
    nombre: "Camarones al ajillo",
    descripcion: "Camarones salteados con ajo, guajillo y arroz blanco.",
    categoriaId: "cat-cortes",
    centavos: 24900,
    estacion: ESTACIONES.cocina,
    grupos: [grupoSinIngredientes(["Ajo", "Guajillo", "Arroz"])],
  },
  /* Pastas */
  {
    id: "prod-alfredo",
    nombre: "Alfredo con pollo",
    descripcion: "Fettuccine en salsa cremosa de parmesano con pollo.",
    categoriaId: "cat-pastas",
    centavos: 18900,
    estacion: ESTACIONES.cocina,
    grupos: [grupoProteina(), grupoSinIngredientes(["Parmesano", "Chile", "Perejil"])],
  },
  {
    id: "prod-bolognesa",
    nombre: "Bolognesa",
    descripcion: "Spaghetti con ragú de res y vino tinto.",
    categoriaId: "cat-pastas",
    centavos: 17900,
    estacion: ESTACIONES.cocina,
    grupos: [grupoProteina(), grupoSinIngredientes(["Queso", "Albahaca"])],
  },
  {
    id: "prod-pesto",
    nombre: "Pasta al pesto",
    descripcion: "Linguine con pesto de albahaca, piñón y parmesano.",
    categoriaId: "cat-pastas",
    centavos: 16900,
    estacion: ESTACIONES.cocina,
    etiquetas: ["vegetariano"],
    grupos: [grupoProteina(), grupoSinIngredientes(["Piñón", "Parmesano"])],
  },
  {
    id: "prod-lasagna",
    nombre: "Lasagna de la casa",
    descripcion: "Capas de pasta, ragú, bechamel y queso gratinado.",
    categoriaId: "cat-pastas",
    centavos: 19900,
    estacion: ESTACIONES.cocina,
    grupos: [grupoSinIngredientes(["Queso gratinado", "Bechamel"])],
  },
  /* Postres */
  {
    id: "prod-flan",
    nombre: "Flan napolitano",
    descripcion: "Flan casero con caramelo y crema batida.",
    categoriaId: "cat-postres",
    centavos: 7900,
    estacion: ESTACIONES.postres,
    grupos: [grupoExtrasDulces()],
  },
  {
    id: "prod-pastel-chocolate",
    nombre: "Pastel de chocolate",
    descripcion: "Rebanada de pastel húmedo con ganache.",
    categoriaId: "cat-postres",
    centavos: 8900,
    estacion: ESTACIONES.postres,
    etiquetas: ["recomendado"],
    grupos: [grupoExtrasDulces()],
  },
  {
    id: "prod-pay-limon",
    nombre: "Pay de limón",
    descripcion: "Base de galleta, crema de limón y merengue.",
    categoriaId: "cat-postres",
    centavos: 8500,
    estacion: ESTACIONES.postres,
    grupos: [grupoExtrasDulces()],
  },
  {
    id: "prod-churros",
    nombre: "Churros con cajeta",
    descripcion: "Cuatro churros espolvoreados con canela y cajeta.",
    categoriaId: "cat-postres",
    centavos: 7500,
    estacion: ESTACIONES.postres,
    grupos: [grupoExtrasDulces(), grupoSinIngredientes(["Canela", "Azúcar"])],
    agotado: {
      origen: "cocina",
      detalle: "Cocina · freidora",
      motivo: "Se acabó la masa de la tarde",
      reactivacionMin: 90,
    },
    alternativaNombre: "Pastel de chocolate",
  },
  {
    id: "prod-helado",
    nombre: "Helado de vainilla",
    descripcion: "Dos bolas de helado de vainilla de la casa (vitrina).",
    categoriaId: "cat-postres",
    centavos: 5900,
    /* Sin estación: se sirve de vitrina y no genera comanda (aviso al enviar). */
    estacion: null,
    grupos: [grupoExtrasDulces()],
  },
  /* Bebidas */
  {
    id: "prod-horchata",
    nombre: "Agua de horchata",
    descripcion: "Agua fresca de arroz con canela, 500 ml.",
    categoriaId: "cat-bebidas",
    centavos: 4500,
    estacion: ESTACIONES.barraFria,
    grupos: [grupoHielo(), grupoEndulzante()],
  },
  {
    id: "prod-limonada",
    nombre: "Limonada de la casa",
    descripcion: "Limón recién exprimido con un toque de menta.",
    categoriaId: "cat-bebidas",
    centavos: 4900,
    estacion: ESTACIONES.barraFria,
    etiquetas: ["recomendado"],
    grupos: [grupoHielo(), grupoEndulzante()],
  },
  {
    id: "prod-refresco",
    nombre: "Refresco de lata",
    descripcion: "Refresco de cola, 355 ml; se entrega en mostrador.",
    categoriaId: "cat-bebidas",
    centavos: 3900,
    /* Sin estación: no genera comanda, solo cobro. */
    estacion: null,
    grupos: [],
  },
  {
    id: "prod-cafe",
    nombre: "Café americano",
    descripcion: "Café de olla o americano, taza 12 oz.",
    categoriaId: "cat-bebidas",
    centavos: 3500,
    estacion: ESTACIONES.barra,
    grupos: [grupoEndulzante()],
  },
  {
    id: "prod-te-helado",
    nombre: "Té helado",
    descripcion: "Té negro frío con durazno, 500 ml.",
    categoriaId: "cat-bebidas",
    centavos: 4200,
    estacion: ESTACIONES.barraFria,
    grupos: [grupoHielo(), grupoEndulzante()],
  },
  {
    id: "prod-cerveza",
    nombre: "Cerveza artesanal",
    descripcion: "Cerveza de la casa en botella, 355 ml.",
    categoriaId: "cat-bebidas",
    centavos: 8900,
    impuesto: IEPS8,
    estacion: ESTACIONES.barra,
    grupos: [grupoSinIngredientes(["Limón", "Sal"])],
    agotado: {
      origen: "proveedor",
      detalle: "Proveedor · Cervecería del Valle",
      motivo: "Pedido en tránsito",
      reactivacionMin: 240,
    },
    alternativaNombre: "Michelada",
  },
  {
    id: "prod-michelada",
    nombre: "Michelada",
    descripcion: "Cerveza clara u oscura con limón, sal y salsas.",
    categoriaId: "cat-bebidas",
    centavos: 9900,
    impuesto: IEPS8,
    estacion: ESTACIONES.barra,
    grupos: [
      {
        id: "gr-cerveza",
        nombre: "Cerveza",
        minimo: 1,
        maximo: 1,
        obligatorio: true,
        modificadores: [modificador("mod-clara", "Clara"), modificador("mod-oscura", "Oscura")],
      },
      grupoSinIngredientes(["Clamato", "Limón", "Sal", "Salsa inglesa"]),
    ],
  },
  {
    id: "prod-vino",
    nombre: "Vino de la casa (copa)",
    descripcion: "Copa de vino tinto o blanco de la casa.",
    categoriaId: "cat-bebidas",
    centavos: 11900,
    impuesto: IEPS8,
    estacion: ESTACIONES.barra,
    grupos: [
      {
        id: "gr-vino",
        nombre: "Tipo",
        minimo: 1,
        maximo: 1,
        obligatorio: true,
        modificadores: [modificador("mod-tinto", "Tinto"), modificador("mod-blanco", "Blanco")],
      },
    ],
  },
  {
    id: "prod-tequila",
    nombre: "Tequila reposado (caballito)",
    descripcion: "Caballito de tequila reposado 100% agave.",
    categoriaId: "cat-bebidas",
    centavos: 9500,
    impuesto: IEPS8,
    estacion: ESTACIONES.barra,
    grupos: [grupoSinIngredientes(["Sal", "Limón"])],
  },
]

function construirAgotado(cfg?: AgotadoCfg): Agotado {
  if (!cfg) {
    return {
      agotado: false,
      origen: null,
      origenDetalle: null,
      motivo: null,
      reactivacionEstimada: null,
      actualizadoEn: null,
    }
  }
  return {
    agotado: true,
    origen: cfg.origen,
    origenDetalle: cfg.detalle,
    motivo: cfg.motivo,
    reactivacionEstimada: cfg.reactivacionMin === null ? null : enMinutos(cfg.reactivacionMin),
    actualizadoEn: haceMinutos(25),
  }
}

const CATEGORIA_NOMBRE = new Map(CATEGORIAS.map((categoria) => [categoria.id, categoria.nombre]))

const PRODUCTOS: ProductoCarta[] = PRODUCTOS_CFG.map((cfg) => ({
  id: cfg.id,
  nombre: cfg.nombre,
  descripcion: cfg.descripcion,
  categoriaId: cfg.categoriaId,
  categoriaNombre: CATEGORIA_NOMBRE.get(cfg.categoriaId) ?? cfg.categoriaId,
  sku: cfg.id.replace("prod-", "SKU-").toUpperCase(),
  centavos: cfg.centavos,
  impuesto: cfg.impuesto ?? IVA16,
  estacion: cfg.estacion,
  agotado: construirAgotado(cfg.agotado),
  etiquetas: cfg.etiquetas ?? [],
  grupos: cfg.grupos ?? [],
  alternativaNombre: cfg.alternativaNombre ?? null,
}))

const CATEGORIAS_CARTA: CategoriaCarta[] = CATEGORIAS.map((categoria) => ({
  ...categoria,
  conteo: PRODUCTOS.filter((producto) => producto.categoriaId === categoria.id).length,
}))

/* ------------------------------ Salón y contexto -------------------------- */

const MESAS: MesaCarta[] = [
  { id: "mesa-01", numero: "01", zona: "Salón principal", capacidad: 2, estado: "libre", etiqueta: null },
  { id: "mesa-02", numero: "02", zona: "Salón principal", capacidad: 4, estado: "ocupada", etiqueta: "Sesión abierta 13:20" },
  { id: "mesa-03", numero: "03", zona: "Salón principal", capacidad: 4, estado: "libre", etiqueta: null },
  { id: "mesa-04", numero: "04", zona: "Salón principal", capacidad: 6, estado: "por_cobrar", etiqueta: "Cobrar en Caja" },
  { id: "mesa-05", numero: "05", zona: "Salón principal", capacidad: 2, estado: "ocupada", etiqueta: "Sesión abierta 13:05" },
  { id: "mesa-06", numero: "06", zona: "Salón principal", capacidad: 4, estado: "libre", etiqueta: null },
  { id: "mesa-07", numero: "07", zona: "Salón principal", capacidad: 8, estado: "reservada", etiqueta: "Reserva 14:30 · Laura Pérez" },
  { id: "mesa-08", numero: "08", zona: "Salón principal", capacidad: 2, estado: "libre", etiqueta: null },
  { id: "mesa-09", numero: "09", zona: "Terraza", capacidad: 4, estado: "libre", etiqueta: null },
  { id: "mesa-10", numero: "10", zona: "Terraza", capacidad: 4, estado: "ocupada", etiqueta: "Sesión abierta 13:40" },
  { id: "mesa-11", numero: "11", zona: "Terraza", capacidad: 2, estado: "libre", etiqueta: null },
  { id: "mesa-12", numero: "12", zona: "Terraza", capacidad: 6, estado: "por_cobrar", etiqueta: "Cobrar en Caja" },
  { id: "mesa-13", numero: "13", zona: "Terraza", capacidad: 4, estado: "fuera_servicio", etiqueta: "Mantenimiento de piso" },
  { id: "mesa-14", numero: "14", zona: "Terraza", capacidad: 4, estado: "libre", etiqueta: null },
]

const MESEROS: Mesero[] = [
  { id: "mes-ana", nombre: "Ana Ríos", rol: "Capitana", enTurno: true, mesasAbiertas: 4 },
  { id: "mes-luis", nombre: "Luis Fernández", rol: "Mesero", enTurno: true, mesasAbiertas: 3 },
  { id: "mes-carla", nombre: "Carla Domínguez", rol: "Mesera", enTurno: true, mesasAbiertas: 2 },
  { id: "mes-pedro", nombre: "Pedro Sánchez", rol: "Mesero", enTurno: false, mesasAbiertas: 0 },
]

const TURNO_CAJA: TurnoCajaResumen = {
  id: "turno-3",
  numero: "TURNO-03",
  caja: "Caja 1 · Mostrador",
  abiertoEn: haceMinutos(180),
  usuario: "Jorge Medina",
  baseCentavos: 150000,
  ventasCentavos: 1_284_500,
}

function turnoDe(ctx: { query: Query }): TurnoCajaResumen | null {
  return ctx.query.turno === "cerrado" ? null : TURNO_CAJA
}

/* --------------------------------- Clientes ------------------------------- */

let clienteSeq = 5

const CLIENTES: ClienteResumen[] = [
  {
    id: "cli-1",
    nombre: "Laura Pérez",
    telefono: "5512345678",
    correo: "laura.perez@example.com",
    visitas: 12,
    ultimaVisita: haceMinutos(60 * 26),
    optOutMarketing: false,
    notas: "Prefiere terraza",
    direccion: "Av. Reforma 123, Col. Centro",
  },
  {
    id: "cli-2",
    nombre: "Carlos Méndez",
    telefono: "5587654321",
    correo: null,
    visitas: 4,
    ultimaVisita: haceMinutos(60 * 72),
    optOutMarketing: true,
    notas: "Sin consentimiento de marketing",
    direccion: null,
  },
  {
    id: "cli-3",
    nombre: "Ana Morales",
    telefono: "5523456789",
    correo: "ana.morales@example.com",
    visitas: 8,
    ultimaVisita: haceMinutos(60 * 5),
    optOutMarketing: false,
    notas: null,
    direccion: "Calle Pino 45, Col. Del Valle",
  },
  {
    id: "cli-4",
    nombre: "Roberto Cárdenas",
    telefono: "5545678901",
    correo: null,
    visitas: 2,
    ultimaVisita: haceMinutos(60 * 200),
    optOutMarketing: false,
    notas: "Alergia a nueces",
    direccion: null,
  },
  {
    id: "cli-5",
    nombre: "Sofía Ramírez",
    telefono: "5567890123",
    correo: "sofia.ramirez@example.com",
    visitas: 15,
    ultimaVisita: haceMinutos(60 * 2),
    optOutMarketing: false,
    notas: null,
    direccion: "Prol. Vasconcelos 900, Col. Santa Fe",
  },
]

/* ------------------------------ Borradores y envíos ----------------------- */

const BORRADORES = new Map<string, Borrador>()
const ENVIOS = new Map<string, EnvioRespuesta>()
let borradorSeq = 0
let folioSeq = 8842
let comandaSeq = 1042

function clonar<T>(valor: T): T {
  return structuredClone(valor)
}

function resolverBorrador(id: string): Borrador {
  const borrador = BORRADORES.get(id)
  if (!borrador) throw new ApiError(404, "El borrador ya no existe o fue enviado.", "borrador_no_encontrado")
  return borrador
}

function validarPayload(body: Partial<BorradorPayload>): void {
  if (body.lineas && body.lineas.some((linea) => linea.cantidad < 1)) {
    throw new ApiError(422, "Cada línea debe tener al menos una pieza.", "linea_invalida")
  }
}

/* Mocks registrados (el orden no importa: todos los patrones están anclados). */

registerMock("GET", /^\/admin\/tomar-pedido\/catalogo$/, () => {
  const respuesta: CartaRespuesta = {
    actualizadoEn: new Date().toISOString(),
    categorias: CATEGORIAS_CARTA,
    productos: PRODUCTOS,
    agotados: PRODUCTOS.filter((producto) => producto.agotado.agotado).length,
  }
  return clonar(respuesta)
})

registerMock("GET", /^\/admin\/tomar-pedido\/contexto$/, (ctx) => {
  const respuesta: ContextoRespuesta = {
    actualizadoEn: new Date().toISOString(),
    mesas: MESAS,
    meseros: MESEROS,
    turno: turnoDe(ctx),
  }
  return clonar(respuesta)
})

registerMock("GET", /^\/admin\/tomar-pedido\/clientes$/, (ctx) => {
  const id = typeof ctx.query.id === "string" ? ctx.query.id : ""
  if (id) return clonar(CLIENTES.filter((cliente) => cliente.id === id))
  const q = typeof ctx.query.q === "string" ? ctx.query.q.trim().toLowerCase() : ""
  const digitos = q.replace(/\D/g, "")
  const filtrados = q
    ? CLIENTES.filter(
        (cliente) =>
          cliente.nombre.toLowerCase().includes(q) || (digitos.length > 0 && cliente.telefono.includes(digitos)),
      )
    : CLIENTES
  return clonar(filtrados.slice(0, 20))
})

registerMock("POST", /^\/admin\/tomar-pedido\/clientes$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<ClienteNuevoPayload>
  const nombre = body.nombre?.trim()
  const telefono = body.telefono?.replace(/\D/g, "")
  if (!nombre || nombre.length < 3) {
    throw new ApiError(422, "El nombre del cliente es obligatorio.", "cliente_invalido")
  }
  if (!telefono || telefono.length < 10) {
    throw new ApiError(422, "El teléfono debe tener 10 dígitos.", "telefono_invalido")
  }
  if (CLIENTES.some((cliente) => cliente.telefono === telefono)) {
    throw new ApiError(409, "Ya existe un cliente con ese teléfono.", "telefono_duplicado")
  }
  const cliente: ClienteResumen = {
    id: `cli-${++clienteSeq}`,
    nombre,
    telefono,
    correo: body.correo?.trim() || null,
    visitas: 0,
    ultimaVisita: null,
    optOutMarketing: !body.aceptaMarketing,
    notas: null,
    direccion: null,
  }
  CLIENTES.push(cliente)
  return clonar(cliente)
})

registerMock("POST", /^\/admin\/tomar-pedido\/borradores$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<BorradorPayload>
  validarPayload(body)
  const ahora = new Date().toISOString()
  const borrador: Borrador = {
    id: `bor-${++borradorSeq}`,
    estado: "abierto",
    creadoEn: ahora,
    actualizadoEn: ahora,
    version: 1,
    folio: null,
    modalidad: body.modalidad ?? "mesa",
    mesaNumero: body.mesaNumero ?? null,
    clienteId: body.clienteId ?? null,
    clienteNombre: body.clienteNombre ?? null,
    clienteTelefono: body.clienteTelefono ?? null,
    meseroId: body.meseroId ?? null,
    comensales: body.comensales ?? 1,
    lineas: body.lineas ?? [],
    descuento: body.descuento ?? null,
    propinaPct: body.propinaPct ?? 10,
    notas: body.notas ?? "",
  }
  BORRADORES.set(borrador.id, borrador)
  return clonar(borrador)
})

registerMock("GET", /^\/admin\/tomar-pedido\/borradores\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  return clonar(resolverBorrador(id))
})

registerMock("PATCH", /^\/admin\/tomar-pedido\/borradores\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const borrador = resolverBorrador(id)
  if (borrador.estado !== "abierto") {
    throw new ApiError(409, "El borrador ya fue enviado y no admite cambios.", "borrador_cerrado")
  }
  const body = (ctx.body ?? {}) as Partial<BorradorPayload>
  validarPayload(body)
  Object.assign(borrador, body, {
    id: borrador.id,
    estado: borrador.estado,
    creadoEn: borrador.creadoEn,
    actualizadoEn: new Date().toISOString(),
    version: borrador.version + 1,
    folio: borrador.folio,
  })
  return clonar(borrador)
})

registerMock("DELETE", /^\/admin\/tomar-pedido\/borradores\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  BORRADORES.delete(id)
  return undefined
})

registerMock("POST", /^\/admin\/tomar-pedido\/borradores\/([^/]+)\/enviar$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const body = (ctx.body ?? {}) as Partial<EnvioPayload>
  const clave = body.idempotencyKey?.trim()
  if (!clave || clave.length < 8) {
    throw new ApiError(422, "Falta la clave de idempotencia del envío.", "idempotencia_requerida")
  }

  const previo = ENVIOS.get(clave)
  if (previo) return { ...clonar(previo), idempotente: true }

  const borrador = resolverBorrador(id)
  if (borrador.estado !== "abierto") {
    const folio = borrador.folio ?? "—"
    throw new ApiError(
      409,
      `Este borrador ya se envió como pedido ${folio}. Abre un pedido nuevo para capturar más productos.`,
      "borrador_ya_enviado",
    )
  }
  if (borrador.lineas.length === 0) {
    throw new ApiError(422, "El pedido no tiene líneas. Agrega productos antes de enviar.", "carrito_vacio")
  }

  const turno = turnoDe(ctx)
  const impresoraOk = !body.simularImpresoraCaida

  const porEstacion = new Map<string, { nombre: string; lineas: number }>()
  let sinEstacion = 0
  for (const linea of borrador.lineas) {
    if (!linea.estacion) {
      sinEstacion += linea.cantidad
      continue
    }
    const actual = porEstacion.get(linea.estacion.id)
    porEstacion.set(linea.estacion.id, {
      nombre: linea.estacion.nombre,
      lineas: (actual?.lineas ?? 0) + linea.cantidad,
    })
  }

  const comandas = [...porEstacion.entries()].map(([estacionId, datos]) => ({
    id: `com-${estacionId}-${borrador.id}`,
    numero: String(comandaSeq++),
    estacion: datos.nombre,
    lineas: datos.lineas,
    impresa: impresoraOk,
  }))

  const avisos: EnvioRespuesta["avisos"] = []
  if (sinEstacion > 0) {
    avisos.push({
      tipo: "sin_estacion",
      mensaje: `${sinEstacion} pieza(s) sin estación no generaron comanda; se cobran pero no llegan a cocina.`,
      lineas: sinEstacion,
    })
  }
  if (!impresoraOk) {
    avisos.push({
      tipo: "impresora",
      mensaje: "La impresora de comandas no respondió: el trabajo quedó en cola para reintentar.",
    })
  }
  if (!turno) {
    avisos.push({
      tipo: "sin_turno",
      mensaje: "No hay turno de caja abierto: el pedido se envió, pero «Cobrar» quedará bloqueado (V1).",
    })
  }

  const folio = `P-${++folioSeq}`
  const respuesta: EnvioRespuesta = {
    folio,
    pedidoId: `ped-${folio.toLowerCase()}`,
    enviadoEn: new Date().toISOString(),
    idempotente: false,
    totalCentavos: calcularTotales(borrador.lineas, borrador.descuento, borrador.propinaPct).totalCentavos,
    comandas,
    avisos,
    impresoraOk,
  }

  borrador.estado = "enviado"
  borrador.folio = folio
  borrador.actualizadoEn = respuesta.enviadoEn
  ENVIOS.set(clave, respuesta)
  return clonar(respuesta)
})

registerMock("POST", /^\/admin\/tomar-pedido\/borradores\/([^/]+)\/precuenta$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const borrador = resolverBorrador(id)
  if (borrador.lineas.length === 0) {
    throw new ApiError(422, "No hay productos que imprimir en la pre-cuenta.", "carrito_vacio")
  }
  const impresoraOk = (ctx.body as { simularImpresoraCaida?: boolean } | undefined)?.simularImpresoraCaida !== true
  const respuesta: PrecuentaRespuesta = {
    folio: borrador.folio ?? "PRE-CUENTA",
    trabajoId: `imp-${Date.now().toString(36)}`,
    impresa: impresoraOk,
    impresoEn: new Date().toISOString(),
    aviso: impresoraOk ? null : "La impresora de caja no respondió; la pre-cuenta quedó encolada.",
  }
  return respuesta
})

registerMock("POST", /^\/admin\/tomar-pedido\/borradores\/([^/]+)\/cobrar$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const turno = turnoDe(ctx)
  if (!turno) {
    throw new ApiError(
      409,
      "Abre un turno de caja para cobrar; mientras tanto puedes enviar el pedido a cocina.",
      "sin_turno_abierto",
    )
  }
  const borrador = resolverBorrador(id)
  if (borrador.lineas.length === 0) {
    throw new ApiError(422, "El pedido no tiene líneas.", "carrito_vacio")
  }
  const folio = borrador.folio ?? `P-${++folioSeq}`
  borrador.estado = "cobrado"
  borrador.folio = folio
  borrador.actualizadoEn = new Date().toISOString()
  const respuesta: CobroRespuesta = {
    folio,
    pedidoId: `ped-${folio.toLowerCase()}`,
    estado: "por_cobrar",
    turnoId: turno.id,
    urlPagos: "/pagos",
    cobradoEn: new Date().toISOString(),
  }
  return respuesta
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useCarta() {
  return useQuery({
    queryKey: ["tomar-pedido", "carta"],
    queryFn: () => api.get<CartaRespuesta>("/admin/tomar-pedido/catalogo"),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

export function useContextoPedido(turnoCerrado = false) {
  return useQuery({
    queryKey: ["tomar-pedido", "contexto", turnoCerrado],
    queryFn: () =>
      api.get<ContextoRespuesta>(
        "/admin/tomar-pedido/contexto",
        turnoCerrado ? { turno: "cerrado" } : undefined,
      ),
    refetchInterval: 30_000,
  })
}

export function useBuscarClientes(q: string) {
  const consulta = q.trim()
  return useQuery({
    queryKey: ["tomar-pedido", "clientes", consulta],
    queryFn: () => api.get<ClienteResumen[]>("/admin/tomar-pedido/clientes", { q: consulta }),
    enabled: consulta.length >= 2,
    staleTime: 20_000,
  })
}

/** Recupera un cliente por id (p. ej. `?cliente=` o un borrador guardado). */
export function useCliente(id: string | null) {
  return useQuery({
    queryKey: ["tomar-pedido", "cliente", id],
    queryFn: () => api.get<ClienteResumen[]>("/admin/tomar-pedido/clientes", { id: id ?? "" }),
    enabled: Boolean(id),
    select: (clientes) => clientes.find((cliente) => cliente.id === id) ?? null,
  })
}

export function useCrearCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClienteNuevoPayload) =>
      api.post<ClienteResumen>("/admin/tomar-pedido/clientes", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tomar-pedido", "clientes"] })
    },
  })
}

export function useBorrador(id: string | null) {
  return useQuery({
    queryKey: ["tomar-pedido", "borrador", id],
    queryFn: () => api.get<Borrador>(`/admin/tomar-pedido/borradores/${id}`),
    enabled: Boolean(id),
    retry: false,
  })
}

export function useCrearBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BorradorPayload) =>
      api.post<Borrador>("/admin/tomar-pedido/borradores", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tomar-pedido", "borrador"] })
    },
  })
}

export function useGuardarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: BorradorPayload & { id: string }) =>
      api.patch<Borrador>(`/admin/tomar-pedido/borradores/${id}`, payload),
    onSuccess: (_borrador, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["tomar-pedido", "borrador", payload.id] })
    },
  })
}

export function useDescartarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/tomar-pedido/borradores/${id}`),
    onSuccess: (_resultado, id) => {
      void queryClient.invalidateQueries({ queryKey: ["tomar-pedido", "borrador", id] })
    },
  })
}

export function useEnviarPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: EnvioPayload & { id: string }) =>
      api.post<EnvioRespuesta>(`/admin/tomar-pedido/borradores/${id}/enviar`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tomar-pedido"] })
      void queryClient.invalidateQueries({ queryKey: ["pedidos"] })
      void queryClient.invalidateQueries({ queryKey: ["en-vivo"] })
      void queryClient.invalidateQueries({ queryKey: ["comandas"] })
    },
  })
}

export function useImprimirPrecuenta() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<PrecuentaRespuesta>(`/admin/tomar-pedido/borradores/${id}/precuenta`),
  })
}

export function useCobrarPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CobroRespuesta>(`/admin/tomar-pedido/borradores/${id}/cobrar`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tomar-pedido"] })
      void queryClient.invalidateQueries({ queryKey: ["pedidos"] })
      void queryClient.invalidateQueries({ queryKey: ["en-vivo"] })
      void queryClient.invalidateQueries({ queryKey: ["pagos"] })
    },
  })
}

/** Utilidad del cliente: borra el snapshot local al terminar el pedido. */
export function limpiarBorradorLocal(): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(BORRADOR_STORAGE_KEY)
}
