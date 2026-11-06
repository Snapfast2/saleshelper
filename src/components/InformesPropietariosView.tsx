'use client';
// src/components/InformesPropietariosView.tsx
// Estudio interactivo mobile-first + B2B escritorio para Informe Mensual a Propietarios.
// En móvil (< 980px): pestañas superiores (1. Datos | 2. Vista previa), filas 1fr auto en portales,
// concepto comercial colapsable ("Modo rápido") y barra fija inferior al pulgar.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  Info,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  User,
} from "lucide-react";

import OwnerReportSheet from "@/components/OwnerReportSheet";
import PropertyPickerDrawer from "@/components/PropertyPickerDrawer";
import EmptyState from "@/components/EmptyState";
import { useFichaViews } from "@/hooks/useFichaViews";
import { getFirestoreDb } from "@/lib/firebase";
import { AGENTE_PATRICIA } from "@/lib/agente";
import type { Cliente, Inmueble, InformePropietarioPayload } from "@/types";

export interface InformesPropietariosViewProps {
  inmuebles: Inmueble[];
  clientes: Cliente[];
}

interface PeriodOption {
  mesClave: string;
  mesEtiqueta: string;
  chipEtiqueta: string;
}

interface FirestoreTimestampLike {
  toDate?: () => Date;
  seconds?: number;
}

interface InteraccionWSRecord {
  id: string;
  inmueble_id?: string;
  inmueble_titulo?: string;
  tipo_mensaje?: string;
  fecha?: FirestoreTimestampLike | string | number | null;
}

interface EditableFormState {
  nombrePropietario: string;
  vistasFincaRaiz: number;
  contactosFincaRaiz: number | null;
  vistasMetrocuadrado: number;
  contactosMetrocuadrado: number | null;
  contactosOtrosPortales: number | null;
  citasRealizadas: number | null;
  seguimientosEnviados: number | null;
  observaciones: string;
  recomendacion: string;
}

interface StoredLocalDraft {
  version: 1;
  savedAt: string;
  state: EditableFormState;
}

const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const OBSERVACION_CHIPS = [
  {
    id: "flujo-portales",
    label: "Buen flujo en portales",
    sentence:
      "Durante el periodo se registró flujo constante de consultas a través de Finca Raíz y Metrocuadrado.",
  },
  {
    id: "ubicacion-iluminacion",
    label: "Destacan ubicación e iluminación",
    sentence:
      "Los interesados que revisaron el inmueble destacaron positivamente su ubicación, distribución e iluminación natural.",
  },
  {
    id: "sensibilidad-precio",
    label: "Sensibilidad frente al precio",
    sentence:
      "Algunos prospectos compararon el valor frente a oferta reciente de la zona, mostrando sensibilidad en el presupuesto de cierre.",
  },
  {
    id: "consulta-admon",
    label: "Consultas por administración",
    sentence:
      "Se atendieron inquietudes recurrentes respecto al valor de la administración mensual frente al presupuesto total.",
  },
  {
    id: "seguimiento-activo",
    label: "Seguimiento activo a candidatos",
    sentence:
      "Mantenemos seguimiento directo con los clientes perfilados que mostraron mayor interés tras recibir la ficha.",
  },
  {
    id: "filtro-perfil",
    label: "Precalificación de interesados",
    sentence:
      "Se adelantó filtro comercial y validación de perfil a los interesados antes de coordinar visita al inmueble.",
  },
] as const;

const RECOMENDACION_CHIPS = [
  {
    id: "mantener-difusion",
    label: "Mantener estrategia y difusión",
    sentence:
      "Mantener las condiciones comerciales actuales y reforzar la difusión digital junto al seguimiento directo de los candidatos perfilados.",
  },
  {
    id: "ajuste-precio",
    label: "Evaluar ajuste táctico de precio",
    sentence:
      "Evaluar un ajuste táctico en el valor de publicación para ganar competitividad frente a oferta comparable de la zona y dinamizar nuevas visitas.",
  },
  {
    id: "destacar-vitrina",
    label: "Destacar inmueble en vitrina L2L",
    sentence:
      "Renovar el posicionamiento del aviso y destacar el inmueble en la vitrina principal de L2L Bienes Raíces y portales aliados.",
  },
] as const;

const DEFAULT_OBSERVACION = OBSERVACION_CHIPS[4].sentence;
const DEFAULT_RECOMENDACION = RECOMENDACION_CHIPS[0].sentence;

const DRAFT_STORAGE_PREFIX = "sh_owner_report_draft_v1";
const OWNER_NAME_STORAGE_PREFIX = "sh_owner_name_v1";

function getBogotaDateParts(date: Date = new Date()): {
  year: number;
  monthIndex: number;
  day: number;
} {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    if (year > 2000 && month >= 1 && month <= 12 && day >= 1) {
      return { year, monthIndex: month - 1, day };
    }
  } catch {}
  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
  };
}

function buildPeriodOptions(): PeriodOption[] {
  const { year, monthIndex } = getBogotaDateParts();
  const currMonthNum = String(monthIndex + 1).padStart(2, "0");
  const currClave = `${year}-${currMonthNum}`;
  const currEtiqueta = `${MESES_ES[monthIndex]} ${year}`;

  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevMonthNum = String(prevMonthIndex + 1).padStart(2, "0");
  const prevClave = `${prevYear}-${prevMonthNum}`;
  const prevEtiqueta = `${MESES_ES[prevMonthIndex]} ${prevYear}`;

  return [
    {
      mesClave: currClave,
      mesEtiqueta: currEtiqueta,
      chipEtiqueta: currEtiqueta,
    },
    {
      mesClave: prevClave,
      mesEtiqueta: prevEtiqueta,
      chipEtiqueta: prevEtiqueta,
    },
    {
      mesClave: "acumulado",
      mesEtiqueta: "Gestión acumulada",
      chipEtiqueta: "Acumulado",
    },
  ];
}

function getInitialBogotaIso(): string {
  const { year, monthIndex, day } = getBogotaDateParts();
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}T12:00:00.000Z`;
}

function extraerMesClaveString(fechaRaw: string | undefined): string {
  const s = (fechaRaw || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.slice(0, 7);
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return "";
  const { year, monthIndex } = getBogotaDateParts(parsed);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function extraerFechaFirestore(
  raw: InteraccionWSRecord["fecha"]
): Date | null {
  if (!raw) return null;
  if (typeof raw === "object") {
    if (typeof raw.toDate === "function") {
      const d = raw.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof raw.seconds === "number") {
      return new Date(raw.seconds * 1000);
    }
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function createCleanFormState(savedOwnerName = ""): EditableFormState {
  return {
    nombrePropietario: savedOwnerName,
    vistasFincaRaiz: 0,
    contactosFincaRaiz: null,
    vistasMetrocuadrado: 0,
    contactosMetrocuadrado: null,
    contactosOtrosPortales: null,
    citasRealizadas: null,
    seguimientosEnviados: null,
    observaciones: DEFAULT_OBSERVACION,
    recomendacion: DEFAULT_RECOMENDACION,
  };
}

function readStoredOwnerName(inmuebleId: string): string {
  if (typeof window === "undefined" || !inmuebleId) return "";
  try {
    return (
      window.localStorage.getItem(`${OWNER_NAME_STORAGE_PREFIX}:${inmuebleId}`) ||
      ""
    );
  } catch {
    return "";
  }
}

function writeStoredOwnerName(inmuebleId: string, name: string): void {
  if (typeof window === "undefined" || !inmuebleId) return;
  try {
    const key = `${OWNER_NAME_STORAGE_PREFIX}:${inmuebleId}`;
    if (name.trim()) {
      window.localStorage.setItem(key, name);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

function readLocalDraft(
  inmuebleId: string,
  mesClave: string
): StoredLocalDraft | null {
  if (typeof window === "undefined" || !inmuebleId || !mesClave) return null;
  try {
    const raw = window.localStorage.getItem(
      `${DRAFT_STORAGE_PREFIX}:${inmuebleId}:${mesClave}`
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLocalDraft>;
    if (parsed && parsed.version === 1 && parsed.state) {
      return parsed as StoredLocalDraft;
    }
  } catch {}
  return null;
}

function writeLocalDraft(
  inmuebleId: string,
  mesClave: string,
  state: EditableFormState
): string {
  const savedAt = new Date().toISOString();
  if (typeof window === "undefined" || !inmuebleId || !mesClave) return savedAt;
  try {
    const payload: StoredLocalDraft = {
      version: 1,
      savedAt,
      state,
    };
    window.localStorage.setItem(
      `${DRAFT_STORAGE_PREFIX}:${inmuebleId}:${mesClave}`,
      JSON.stringify(payload)
    );
  } catch {}
  return savedAt;
}

function clearLocalDraft(inmuebleId: string, mesClave: string): void {
  if (typeof window === "undefined" || !inmuebleId || !mesClave) return;
  try {
    window.localStorage.removeItem(
      `${DRAFT_STORAGE_PREFIX}:${inmuebleId}:${mesClave}`
    );
  } catch {}
}

function findMatchingInmueble(
  inmuebles: Inmueble[],
  queryValue: string | null
): Inmueble | null {
  if (inmuebles.length === 0) return null;
  const clean = (queryValue || "").trim();
  if (!clean) return inmuebles[0];
  const lower = clean.toLowerCase();
  return (
    inmuebles.find(
      (i) =>
        String(i.id).trim().toLowerCase() === lower ||
        String(i.codigoDomus || "")
          .trim()
          .toLowerCase() === lower
    ) || inmuebles[0]
  );
}

export default function InformesPropietariosView({
  inmuebles,
  clientes,
}: InformesPropietariosViewProps) {
  const searchParams = useSearchParams();
  const inmuebleParam = searchParams.get("inmueble");
  const { views } = useFichaViews();

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  const [selectedId, setSelectedId] = useState<string>(() => {
    const initial = findMatchingInmueble(inmuebles, inmuebleParam);
    return initial?.id ?? "";
  });

  const [mesClave, setMesClave] = useState<string>(
    () => periodOptions[0]?.mesClave ?? "acumulado"
  );

  const [mobileTab, setMobileTab] = useState<"datos" | "preview">("datos");
  const [conceptoExpanded, setConceptoExpanded] = useState(false);

  const [interaccionesWS, setInteraccionesWS] = useState<InteraccionWSRecord[]>(
    []
  );
  const [creadoEnIso, setCreadoEnIso] = useState<string>(() =>
    getInitialBogotaIso()
  );
  const [formState, setFormState] = useState<EditableFormState>(() =>
    createCleanFormState("")
  );
  const [hasCustomDraft, setHasCustomDraft] = useState(false);
  const [busyAction, setBusyAction] = useState<"ws" | "copy" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const dirtySessionRef = useRef(false);

  const switchMobileTab = (nextTab: "datos" | "preview") => {
    setMobileTab(nextTab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Sincronizar si cambia ?inmueble= en la URL
  useEffect(() => {
    if (!inmuebleParam) return;
    const matched = findMatchingInmueble(inmuebles, inmuebleParam);
    if (matched && matched.id !== selectedId) {
      setSelectedId(matched.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmuebleParam, inmuebles]);

  const selectedInmueble = useMemo(() => {
    if (inmuebles.length === 0) return null;
    return (
      inmuebles.find((i) => i.id === selectedId) ||
      findMatchingInmueble(inmuebles, selectedId) ||
      inmuebles[0]
    );
  }, [inmuebles, selectedId]);

  const activePeriod = useMemo(() => {
    return (
      periodOptions.find((p) => p.mesClave === mesClave) || periodOptions[0]
    );
  }, [periodOptions, mesClave]);

  // Carga diferida única de bitácora WhatsApp en Firestore (limit 200)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [db, { collection, query, orderBy, getDocs, limit }] =
          await Promise.all([getFirestoreDb(), import("firebase/firestore")]);
        if (cancelled || !db) return;

        const q = query(
          collection(db, "interacciones_ws"),
          orderBy("fecha", "desc"),
          limit(200)
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const items: InteraccionWSRecord[] = [];
        snap.forEach((doc) => {
          items.push({
            id: doc.id,
            ...(doc.data() as Omit<InteraccionWSRecord, "id">),
          });
        });
        setInteraccionesWS(items);
      } catch {
        // Sin bloqueo si Firestore no está disponible
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Hidratar borrador local + consultar borrador remoto al cambiar inmueble o mes
  useEffect(() => {
    const inmId = selectedInmueble?.id;
    if (!inmId) return;

    dirtySessionRef.current = false;
    const storedOwner = readStoredOwnerName(inmId);
    const localDraft = readLocalDraft(inmId, mesClave);

    if (localDraft) {
      setFormState({
        ...localDraft.state,
        nombrePropietario:
          localDraft.state.nombrePropietario || storedOwner || "",
      });
      setCreadoEnIso(localDraft.savedAt || new Date().toISOString());
      setHasCustomDraft(true);
    } else {
      setFormState(createCleanFormState(storedOwner));
      setCreadoEnIso(new Date().toISOString());
      setHasCustomDraft(false);
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/informes-propietario?inmuebleId=${encodeURIComponent(
            inmId
          )}&mes=${encodeURIComponent(mesClave)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          draft?: InformePropietarioPayload | null;
        };
        const serverDraft = data?.draft;
        if (!serverDraft || dirtySessionRef.current) return;

        const serverTs = Date.parse(serverDraft.creadoEn || "");
        const localTs = localDraft ? Date.parse(localDraft.savedAt || "") : 0;

        if (!localDraft || (serverTs > 0 && serverTs > localTs)) {
          const ownerToUse =
            serverDraft.nombrePropietario?.trim() || storedOwner || "";
          if (serverDraft.nombrePropietario?.trim() && !storedOwner) {
            writeStoredOwnerName(inmId, serverDraft.nombrePropietario.trim());
          }
          setFormState({
            nombrePropietario: ownerToUse,
            vistasFincaRaiz: Math.max(
              0,
              Number(serverDraft.vistasFincaRaiz) || 0
            ),
            contactosFincaRaiz: Math.max(
              0,
              Number(serverDraft.contactosFincaRaiz) || 0
            ),
            vistasMetrocuadrado: Math.max(
              0,
              Number(serverDraft.vistasMetrocuadrado) || 0
            ),
            contactosMetrocuadrado: Math.max(
              0,
              Number(serverDraft.contactosMetrocuadrado) || 0
            ),
            contactosOtrosPortales: Math.max(
              0,
              Number(serverDraft.contactosOtrosPortales) || 0
            ),
            citasRealizadas: Math.max(
              0,
              Number(serverDraft.citasRealizadas) || 0
            ),
            seguimientosEnviados: Math.max(
              0,
              Number(serverDraft.seguimientosEnviados) || 0
            ),
            observaciones: serverDraft.observaciones || DEFAULT_OBSERVACION,
            recomendacion: serverDraft.recomendacion || DEFAULT_RECOMENDACION,
          });
          if (serverDraft.creadoEn) {
            setCreadoEnIso(serverDraft.creadoEn);
          }
          setHasCustomDraft(true);
        }
      } catch {
        // Ignorar abort o fallo de red silenciosamente
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedInmueble?.id, mesClave]);

  // Contactos CRM asociados al inmueble seleccionado
  const matchedClientesAllPeriods = useMemo(() => {
    if (!selectedInmueble) return [];
    const targetId = String(selectedInmueble.id || "").trim();
    const targetDomus = String(selectedInmueble.codigoDomus || "").trim();

    return clientes.filter((c) => {
      const ref = String(c.inmuebleInteres || "").trim();
      if (!ref || ref === "N/A") return false;
      return (
        (targetId !== "" && ref === targetId) ||
        (targetDomus !== "" && ref === targetDomus)
      );
    });
  }, [clientes, selectedInmueble]);

  const currentMonthKey = periodOptions[0]?.mesClave ?? "";

  const matchedClientesCurrentMonthCount = useMemo(() => {
    if (!currentMonthKey) return 0;
    return matchedClientesAllPeriods.filter(
      (c) => extraerMesClaveString(c.fecha) === currentMonthKey
    ).length;
  }, [matchedClientesAllPeriods, currentMonthKey]);

  const matchedClientesInPeriod = useMemo(() => {
    if (mesClave === "acumulado") return matchedClientesAllPeriods;
    return matchedClientesAllPeriods.filter(
      (c) => extraerMesClaveString(c.fecha) === mesClave
    );
  }, [matchedClientesAllPeriods, mesClave]);

  const autoMetrics = useMemo(() => {
    let autoContactosFR = 0;
    let autoContactosM2 = 0;
    let autoContactosOtros = 0;

    for (const c of matchedClientesInPeriod) {
      if (c.origen === "Finca Raíz") {
        autoContactosFR += 1;
      } else if (c.origen === "Metrocuadrado") {
        autoContactosM2 += 1;
      } else {
        autoContactosOtros += 1;
      }
    }

    const totalAutoContactos =
      autoContactosFR + autoContactosM2 + autoContactosOtros;

    let autoCitasWS = 0;
    let rawSeguimientosWS = 0;

    if (selectedInmueble) {
      const targetId = String(selectedInmueble.id || "").trim();
      const targetDomus = String(selectedInmueble.codigoDomus || "").trim();

      for (const rec of interaccionesWS) {
        const recInmId = String(rec.inmueble_id || "").trim();
        if (!recInmId || recInmId === "sin-inmueble") continue;

        const matchesProp =
          (targetId !== "" && recInmId === targetId) ||
          (targetDomus !== "" && recInmId === targetDomus);
        if (!matchesProp) continue;

        if (mesClave !== "acumulado") {
          const d = extraerFechaFirestore(rec.fecha);
          if (!d) continue;
          const { year, monthIndex } = getBogotaDateParts(d);
          const recMes = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
          if (recMes !== mesClave) continue;
        }

        rawSeguimientosWS += 1;
        const tipoLower = (rec.tipo_mensaje || "").toLowerCase();
        if (tipoLower.includes("visita") || tipoLower.includes("cita")) {
          autoCitasWS += 1;
        }
      }
    }

    const autoSeguimientosWS =
      rawSeguimientosWS > 0 ? rawSeguimientosWS : totalAutoContactos;
    const vistasFichaDigital = selectedInmueble
      ? views[selectedInmueble.id] ?? 0
      : 0;

    return {
      autoContactosFR,
      autoContactosM2,
      autoContactosOtros,
      totalAutoContactos,
      autoCitasWS,
      autoSeguimientosWS,
      vistasFichaDigital,
    };
  }, [
    matchedClientesInPeriod,
    interaccionesWS,
    selectedInmueble,
    mesClave,
    views,
  ]);

  const updateForm = useCallback(
    (updater: (prev: EditableFormState) => EditableFormState) => {
      dirtySessionRef.current = true;
      setHasCustomDraft(true);
      setFormState((prev) => {
        const next = updater(prev);
        if (selectedInmueble?.id) {
          const savedIso = writeLocalDraft(
            selectedInmueble.id,
            mesClave,
            next
          );
          setCreadoEnIso(savedIso);
        }
        return next;
      });
    },
    [selectedInmueble?.id, mesClave]
  );

  const handleOwnerNameChange = (value: string) => {
    if (selectedInmueble?.id) {
      writeStoredOwnerName(selectedInmueble.id, value);
    }
    updateForm((prev) => ({
      ...prev,
      nombrePropietario: value,
    }));
  };

  const handleRestoreAuto = () => {
    if (!selectedInmueble) return;
    clearLocalDraft(selectedInmueble.id, mesClave);
    dirtySessionRef.current = false;
    setHasCustomDraft(false);
    const storedOwner = readStoredOwnerName(selectedInmueble.id);
    setFormState(createCleanFormState(storedOwner));
    setCreadoEnIso(new Date().toISOString());
    toast.success("Datos automáticos de Domus restaurados");
  };

  const toggleObservacionChip = (sentence: string) => {
    updateForm((prev) => {
      const current = prev.observaciones.trim();
      if (current.includes(sentence)) {
        const cleaned = current
          .replace(sentence, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        return { ...prev, observaciones: cleaned };
      }
      const nextText = current ? `${current} ${sentence}` : sentence;
      return { ...prev, observaciones: nextText };
    });
  };

  const selectRecomendacionChip = (sentence: string) => {
    updateForm((prev) => ({
      ...prev,
      recomendacion: sentence,
    }));
  };

  // Valores efectivos combinando métricas automáticas + overrides manuales
  const effectiveContactosFR =
    formState.contactosFincaRaiz ?? autoMetrics.autoContactosFR;
  const effectiveContactosM2 =
    formState.contactosMetrocuadrado ?? autoMetrics.autoContactosM2;
  const effectiveContactosOtros =
    formState.contactosOtrosPortales ?? autoMetrics.autoContactosOtros;
  const effectiveCitas =
    formState.citasRealizadas ?? autoMetrics.autoCitasWS;
  const effectiveSeguimientos =
    formState.seguimientosEnviados ?? autoMetrics.autoSeguimientosWS;

  const liveTotalVistas =
    formState.vistasFincaRaiz +
    formState.vistasMetrocuadrado +
    autoMetrics.vistasFichaDigital;
  const liveTotalContactos =
    effectiveContactosFR + effectiveContactosM2 + effectiveContactosOtros;

  const isConceptoEdited =
    formState.observaciones.trim() !== DEFAULT_OBSERVACION ||
    formState.recomendacion.trim() !== DEFAULT_RECOMENDACION;

  const currentPayload: InformePropietarioPayload = useMemo(
    () => ({
      inmuebleId: selectedInmueble?.id ?? "",
      codigoDomus: selectedInmueble?.codigoDomus,
      mesClave: activePeriod.mesClave,
      mesEtiqueta: activePeriod.mesEtiqueta,
      nombrePropietario: formState.nombrePropietario.trim() || undefined,
      vistasFincaRaiz: formState.vistasFincaRaiz,
      contactosFincaRaiz: effectiveContactosFR,
      vistasMetrocuadrado: formState.vistasMetrocuadrado,
      contactosMetrocuadrado: effectiveContactosM2,
      contactosOtrosPortales: effectiveContactosOtros,
      vistasFichaDigital: autoMetrics.vistasFichaDigital,
      citasRealizadas: effectiveCitas,
      seguimientosEnviados: effectiveSeguimientos,
      observaciones: formState.observaciones.trim(),
      recomendacion: formState.recomendacion.trim(),
      creadoEn: creadoEnIso,
    }),
    [
      selectedInmueble?.id,
      selectedInmueble?.codigoDomus,
      activePeriod.mesClave,
      activePeriod.mesEtiqueta,
      formState.nombrePropietario,
      formState.vistasFincaRaiz,
      formState.vistasMetrocuadrado,
      formState.observaciones,
      formState.recomendacion,
      effectiveContactosFR,
      effectiveContactosM2,
      effectiveContactosOtros,
      autoMetrics.vistasFichaDigital,
      effectiveCitas,
      effectiveSeguimientos,
      creadoEnIso,
    ]
  );

  const persistAndCreateReportUrl = async (): Promise<string | null> => {
    const payloadToSave: InformePropietarioPayload = {
      ...currentPayload,
      creadoEn: new Date().toISOString(),
    };
    const res = await fetch("/api/informes-propietario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToSave),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as { token?: string; urlPath?: string };
    if (!data?.urlPath) {
      throw new Error("Missing urlPath");
    }
    return `${window.location.origin}${data.urlPath}`;
  };

  const handleSendWhatsApp = async () => {
    if (!selectedInmueble || busyAction) return;
    setBusyAction("ws");
    try {
      const fullUrl = await persistAndCreateReportUrl();
      if (!fullUrl) throw new Error("Sin enlace");

      const nombreProp = currentPayload.nombrePropietario?.trim();
      const saludoLinea = nombreProp
        ? `Cordial saludo, *${nombreProp}*.`
        : "Cordial saludo, estimado(a) propietario(a).";

      const refLabel = selectedInmueble.codigoDomus || selectedInmueble.id;

      const msg = [
        saludoLinea,
        "",
        `Le comparto el *Informe Ejecutivo de Gestión Comercial (${currentPayload.mesEtiqueta})* de su inmueble *${selectedInmueble.tipo} en ${selectedInmueble.barrio}* (Ref. #${refLabel}):`,
        "",
        `• Visualizaciones totales: *${liveTotalVistas.toLocaleString("es-CO")}*`,
        `• Interesados atendidos: *${liveTotalContactos}*`,
        `• Visitas realizadas al inmueble: *${currentPayload.citasRealizadas}*`,
        "",
        "Puede consultar y descargar su informe completo en el siguiente enlace:",
        fullUrl,
        "",
        "Quedo muy atenta a sus comentarios.",
        `*${AGENTE_PATRICIA.nombreCompleto}*`,
        AGENTE_PATRICIA.inmobiliaria,
      ].join("\n");

      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      toast.success("Informe generado · Abriendo WhatsApp");
      const popup = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = waUrl;
      }
    } catch {
      toast.error(
        "No se pudo generar el enlace del informe. Intenta nuevamente."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrintPdf = () => {
    if (!selectedInmueble) return;
    const payloadToSave: InformePropietarioPayload = {
      ...currentPayload,
      creadoEn: new Date().toISOString(),
    };
    fetch("/api/informes-propietario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToSave),
    }).catch(() => {});

    window.print();
  };

  const handleCopyReportLink = async () => {
    if (!selectedInmueble || busyAction) return;
    setBusyAction("copy");
    try {
      const fullUrl = await persistAndCreateReportUrl();
      if (!fullUrl) throw new Error("Sin enlace");
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast.success("Link del informe copiado al portapapeles");
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      toast.error("No se pudo copiar el link del informe");
    } finally {
      setBusyAction(null);
    }
  };

  const showHistoricBanner =
    mesClave === currentMonthKey &&
    matchedClientesCurrentMonthCount === 0 &&
    matchedClientesAllPeriods.length > 0;

  if (inmuebles.length === 0 || !selectedInmueble) {
    return (
      <div className="page">
        <header className="header no-print">
          <div>
            <h1 className="header-title">Informes a Propietarios</h1>
            <p className="header-sub">
              Reporte ejecutivo mensual de portales, interesados y visitas
            </p>
          </div>
        </header>
        <div className="no-print">
          <EmptyState
            icon={<Building2 size={44} />}
            title="Sin inmuebles activos"
            description="No encontramos inmuebles sincronizados en tu portafolio de L2L para generar informes."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page report-page">
      {/* Cabecera compacta (oculta al imprimir A4) */}
      <header
        className="header no-print"
        style={{
          padding: "16px 16px 8px",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 230px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(184, 15, 18, 0.08)",
              border: "1px solid rgba(184, 15, 18, 0.2)",
              color: "var(--red)",
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            <FileText size={12} />
            <span>Gestión de Propietarios · L2L</span>
          </div>
          <h1
            className="header-title"
            style={{
              fontSize: "clamp(22px, 5.8vw, 27px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.18,
            }}
          >
            Informe Mensual a Propietarios
          </h1>
          <p
            className="header-sub"
            style={{ fontSize: 13.5, marginTop: 2, lineHeight: 1.35 }}
          >
            Portales, visitas del mes y concepto comercial en un toque
          </p>
        </div>

        {hasCustomDraft && (
          <button
            type="button"
            onClick={handleRestoreAuto}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 11px",
              borderRadius: 10,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <RotateCcw size={13} color="var(--red)" />
            <span>Restaurar auto</span>
          </button>
        )}
      </header>

      {/* Selector fijo superior en móvil (< 980px): 1. Datos | 2. Vista previa */}
      <div className="report-mobile-tabs no-print">
        <div className="report-segmented" role="tablist" aria-label="Modo del informe">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "datos"}
            className={`report-seg-btn ${mobileTab === "datos" ? "active" : ""}`}
            onClick={() => switchMobileTab("datos")}
          >
            <SlidersHorizontal size={15} />
            <span>1. Completar datos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "preview"}
            className={`report-seg-btn ${mobileTab === "preview" ? "active" : ""}`}
            onClick={() => switchMobileTab("preview")}
          >
            <Eye size={15} />
            <span>2. Vista previa</span>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
                background:
                  mobileTab === "preview"
                    ? "rgba(184, 15, 18, 0.1)"
                    : "rgba(17, 24, 39, 0.07)",
                color:
                  mobileTab === "preview"
                    ? "var(--red)"
                    : "var(--text-secondary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {liveTotalVistas}v · {liveTotalContactos}c
            </span>
          </button>
        </div>
      </div>

      {/* Grilla responsiva: Pestañas en móvil / Lado a lado en escritorio */}
      <div className="report-builder-grid">
        {/* COLUMNA IZQUIERDA: Controles ergonómicos (.no-print) */}
        <div
          className={`no-print ${
            mobileTab === "preview" ? "report-col-hidden-mobile" : ""
          }`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
          }}
        >
          {/* PASO 1: Inmueble, Periodo y Destinatario */}
          <section
            className="card"
            style={{
              padding: 15,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>
                1. Inmueble a reportar
              </label>
              <PropertyPickerDrawer
                inmuebles={inmuebles}
                selected={selectedInmueble}
                onSelect={(inm) => setSelectedId(inm.id)}
                views={views}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>
                2. Periodo del informe
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {periodOptions.map((opt) => {
                  const active = opt.mesClave === mesClave;
                  return (
                    <button
                      key={opt.mesClave}
                      type="button"
                      onClick={() => setMesClave(opt.mesClave)}
                      className={`quick-chip ${active ? "active" : ""}`}
                      style={{
                        flex: "1 1 auto",
                        justifyContent: "center",
                        padding: "6px 10px",
                        fontSize: 12.5,
                        minHeight: 36,
                      }}
                    >
                      <span>{opt.chipEtiqueta}</span>
                    </button>
                  );
                })}
              </div>

              {showHistoricBanner && (
                <button
                  type="button"
                  onClick={() => setMesClave("acumulado")}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: 11,
                    background: "rgba(184, 15, 18, 0.06)",
                    border: "1px solid var(--border-red)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.35,
                    }}
                  >
                    <Info
                      size={15}
                      color="var(--red)"
                      style={{ flexShrink: 0 }}
                    />
                    <span>
                      {matchedClientesAllPeriods.length}{" "}
                      {matchedClientesAllPeriods.length === 1
                        ? "interesado activo"
                        : "interesados activos"}{" "}
                      en el histórico
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: "var(--red)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Ver acumulado
                  </span>
                </button>
              )}
            </div>

            <div>
              <label
                className="form-label"
                htmlFor="owner-name-input"
                style={{
                  fontSize: 12,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <User size={13} color="var(--text-muted)" />
                <span>Nombre del propietario (opcional)</span>
              </label>
              <input
                id="owner-name-input"
                type="text"
                className="form-input"
                placeholder="Ej: Don Jorge Ramírez / Sra. María"
                style={{ fontSize: 15, padding: "10px 12px" }}
                value={formState.nombrePropietario}
                onChange={(e) => handleOwnerNameChange(e.target.value)}
              />
            </div>
          </section>

          {/* PASO 2: Estadística de Portales (1 sola fila por portal en móvil) */}
          <section
            className="card"
            style={{
              padding: 15,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 15.5,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  <BarChart3 size={17} color="var(--red)" />
                  <span>Estadística de portales</span>
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                    lineHeight: 1.35,
                  }}
                >
                  Contactos Domus sumados solos. Anota las vistas de cada aviso:
                </p>
              </div>

              <button
                type="button"
                onClick={handleRestoreAuto}
                title="Restaurar conteos automáticos de Domus"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--red)",
                  padding: "4px 8px",
                  borderRadius: 8,
                  background: "rgba(184, 15, 18, 0.06)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={11.5} />
                <span>Auto</span>
              </button>
            </div>

            {/* Bloque Finca Raíz */}
            <div
              style={{
                padding: 12,
                borderRadius: 13,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Finca Raíz
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 7px",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 700,
                    background:
                      formState.contactosFincaRaiz === null
                        ? "rgba(22, 163, 74, 0.1)"
                        : "rgba(184, 15, 18, 0.08)",
                    color:
                      formState.contactosFincaRaiz === null
                        ? "#15803D"
                        : "var(--red)",
                  }}
                >
                  <Sparkles size={10.5} />
                  <span>
                    {formState.contactosFincaRaiz === null
                      ? "Auto Domus"
                      : `Domus: ${autoMetrics.autoContactosFR}`}
                  </span>
                </span>
              </div>

              <div className="report-portal-inputs-row">
                <div>
                  <label
                    htmlFor="vistas-fr-input"
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: 5,
                    }}
                  >
                    Vistas al aviso
                  </label>
                  <input
                    id="vistas-fr-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    placeholder="0"
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      padding: "8px 11px",
                      height: 40,
                      fontVariantNumeric: "tabular-nums",
                    }}
                    value={
                      formState.vistasFincaRaiz === 0
                        ? ""
                        : String(formState.vistasFincaRaiz)
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const num = digits ? Math.min(999999, Number(digits)) : 0;
                      updateForm((prev) => ({ ...prev, vistasFincaRaiz: num }));
                    }}
                  />
                </div>

                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: 5,
                      textAlign: "center",
                    }}
                  >
                    Interesados
                  </span>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Restar contacto Finca Raíz"
                      style={{ background: "#FFFFFF", width: 38, height: 40 }}
                      onClick={() =>
                        updateForm((prev) => ({
                          ...prev,
                          contactosFincaRaiz: Math.max(
                            0,
                            (prev.contactosFincaRaiz ??
                              autoMetrics.autoContactosFR) - 1
                          ),
                        }))
                      }
                    >
                      <Minus size={15} />
                    </button>
                    <span
                      style={{
                        minWidth: 28,
                        textAlign: "center",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {effectiveContactosFR}
                    </span>
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Sumar contacto Finca Raíz"
                      style={{ background: "#FFFFFF", width: 38, height: 40 }}
                      onClick={() =>
                        updateForm((prev) => ({
                          ...prev,
                          contactosFincaRaiz:
                            (prev.contactosFincaRaiz ??
                              autoMetrics.autoContactosFR) + 1,
                        }))
                      }
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Sumar vistas:
                </span>
                {[25, 50, 100].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    className="quick-chip"
                    style={{
                      minHeight: 28,
                      padding: "3px 9px",
                      fontSize: 11.5,
                      fontVariantNumeric: "tabular-nums",
                    }}
                    onClick={() =>
                      updateForm((prev) => ({
                        ...prev,
                        vistasFincaRaiz: prev.vistasFincaRaiz + inc,
                      }))
                    }
                  >
                    +{inc}
                  </button>
                ))}
                {formState.vistasFincaRaiz > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateForm((prev) => ({ ...prev, vistasFincaRaiz: 0 }))
                    }
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      padding: "3px 6px",
                      cursor: "pointer",
                      marginLeft: "auto",
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Bloque Metrocuadrado */}
            <div
              style={{
                padding: 12,
                borderRadius: 13,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Metrocuadrado
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 7px",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 700,
                    background:
                      formState.contactosMetrocuadrado === null
                        ? "rgba(22, 163, 74, 0.1)"
                        : "rgba(184, 15, 18, 0.08)",
                    color:
                      formState.contactosMetrocuadrado === null
                        ? "#15803D"
                        : "var(--red)",
                  }}
                >
                  <Sparkles size={10.5} />
                  <span>
                    {formState.contactosMetrocuadrado === null
                      ? "Auto Domus"
                      : `Domus: ${autoMetrics.autoContactosM2}`}
                  </span>
                </span>
              </div>

              <div className="report-portal-inputs-row">
                <div>
                  <label
                    htmlFor="vistas-m2-input"
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: 5,
                    }}
                  >
                    Vistas al aviso
                  </label>
                  <input
                    id="vistas-m2-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    placeholder="0"
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      padding: "8px 11px",
                      height: 40,
                      fontVariantNumeric: "tabular-nums",
                    }}
                    value={
                      formState.vistasMetrocuadrado === 0
                        ? ""
                        : String(formState.vistasMetrocuadrado)
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const num = digits ? Math.min(999999, Number(digits)) : 0;
                      updateForm((prev) => ({
                        ...prev,
                        vistasMetrocuadrado: num,
                      }));
                    }}
                  />
                </div>

                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: 5,
                      textAlign: "center",
                    }}
                  >
                    Interesados
                  </span>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Restar contacto Metrocuadrado"
                      style={{ background: "#FFFFFF", width: 38, height: 40 }}
                      onClick={() =>
                        updateForm((prev) => ({
                          ...prev,
                          contactosMetrocuadrado: Math.max(
                            0,
                            (prev.contactosMetrocuadrado ??
                              autoMetrics.autoContactosM2) - 1
                          ),
                        }))
                      }
                    >
                      <Minus size={15} />
                    </button>
                    <span
                      style={{
                        minWidth: 28,
                        textAlign: "center",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {effectiveContactosM2}
                    </span>
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Sumar contacto Metrocuadrado"
                      style={{ background: "#FFFFFF", width: 38, height: 40 }}
                      onClick={() =>
                        updateForm((prev) => ({
                          ...prev,
                          contactosMetrocuadrado:
                            (prev.contactosMetrocuadrado ??
                              autoMetrics.autoContactosM2) + 1,
                        }))
                      }
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Sumar vistas:
                </span>
                {[25, 50, 100].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    className="quick-chip"
                    style={{
                      minHeight: 28,
                      padding: "3px 9px",
                      fontSize: 11.5,
                      fontVariantNumeric: "tabular-nums",
                    }}
                    onClick={() =>
                      updateForm((prev) => ({
                        ...prev,
                        vistasMetrocuadrado: prev.vistasMetrocuadrado + inc,
                      }))
                    }
                  >
                    +{inc}
                  </button>
                ))}
                {formState.vistasMetrocuadrado > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateForm((prev) => ({
                        ...prev,
                        vistasMetrocuadrado: 0,
                      }))
                    }
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      padding: "3px 6px",
                      cursor: "pointer",
                      marginLeft: "auto",
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Bloque Otros portales y Red L2L */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 13,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Red L2L y Ficha Digital
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                    marginTop: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--red)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Eye size={11.5} />
                    {autoMetrics.vistasFichaDigital}{" "}
                    {autoMetrics.vistasFichaDigital === 1
                      ? "apertura"
                      : "aperturas"}
                  </span>
                  <span>· Proppit / L2L</span>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label="Restar contacto otros portales"
                  style={{ background: "#FFFFFF", width: 36, height: 38 }}
                  onClick={() =>
                    updateForm((prev) => ({
                      ...prev,
                      contactosOtrosPortales: Math.max(
                        0,
                        (prev.contactosOtrosPortales ??
                          autoMetrics.autoContactosOtros) - 1
                      ),
                    }))
                  }
                >
                  <Minus size={14} />
                </button>
                <span
                  style={{
                    minWidth: 26,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {effectiveContactosOtros}
                </span>
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label="Sumar contacto otros portales"
                  style={{ background: "#FFFFFF", width: 36, height: 38 }}
                  onClick={() =>
                    updateForm((prev) => ({
                      ...prev,
                      contactosOtrosPortales:
                        (prev.contactosOtrosPortales ??
                          autoMetrics.autoContactosOtros) + 1,
                    }))
                  }
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </section>

          {/* PASO 3: Citas / Visitas realizadas y Seguimientos */}
          <section
            className="card"
            style={{
              padding: 15,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  <CalendarCheck size={18} color="var(--red)" />
                  <span>Citas al inmueble</span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {autoMetrics.autoCitasWS > 0
                    ? `${autoMetrics.autoCitasWS} en bitácora · Suma citas por llamada`
                    : "Visitas presenciales atendidas en el mes"}
                </p>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label="Restar cita realizada"
                  style={{ width: 42, height: 42 }}
                  onClick={() =>
                    updateForm((prev) => ({
                      ...prev,
                      citasRealizadas: Math.max(
                        0,
                        (prev.citasRealizadas ?? autoMetrics.autoCitasWS) - 1
                      ),
                    }))
                  }
                >
                  <Minus size={17} />
                </button>
                <span
                  style={{
                    minWidth: 32,
                    textAlign: "center",
                    fontSize: 21,
                    fontWeight: 800,
                    color: "var(--red)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {effectiveCitas}
                </span>
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label="Sumar cita realizada"
                  style={{ width: 42, height: 42 }}
                  onClick={() =>
                    updateForm((prev) => ({
                      ...prev,
                      citasRealizadas:
                        (prev.citasRealizadas ?? autoMetrics.autoCitasWS) + 1,
                    }))
                  }
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <div className="divider" style={{ margin: "0" }} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  <Send size={13.5} color="var(--text-secondary)" />
                  <span>Seguimientos enviados</span>
                </div>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                    marginTop: 1,
                  }}
                >
                  Fichas y atenciones por WhatsApp / llamada
                </p>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="stepper-btn"
                  style={{ width: 36, height: 38 }}
                  aria-label="Restar seguimiento enviado"
                  onClick={() =>
                    updateForm((prev) => ({
                      ...prev,
                      seguimientosEnviados: Math.max(
                        0,
                        (prev.seguimientosEnviados ??
                          autoMetrics.autoSeguimientosWS) - 1
                      ),
                    }))
                  }
                >
                  <Minus size={14} />
                </button>
                <span
                  style={{
                    minWidth: 28,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {effectiveSeguimientos}
                </span>
                <button
                  type="button"
                  className="stepper-btn"
                  style={{ width: 36, height: 38 }}
                  aria-label="Sumar seguimiento enviado"
                  onClick={() =>
                    updateForm((prev) => ({
                      ...prev,
                      seguimientosEnviados:
                        (prev.seguimientosEnviados ??
                          autoMetrics.autoSeguimientosWS) + 1,
                    }))
                  }
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </section>

          {/* PASO 4: Concepto Comercial Colapsable ("Modo rápido" sin scroll de cajas gigantes) */}
          <section
            className="card"
            style={{
              padding: 15,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setConceptoExpanded((prev) => !prev)}
              aria-expanded={conceptoExpanded}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <FileText size={17} color="var(--red)" />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    Concepto comercial
                  </span>
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: isConceptoEdited
                        ? "rgba(184, 15, 18, 0.08)"
                        : "rgba(22, 163, 74, 0.1)",
                      color: isConceptoEdited ? "var(--red)" : "#15803D",
                    }}
                  >
                    {isConceptoEdited ? "Personalizado" : "Listo · Auto"}
                  </span>
                </div>
              </div>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--red)",
                  padding: "4px 9px",
                  borderRadius: 8,
                  background: "rgba(184, 15, 18, 0.06)",
                  flexShrink: 0,
                }}
              >
                <span>{conceptoExpanded ? "Ocultar" : "Editar"}</span>
                {conceptoExpanded ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </span>
            </button>

            {!conceptoExpanded ? (
              <div
                onClick={() => setConceptoExpanded(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setConceptoExpanded(true);
                  }
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 11,
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {formState.observaciones || DEFAULT_OBSERVACION}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--red)",
                  }}
                >
                  Toca para elegir frases rápidas o editar recomendación →
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  paddingTop: 2,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-secondary)",
                      marginBottom: 8,
                      lineHeight: 1.35,
                    }}
                  >
                    Toca frases rápidas para armar las observaciones al propietario:
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 9,
                    }}
                  >
                    {OBSERVACION_CHIPS.map((chip) => {
                      const isActive = formState.observaciones.includes(
                        chip.sentence
                      );
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => toggleObservacionChip(chip.sentence)}
                          className={`quick-chip ${isActive ? "active" : ""}`}
                          style={{
                            fontSize: 11.5,
                            padding: "5px 10px",
                            minHeight: 31,
                          }}
                        >
                          {isActive && <Check size={12} />}
                          <span>{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <label
                    className="form-label"
                    htmlFor="observaciones-textarea"
                    style={{ fontSize: 11.5, marginBottom: 5 }}
                  >
                    Observaciones de visitas y mercado
                  </label>
                  <textarea
                    id="observaciones-textarea"
                    className="form-textarea"
                    placeholder="Percepción de clientes, comentarios sobre precio o estado..."
                    style={{
                      minHeight: 96,
                      fontSize: 14,
                      lineHeight: 1.48,
                      padding: "10px 12px",
                    }}
                    value={formState.observaciones}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        observaciones: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label
                    className="form-label"
                    htmlFor="recomendacion-textarea"
                    style={{ fontSize: 11.5, marginBottom: 7 }}
                  >
                    Recomendación comercial próximo mes
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 9,
                    }}
                  >
                    {RECOMENDACION_CHIPS.map((chip) => {
                      const isActive =
                        formState.recomendacion.trim() === chip.sentence;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => selectRecomendacionChip(chip.sentence)}
                          className={`quick-chip ${isActive ? "active" : ""}`}
                          style={{
                            fontSize: 11.5,
                            padding: "5px 10px",
                            minHeight: 31,
                          }}
                        >
                          {isActive && <Check size={12} />}
                          <span>{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    id="recomendacion-textarea"
                    className="form-textarea"
                    placeholder="Sugerencia estratégica de L2L para el propietario..."
                    style={{
                      minHeight: 82,
                      fontSize: 14,
                      lineHeight: 1.48,
                      padding: "10px 12px",
                    }}
                    value={formState.recomendacion}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        recomendacion: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* COLUMNA DERECHA: Vista previa ejecutiva en vivo + Acciones escritorio */}
        <div
          className={`report-preview-sticky report-preview-col ${
            mobileTab === "datos" ? "report-col-hidden-mobile" : ""
          }`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
          }}
        >
          {/* Barra de acciones solo escritorio (>= 980px; en móvil vive fija abajo al pulgar) */}
          <div
            className="card no-print report-desktop-actions"
            style={{
              padding: 16,
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-secondary)",
                }}
              >
                Listo para entregar al propietario
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "#15803D",
                }}
              >
                Vista previa en vivo
              </span>
            </div>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={busyAction !== null}
              className="btn-ws"
              style={{
                minHeight: 48,
                padding: "12px 16px",
                fontSize: 15.5,
                borderRadius: 12,
                opacity: busyAction === "ws" ? 0.75 : 1,
              }}
            >
              <MessageCircle size={19} />
              <span>
                {busyAction === "ws"
                  ? "Generando enlace..."
                  : "Enviar informe por WhatsApp"}
              </span>
            </button>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handlePrintPdf}
                className="btn-primary"
                style={{
                  flex: "1 1 170px",
                  minHeight: 44,
                  padding: "10px 14px",
                  fontSize: 14,
                  borderRadius: 12,
                }}
              >
                <Printer size={16} />
                <span>Descargar / Imprimir PDF</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReportLink}
                disabled={busyAction !== null}
                className="btn-secondary"
                style={{
                  flex: "1 1 155px",
                  minHeight: 44,
                  padding: "10px 14px",
                  fontSize: 14,
                  borderRadius: 12,
                  background: "var(--bg-base)",
                }}
              >
                {copiedLink ? (
                  <Check size={16} color="#16A34A" />
                ) : (
                  <Copy size={16} />
                )}
                <span>
                  {copiedLink ? "Link copiado" : "Copiar link del informe"}
                </span>
              </button>
            </div>
          </div>

          {/* Hoja ejecutiva (visible en pestaña Vista Previa móvil, escritorio y @media print A4) */}
          <OwnerReportSheet
            report={currentPayload}
            inmueble={selectedInmueble}
          />
        </div>
      </div>

      {/* Barra fija al pulgar en móvil (< 980px): Resumen en vivo + Enviar WhatsApp + Link + PDF */}
      <div className="report-mobile-actionbar no-print">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 7,
            fontSize: 11.5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span
            style={{
              color: "var(--text-secondary)",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <strong style={{ color: "var(--text-primary)", fontWeight: 800 }}>
              {liveTotalVistas.toLocaleString("es-CO")}
            </strong>{" "}
            vistas ·{" "}
            <strong style={{ color: "var(--text-primary)", fontWeight: 800 }}>
              {liveTotalContactos}
            </strong>{" "}
            contactos ·{" "}
            <strong style={{ color: "var(--red)", fontWeight: 800 }}>
              {effectiveCitas}
            </strong>{" "}
            {effectiveCitas === 1 ? "cita" : "citas"}
          </span>

          <button
            type="button"
            onClick={() =>
              switchMobileTab(mobileTab === "datos" ? "preview" : "datos")
            }
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: "var(--red)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {mobileTab === "datos" ? "Ver previa →" : "← Editar datos"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={busyAction !== null}
            className="btn-ws"
            style={{
              flex: 1,
              minHeight: 45,
              padding: "10px 12px",
              fontSize: 14.5,
              borderRadius: 11,
              minWidth: 0,
              opacity: busyAction === "ws" ? 0.75 : 1,
            }}
          >
            <MessageCircle size={18} style={{ flexShrink: 0 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {busyAction === "ws" ? "Generando..." : "Enviar WhatsApp"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyReportLink}
            disabled={busyAction !== null}
            className="btn-secondary"
            aria-label="Copiar link del informe"
            style={{
              width: "auto",
              minHeight: 45,
              padding: "10px 11px",
              fontSize: 13,
              borderRadius: 11,
              background: "var(--bg-base)",
              flexShrink: 0,
              gap: 5,
            }}
          >
            {copiedLink ? (
              <Check size={16} color="#16A34A" />
            ) : (
              <Copy size={16} />
            )}
            <span>{copiedLink ? "Listo" : "Link"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="btn-secondary"
            aria-label="Guardar PDF"
            style={{
              width: "auto",
              minHeight: 45,
              padding: "10px 11px",
              fontSize: 13,
              borderRadius: 11,
              background: "var(--bg-base)",
              flexShrink: 0,
              gap: 5,
            }}
          >
            <Printer size={16} color="var(--red)" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
