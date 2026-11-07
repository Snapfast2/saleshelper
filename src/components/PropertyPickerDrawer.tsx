'use client';
// src/components/PropertyPickerDrawer.tsx

import { useState } from "react";
import { Drawer } from "vaul";
import { Command } from "cmdk";
import {
  Search,
  ChevronsUpDown,
  Check,
  Building2,
  Eye,
  X,
} from "lucide-react";
import type { Inmueble } from "@/types";

export interface PropertyPickerDrawerProps {
  inmuebles: Inmueble[];
  selected: Inmueble | null;
  onSelect: (inm: Inmueble) => void;
  loading?: boolean;
  views?: Record<string, number>;
  customTrigger?: React.ReactNode;
  drawerTitle?: string;
}

function formatCOP(valor: number): string {
  return `$ ${new Intl.NumberFormat("es-CO").format(valor)}`;
}

export default function PropertyPickerDrawer({
  inmuebles,
  selected,
  onSelect,
  loading = false,
  views,
  customTrigger,
  drawerTitle = "Seleccionar inmueble",
}: PropertyPickerDrawerProps) {
  const [open, setOpen] = useState(false);
  const [failedImgs, setFailedImgs] = useState<Record<string, boolean>>({});

  if (loading && !customTrigger) {
    return (
      <div
        className="card"
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          className="animate-pulse"
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            background: "var(--bg-card-hover)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            Seleccionar inmueble...
          </div>
          <div
            className="animate-pulse"
            style={{
              width: "55%",
              height: 12,
              borderRadius: 6,
              background: "var(--bg-card-hover)",
            }}
          />
        </div>
      </div>
    );
  }

  const selectedRef = selected ? selected.codigoDomus || selected.id : "";
  const selectedViews = selected ? views?.[selected.id] ?? 0 : 0;
  const selectedImgValid =
    selected?.imagen &&
    !selected.imagen.includes("placeholder") &&
    !failedImgs[selected.imagen];

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} repositionInputs={false}>
      <Drawer.Trigger asChild>
        {customTrigger ? (
          customTrigger
        ) : (
          <button
            type="button"
            style={{
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
              cursor: "pointer",
              transition: "border-color 0.18s ease, background 0.18s ease",
            }}
          >
            {/* Miniatura 56x56 */}
            {selected && selectedImgValid ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imagen}
                alt={selected.titulo}
                onError={() =>
                  setFailedImgs((prev) => ({ ...prev, [selected.imagen]: true }))
                }
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  objectFit: "cover",
                  flexShrink: 0,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card-hover)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                <Building2 size={22} />
              </div>
            )}

            {/* Información del inmueble seleccionado */}
            {selected ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "2px 7px",
                      borderRadius: 999,
                      background:
                        selected.gestion === "venta"
                          ? "rgba(184, 15, 18, 0.1)"
                          : "rgba(22, 163, 74, 0.12)",
                      color:
                        selected.gestion === "venta" ? "var(--red)" : "#16a34a",
                    }}
                  >
                    {selected.gestion === "venta" ? "Venta" : "Arriendo"}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    Ref #{selectedRef}
                  </span>
                  {selectedViews > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <Eye size={12} color="var(--red)" />
                      {selectedViews}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.25,
                  }}
                >
                  {selected.tipo} · {selected.barrio}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--red)",
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 2,
                  }}
                >
                  {formatCOP(selected.precio)}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Seleccionar inmueble...
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Busca por barrio, código Domus o precio
                </div>
              </div>
            )}

            {/* Acción Cambiar */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 11px",
                borderRadius: 10,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontSize: 12.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <Search size={14} color="var(--red)" />
              <span>Cambiar</span>
              <ChevronsUpDown size={14} color="var(--text-muted)" />
            </div>
          </button>
        )}
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className="vaul-content" aria-describedby={undefined}>
          <div className="vaul-handle-wrap">
            <div className="vaul-handle" />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "6px 16px 4px 18px",
            }}
          >
            <div>
              <Drawer.Title
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {drawerTitle}
              </Drawer.Title>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                  marginTop: 1,
                }}
              >
                {inmuebles.length} disponibles en portafolio L2L
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar selector de inmueble"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={17} />
            </button>
          </div>

          <Command className="cmdk-root" loop>
            <div className="cmdk-input-wrap">
              <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <Command.Input
                className="cmdk-input"
                placeholder="Buscar por barrio, código Domus, tipo o precio..."
              />
            </div>

            <Command.List className="cmdk-list">
              <Command.Empty className="cmdk-empty">
                No encontramos inmuebles con ese criterio.
              </Command.Empty>

              {inmuebles.map((inm) => {
                const isSelected = selected?.id === inm.id;
                const refCode = inm.codigoDomus || inm.id;
                const viewCount = views?.[inm.id] ?? 0;
                const hasImg =
                  inm.imagen &&
                  !inm.imagen.includes("placeholder") &&
                  !failedImgs[inm.imagen];

                return (
                  <Command.Item
                    key={inm.id}
                    className="cmdk-item"
                    value={`${inm.id} ${inm.codigoDomus || ""} ${inm.titulo} ${inm.barrio} ${inm.ciudad} ${inm.tipo} ${inm.gestion} ${inm.precio}`}
                    onSelect={() => {
                      onSelect(inm);
                      setOpen(false);
                    }}
                  >
                    {hasImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inm.imagen}
                        alt={inm.titulo}
                        loading="lazy"
                        onError={() =>
                          setFailedImgs((prev) => ({ ...prev, [inm.imagen]: true }))
                        }
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 9,
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "1px solid var(--border)",
                          background: "var(--bg-card-hover)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 9,
                          background: "var(--bg-base)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {inm.barrio}, {inm.ciudad}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 3,
                          fontSize: 12,
                          color: "var(--text-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                          {inm.tipo}
                        </span>
                        <span>·</span>
                        <span>Ref #{refCode}</span>
                        {viewCount > 0 && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              padding: "1px 7px",
                              borderRadius: 999,
                              background: "rgba(184, 15, 18, 0.08)",
                              color: "var(--red)",
                              fontSize: 11,
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Eye size={11} />
                            {viewCount} {viewCount === 1 ? "vista" : "vistas"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 800,
                            color: isSelected ? "var(--red)" : "var(--text-primary)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatCOP(inm.precio)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              inm.gestion === "venta" ? "var(--red)" : "#16a34a",
                            textTransform: "uppercase",
                          }}
                        >
                          {inm.gestion === "venta" ? "Venta" : "Arriendo"}
                        </div>
                      </div>

                      {isSelected ? (
                        <Check size={18} color="var(--red)" />
                      ) : (
                        <div style={{ width: 18 }} />
                      )}
                    </div>
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
