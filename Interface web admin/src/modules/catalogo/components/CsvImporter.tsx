/**
 * Importador / exportador CSV (RF-R5-12, RN-R5-10; plan 06 §3): subir → mapear
 * columnas → vista previa con validación por fila → confirmar → resultado.
 * Un archivo con filas inválidas se rechaza con detalle (fila, columna, motivo)
 * y no aplica ningún cambio. Exportar deja registro en `exportacion`.
 */

import { useMemo, useRef, useState } from "react"
import { AlertTriangle, Check, Download, Repeat } from "lucide-react"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatDateTime } from "@/lib/format"
import {
  CAMPOS_CSV,
  filasAImportacionCsv,
  sugerirMapeo,
  useExportarCatalogo,
  useImportarCatalogo,
  validarImportacion,
  type CampoCsv,
} from "@/modules/catalogo/api"
import type { Exportacion, ImportacionFila, ImportacionResultado } from "@/modules/catalogo/types"

function descargar(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(url)
}

const PLANTILLA = [
  "sku,nombre,categoria,precio,impuesto,estacion,alergenos,etiquetas,activo",
  "EN-010,Nachos de la casa,Entradas,8900,IVA 16%,Barra fría|lácteos,vegetariano|picante,si",
  "BE-110,Té helado,Aguas y refrescos,4200,IVA 16%,Barra fría,,,si",
].join("\n")

export function CsvImporter() {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const importar = useImportarCatalogo()
  const exportar = useExportarCatalogo()
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [paso, setPaso] = useState<"subir" | "mapear" | "validar" | "resultado">("subir")
  const [texto, setTexto] = useState("")
  const [archivo, setArchivo] = useState("")
  const [mapeo, setMapeo] = useState<Record<CampoCsv, number | null> | null>(null)
  const [filas, setFilas] = useState<ImportacionFila[]>([])
  const [resultado, setResultado] = useState<ImportacionResultado | null>(null)
  const [ultimaExportacion, setUltimaExportacion] = useState<Exportacion | null>(null)

  const puedeImportar = tienePermiso("catalogo.importar")
  const puedeExportar = tienePermiso("catalogo.exportar")

  const cabecera = useMemo(() => {
    const primera = texto.replace(/\r\n?/g, "\n").split("\n")[0] ?? ""
    const delimitador = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ";" : ","
    return primera.split(delimitador).map((titulo) => titulo.trim().replace(/^"|"$/g, ""))
  }, [texto])

  const rechazadas = filas.filter((fila) => fila.estado === "rechazada")
  const advertencias = filas.filter((fila) => fila.advertencias.length > 0)

  const leerArchivo = (file: File) => {
    const lector = new FileReader()
    lector.onload = () => {
      const contenido = String(lector.result ?? "")
      setTexto(contenido)
      setArchivo(file.name)
      setMapeo(sugerirMapeo(contenido.replace(/\r\n?/g, "\n").split("\n")[0]?.split(/,|;/).map((t) => t.trim()) ?? []))
      setPaso("mapear")
      setFilas([])
      setResultado(null)
    }
    lector.readAsText(file)
  }

  const continuarConTexto = () => {
    if (!texto.trim()) {
      mostrar("Pega el contenido CSV o selecciona un archivo.", "error")
      return
    }
    setArchivo(archivo || "pegado.csv")
    setMapeo(sugerirMapeo(cabecera))
    setPaso("mapear")
  }

  const validar = () => {
    if (!mapeo) return
    const { filas: resultadoValidacion } = validarImportacion(texto, mapeo)
    setFilas(resultadoValidacion)
    setPaso("validar")
  }

  const aplicar = () => {
    importar.mutate(
      { archivo, filas },
      {
        onSuccess: (importacion) => {
          setResultado(importacion)
          setPaso("resultado")
          mostrar("Importación aplicada. El detalle quedó registrado en auditoría.", "exito")
        },
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo aplicar la importación.", "error"),
      },
    )
  }

  const exportarCatalogo = (formato: "csv" | "xlsx") => {
    exportar.mutate(
      { tipo: "catalogo", formato },
      {
        onSuccess: (registro) => {
          setUltimaExportacion(registro)
          mostrar(
            registro.avisoSegundoPlano
              ? "Exportación registrada: el volumen es alto y se genera en segundo plano con aviso al solicitante."
              : "Exportación registrada y lista para descargar.",
            "exito",
          )
        },
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  const columnas: Column<ImportacionFila>[] = [
    { key: "fila", header: "Fila", cell: (row) => row.fila },
    { key: "sku", header: "SKU", cell: (row) => row.sku || "—" },
    { key: "nombre", header: "Nombre", cell: (row) => row.nombre || "—" },
    { key: "categoria", header: "Categoría", cell: (row) => row.categoria || "—" },
    {
      key: "precio",
      header: "Precio",
      align: "right",
      cell: (row) => (row.precioCentavos === null ? "—" : <MoneyCell centavos={row.precioCentavos} />),
    },
    {
      key: "estado",
      header: "Resultado",
      cell: (row) =>
        row.estado === "valida" ? (
          <span className="csv-ok">
            <Check size={13} /> válida
          </span>
        ) : (
          <span className="csv-error">
            <AlertTriangle size={13} /> rechazada
          </span>
        ),
    },
    {
      key: "detalle",
      header: "Detalle",
      cell: (row) => (
        <span className="csv-detalle">
          {row.errores.map((error) => (
            <span key={`${error.columna}-${error.motivo}`} className="csv-detalle__error">
              {error.columna}: {error.motivo}
            </span>
          ))}
          {row.advertencias.map((aviso) => (
            <span key={`${aviso.columna}-${aviso.motivo}`} className="csv-detalle__aviso">
              {aviso.columna}: {aviso.motivo}
            </span>
          ))}
        </span>
      ),
    },
  ]

  return (
    <div className="csv-importer">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Importar catálogo (CSV)</div>
            <div className="panel__subtitle">
              Sube, mapea y valida fila a fila. Un archivo con errores se rechaza completo, sin aplicar cambios.
            </div>
          </div>
          <Button variant="secondary" onClick={() => descargar("plantilla-catalogo.csv", PLANTILLA)}>
            <Download size={15} /> Plantilla
          </Button>
        </div>

        {paso === "subir" ? (
          <div className="csv-pasos">
            <div className="csv-dropzone">
              <p>Arrastra el CSV o selecciónalo desde tu equipo (UTF-8, encabezados en la primera fila).</p>
              <input
                ref={inputArchivo}
                type="file"
                accept=".csv,text/csv"
                className="csv-file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) leerArchivo(file)
                }}
              />
              <Button variant="primary" disabled={!puedeImportar} title={puedeImportar ? undefined : "Requiere permiso de catalogo.importar"} onClick={() => inputArchivo.current?.click()}>
                Seleccionar CSV
              </Button>
            </div>
            <div className="csv-paste">
              <TextField label="Archivo" value={archivo} placeholder="catalogo.csv" onChange={(event) => setArchivo(event.target.value)} />
              <textarea
                className="input textarea"
                rows={7}
                placeholder={"sku,nombre,categoria,precio,impuesto,estacion,alergenos,etiquetas,activo\nEN-010,Nachos,Entradas,89.00,IVA 16%,Barra fría,,,"}
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
              />
              <Button variant="secondary" onClick={continuarConTexto}>
                Continuar con el texto pegado
              </Button>
            </div>
          </div>
        ) : null}

        {paso === "mapear" && mapeo ? (
          <div>
            <p className="drawer__note">
              Mapea cada campo del sistema con una columna del archivo ({cabecera.length} columnas detectadas).
            </p>
            <div className="csv-mapeo">
              {CAMPOS_CSV.map((campo) => (
                <SelectField
                  key={campo.id}
                  label={`${campo.label}${campo.obligatorio ? " *" : ""}`}
                  options={cabecera.map((titulo, indice) => ({ value: String(indice), label: `${indice + 1}. ${titulo}` }))}
                  placeholder="Sin mapear"
                  value={mapeo[campo.id] === null ? "" : String(mapeo[campo.id])}
                  onChange={(event) =>
                    setMapeo((actual) =>
                      actual ? { ...actual, [campo.id]: event.target.value === "" ? null : Number(event.target.value) } : actual,
                    )
                  }
                />
              ))}
            </div>
            <div className="csv-acciones">
              <Button variant="ghost" onClick={() => setPaso("subir")}>
                Atrás
              </Button>
              <Button variant="primary" onClick={validar}>
                Validar filas
              </Button>
            </div>
          </div>
        ) : null}

        {paso === "validar" ? (
          <div>
            <div className="csv-resumen">
              <span>
                <strong>{filas.length}</strong> filas · <strong>{filas.length - rechazadas.length}</strong> válidas ·{" "}
                <strong className={rechazadas.length > 0 ? "csv-error" : ""}>{rechazadas.length}</strong> rechazadas
              </span>
              <Button variant="ghost" onClick={() => setPaso("mapear")}>
                Atrás
              </Button>
            </div>
            {rechazadas.length > 0 ? (
              <div className="notice notice--error">
                <AlertTriangle size={15} />
                <span>
                  Archivo rechazado: hay {rechazadas.length} fila(s) con errores. No se aplicará ningún cambio. Corrige
                  el archivo o descarga el detalle.
                </span>
              </div>
            ) : (
              <div className="notice notice--ok">
                <Check size={15} />
                <span>
                  Todas las filas son válidas. Al aplicar se registrarán en auditoría
                  {advertencias.length > 0 ? ` (${advertencias.length} con advertencias, p. ej. sin estación)` : ""}.
                </span>
              </div>
            )}
            <DataTable columns={columnas} rows={filas} getRowKey={(row) => String(row.fila)} emptyTitle="Sin filas en el archivo" />
            <div className="csv-acciones">
              <Button variant="secondary" onClick={() => descargar("detalle-importacion.csv", filasAImportacionCsv(filas))}>
                <Download size={15} /> Descargar detalle
              </Button>
              <Button
                variant="primary"
                disabled={rechazadas.length > 0 || importar.isPending || !puedeImportar}
                title={
                  rechazadas.length > 0
                    ? "Corrige las filas rechazadas: la importación es todo o nada"
                    : puedeImportar
                      ? undefined
                      : "Requiere permiso de catalogo.importar"
                }
                onClick={aplicar}
              >
                <Repeat size={15} /> {importar.isPending ? "Aplicando…" : `Aplicar importación (${filas.length})`}
              </Button>
            </div>
          </div>
        ) : null}

        {paso === "resultado" && resultado ? (
          <div>
            <div className="notice notice--ok">
              <Check size={15} />
              <span>
                Importación aplicada: {resultado.filasValidas} filas. Registro <strong>{resultado.id}</strong> ·{" "}
                {formatDateTime(resultado.creadoEn)} · {resultado.usuario}.
              </span>
            </div>
            <div className="csv-acciones">
              <Button variant="secondary" onClick={() => descargar(`resultado-${resultado.id}.csv`, filasAImportacionCsv(resultado.filas))}>
                <Download size={15} /> Descargar resultado
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPaso("subir")
                  setTexto("")
                  setFilas([])
                  setResultado(null)
                  setArchivo("")
                }}
              >
                Nueva importación
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Exportar catálogo</div>
            <div className="panel__subtitle">
              Toda exportación deja registro en `exportacion` con quién, filtros, formato y estado (RN-R5-10).
            </div>
          </div>
          <div className="csv-acciones">
            <Button variant="secondary" disabled={!puedeExportar} title={puedeExportar ? undefined : "Requiere permiso de catalogo.exportar"} onClick={() => exportarCatalogo("csv")}>
              <Download size={15} /> Exportar CSV
            </Button>
            <Button variant="secondary" disabled={!puedeExportar} title={puedeExportar ? undefined : "Requiere permiso de catalogo.exportar"} onClick={() => exportarCatalogo("xlsx")}>
              <Download size={15} /> Exportar XLSX
            </Button>
          </div>
        </div>
        {ultimaExportacion ? (
          <div className="csv-exportacion">
            <span>
              Registro <strong>{ultimaExportacion.id}</strong> · {ultimaExportacion.formato.toUpperCase()} ·{" "}
              {ultimaExportacion.estado === "listo" ? "listo" : "en segundo plano"} · registrado por{" "}
              {ultimaExportacion.registradoPor ?? "—"} · {formatDateTime(ultimaExportacion.creadoEn)}
            </span>
            {ultimaExportacion.avisoSegundoPlano ? (
              <span className="csv-detalle__aviso">Volumen alto: se avisará al solicitante al terminar.</span>
            ) : null}
          </div>
        ) : (
          <p className="drawer__note">Aún no se ha registrado ninguna exportación en esta sesión.</p>
        )}
      </section>
    </div>
  )
}
