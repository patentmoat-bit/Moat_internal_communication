"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download, Layers, Eye, Image as ImageIcon } from "lucide-react";

interface PatentDrawingsProps {
  publicationId: string;
  title: string;
}

export function PatentThumbnail({ publicationId }: { publicationId: string }) {
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-2xs overflow-hidden">
      <svg
        viewBox="0 0 100 80"
        className="w-full h-full text-slate-800 dark:text-zinc-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="5" y="5" width="90" height="70" rx="3" strokeDasharray="3 2" />
        <rect x="12" y="15" width="22" height="16" rx="2" fill="currentColor" fillOpacity="0.1" />
        <line x1="34" y1="23" x2="48" y2="23" />
        <rect x="48" y="15" width="22" height="16" rx="2" fill="currentColor" fillOpacity="0.1" />
        <line x1="59" y1="31" x2="59" y2="45" />
        <rect x="42" y="45" width="34" height="20" rx="2" fill="currentColor" fillOpacity="0.15" />
        <circle cx="23" cy="55" r="8" fill="currentColor" fillOpacity="0.1" />
        <line x1="31" y1="55" x2="42" y2="55" />
      </svg>
      <span className="absolute bottom-0.5 right-1 rounded bg-slate-900/80 dark:bg-zinc-800 px-1 py-0.2 font-mono text-[8px] font-bold text-white">
        FIG.1
      </span>
    </div>
  );
}

export function PatentDrawingsViewer({ publicationId, title }: PatentDrawingsProps) {
  const [selectedFigure, setSelectedFigure] = React.useState<number>(1);
  const [zoomLevel, setZoomLevel] = React.useState<number>(1);

  const figures = [
    {
      id: 1,
      name: "FIG. 1",
      title: "FIG. 1 — Distributed Architecture & Transactional Outbox Block Diagram",
      caption: "FIG. 1 illustrates a block diagram of the multi-tenant cryptographic state system, comprising Gateway 102, Key Derivation Controller 104, Transactional Outbox Table 106, and Event Dispatcher 108.",
    },
    {
      id: 2,
      name: "FIG. 2",
      title: "FIG. 2 — Atomic State Commit & CDC Event Dispatch Flowchart",
      caption: "FIG. 2 is a sequence flowchart illustrating atomic database commit and asynchronous CDC event streaming across enclave boundaries.",
    },
    {
      id: 3,
      name: "FIG. 3",
      title: "FIG. 3 — Ephemeral Tenant Key Derivation & Cryptographic State Machine",
      caption: "FIG. 3 is a state machine diagram detailing ephemeral tenant token exchange and AES-256-GCM context initialization.",
    },
    {
      id: 4,
      name: "FIG. 4",
      title: "FIG. 4 — Latency Comparison Graph: 2PC vs Transactional Outbox",
      caption: "FIG. 4 is a graph showing transaction commit latency under distributed 2PC protocols compared to the single-commit outbox architecture.",
    },
    {
      id: 5,
      name: "FIG. 5",
      title: "FIG. 5 — Conflict-Free Replicated Data Type (CRDT) Merge Controller",
      caption: "FIG. 5 is an architectural schematic of the CRDT state reducer executing deterministic convergence across asynchronous nodes.",
    },
  ];

  const handleDownloadSVG = () => {
    const svgElement = document.getElementById(`patent-fig-${selectedFigure}`);
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${publicationId}_FIG_${selectedFigure}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Figure Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 p-3 text-xs shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {figures.map((fig) => (
            <button
              key={fig.id}
              onClick={() => {
                setSelectedFigure(fig.id);
                setZoomLevel(1);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
                selectedFigure === fig.id
                  ? "bg-accent text-white shadow-sm"
                  : "bg-white dark:bg-zinc-800 text-ink border border-line hover:bg-hover"
              }`}
            >
              <ImageIcon className="size-3.5" />
              <span>{fig.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.2))}
            className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-ink"
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="font-mono text-[11px] font-semibold text-muted w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
            className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-ink"
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-ink"
            title="Reset Zoom"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            onClick={handleDownloadSVG}
            className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink hover:bg-hover"
            title="Export Vector Drawing"
          >
            <Download className="size-3.5" />
            Download SVG
          </button>
        </div>
      </div>

      {/* Interactive Patent Technical Drawing Canvas */}
      <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-6 overflow-hidden min-h-[420px] shadow-sm">
        {/* Drawing Header */}
        <div className="absolute top-3 left-4 flex items-center gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <span className="rounded bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 font-bold text-ink">
            {publicationId}
          </span>
          <span>·</span>
          <span>Official Drawing Sheet {selectedFigure} of 5</span>
        </div>

        <div
          className="transition-transform duration-200 flex items-center justify-center w-full max-w-2xl py-6"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* FIG 1: System Block Diagram */}
          {selectedFigure === 1 && (
            <svg
              id="patent-fig-1"
              viewBox="0 0 700 380"
              className="w-full h-auto text-slate-900 dark:text-zinc-100 select-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              {/* Outer Boundary Frame */}
              <rect x="20" y="20" width="660" height="340" rx="8" strokeWidth="2.5" strokeDasharray="6 4" />
              <text x="35" y="45" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="monospace">
                SYSTEM 100 (MULTI-TENANT CRYPTOGRAPHIC PLATFORM)
              </text>

              {/* Client Terminal 101 */}
              <rect x="50" y="80" width="130" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="65" y="110" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                CLIENT TERMINAL
              </text>
              <text x="100" y="130" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                101
              </text>

              {/* Arrow to Gateway */}
              <path d="M180 115 L240 115" />
              <polygon points="240,115 230,110 230,120" fill="currentColor" stroke="none" />
              <text x="190" y="105" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                [REST/WSS]
              </text>

              {/* API Gateway 102 */}
              <rect x="240" y="80" width="140" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="260" y="110" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                API GATEWAY
              </text>
              <text x="300" y="130" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                102
              </text>

              {/* Arrow to Key Derivation */}
              <path d="M310 150 L310 210" />
              <polygon points="310,210 305,200 315,200" fill="currentColor" stroke="none" />

              {/* Key Derivation Controller 104 */}
              <rect x="230" y="210" width="160" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="242" y="238" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                CRYPTOGRAPHIC KEY
              </text>
              <text x="248" y="254" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                DERIVATION ENGINE 104
              </text>

              {/* Arrow Gateway to DB Commit */}
              <path d="M380 115 L450 115" />
              <polygon points="450,115 440,110 440,120" fill="currentColor" stroke="none" />

              {/* Transactional DB & Outbox 106 */}
              <rect x="450" y="65" width="200" height="100" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="475" y="90" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                RELATIONAL DB 106
              </text>
              <rect x="465" y="105" width="170" height="45" rx="3" strokeWidth="1.8" />
              <text x="480" y="125" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                OUTBOX TABLE 108
              </text>
              <text x="495" y="140" fontSize="9" fill="currentColor" stroke="none">
                (Atomic Commit Boundary)
              </text>

              {/* Arrow DB to Event Dispatcher */}
              <path d="M550 165 L550 220" />
              <polygon points="550,220 545,210 555,210" fill="currentColor" stroke="none" />
              <text x="560" y="195" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                [CDC WAL Tail]
              </text>

              {/* Asynchronous Event Dispatcher 110 */}
              <rect x="460" y="220" width="180" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="475" y="248" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                ASYNC EVENT BUS &
              </text>
              <text x="490" y="265" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                DISPATCHER 110
              </text>

              {/* Arrows to Worker Nodes */}
              <path d="M460 255 L390 255" />
              <path d="M230 255 L160 255" />
              <polygon points="160,255 170,250 170,260" fill="currentColor" stroke="none" />

              {/* Worker Replica Enclave 112 */}
              <rect x="40" y="220" width="120" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="50" y="248" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                WORKER ENCLAVE
              </text>
              <text x="85" y="268" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                112
              </text>
            </svg>
          )}

          {/* FIG 2: Flowchart Sequence */}
          {selectedFigure === 2 && (
            <svg
              id="patent-fig-2"
              viewBox="0 0 650 400"
              className="w-full h-auto text-slate-900 dark:text-zinc-100 select-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              {/* Step 201: Inbound Request */}
              <rect x="225" y="20" width="200" height="45" rx="20" fill="currentColor" fillOpacity="0.08" />
              <text x="245" y="47" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                201: RECEIVE PAYLOAD
              </text>

              <path d="M325 65 L325 95" />
              <polygon points="325,95 320,85 330,85" fill="currentColor" stroke="none" />

              {/* Step 202: Validate Token */}
              <polygon points="325,95 445,135 325,175 205,135" fill="currentColor" fillOpacity="0.08" />
              <text x="260" y="132" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                202: VALIDATE
              </text>
              <text x="250" y="146" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                TENANT TOKEN?
              </text>

              {/* No Path */}
              <path d="M445 135 L520 135 L520 180" />
              <polygon points="520,180 515,170 525,170" fill="currentColor" stroke="none" />
              <text x="460" y="125" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                NO
              </text>
              <rect x="460" y="180" width="120" height="45" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="475" y="207" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                203: REJECT (401)
              </text>

              {/* Yes Path */}
              <path d="M325 175 L325 210" />
              <polygon points="325,210 320,200 330,200" fill="currentColor" stroke="none" />
              <text x="335" y="195" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                YES
              </text>

              {/* Step 204: Atomic Transaction */}
              <rect x="210" y="210" width="230" height="50" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="230" y="232" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                204: ATOMIC COMMIT
              </text>
              <text x="220" y="248" fontSize="9.5" fill="currentColor" stroke="none">
                [Business State + Outbox Envelope]
              </text>

              <path d="M325 260 L325 295" />
              <polygon points="325,295 320,285 330,285" fill="currentColor" stroke="none" />

              {/* Step 205: CDC Dispatch */}
              <rect x="210" y="295" width="230" height="50" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="225" y="318" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                205: CDC LOG TAILING
              </text>
              <text x="235" y="334" fontSize="9.5" fill="currentColor" stroke="none">
                [Push to Kafka / WebSocket Bus]
              </text>

              <path d="M325 345 L325 370" />
              <polygon points="325,370 320,360 330,360" fill="currentColor" stroke="none" />

              {/* Step 206: Verified Replication */}
              <rect x="235" y="370" width="180" height="30" rx="15" fill="currentColor" fillOpacity="0.15" />
              <text x="255" y="390" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                206: DETERMINISTIC MERGE
              </text>
            </svg>
          )}

          {/* FIG 3: State Machine Diagram */}
          {selectedFigure === 3 && (
            <svg
              id="patent-fig-3"
              viewBox="0 0 650 360"
              className="w-full h-auto text-slate-900 dark:text-zinc-100 select-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              {/* Initial State */}
              <circle cx="80" cy="180" r="30" fill="currentColor" fillOpacity="0.08" />
              <text x="60" y="175" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                STATE
              </text>
              <text x="68" y="190" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                301
              </text>
              <text x="45" y="225" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                (IDLE ENCLAVE)
              </text>

              <path d="M110 180 L200 180" />
              <polygon points="200,180 190,175 190,185" fill="currentColor" stroke="none" />
              <text x="120" y="170" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                T1: Inbound Token
              </text>

              {/* Auth State */}
              <circle cx="240" cy="180" r="35" fill="currentColor" fillOpacity="0.08" />
              <text x="220" y="175" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                STATE
              </text>
              <text x="228" y="190" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                302
              </text>
              <text x="195" y="230" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                (DERIVING AES-GCM)
              </text>

              <path d="M275 180 L365 180" />
              <polygon points="365,180 355,175 355,185" fill="currentColor" stroke="none" />
              <text x="285" y="170" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                T2: Key Handshake
              </text>

              {/* Commit State */}
              <circle cx="405" cy="180" r="35" fill="currentColor" fillOpacity="0.08" />
              <text x="385" y="175" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                STATE
              </text>
              <text x="393" y="190" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                303
              </text>
              <text x="360" y="230" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                (ATOMIC OUTBOX)
              </text>

              <path d="M440 180 L530 180" />
              <polygon points="530,180 520,175 520,185" fill="currentColor" stroke="none" />
              <text x="450" y="170" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                T3: CDC Commit
              </text>

              {/* Terminal State */}
              <circle cx="565" cy="180" r="35" strokeWidth="3.2" fill="currentColor" fillOpacity="0.15" />
              <circle cx="565" cy="180" r="28" strokeWidth="1.2" />
              <text x="548" y="175" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                STATE
              </text>
              <text x="555" y="190" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                304
              </text>
              <text x="530" y="230" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none">
                (SYNC VERIFIED)
              </text>
            </svg>
          )}

          {/* FIG 4: Latency Comparison Graph */}
          {selectedFigure === 4 && (
            <svg
              id="patent-fig-4"
              viewBox="0 0 650 360"
              className="w-full h-auto text-slate-900 dark:text-zinc-100 select-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              {/* Axes */}
              <line x1="80" y1="300" x2="580" y2="300" strokeWidth="2.8" />
              <line x1="80" y1="300" x2="80" y2="40" strokeWidth="2.8" />

              {/* Axis Labels */}
              <text x="250" y="335" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                CONCURRENT CLIENT CONNECTIONS (LOAD)
              </text>
              <text x="20" y="170" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none" transform="rotate(-90 20 170)">
                LATENCY (MS)
              </text>

              {/* 2PC Curve (Red / Steep) */}
              <path d="M80 270 Q 250 250, 380 180 T 560 60" stroke="#ef4444" strokeWidth="3.5" fill="none" />
              <text x="410" y="75" fontSize="10" fontWeight="bold" fill="#ef4444" stroke="none">
                CURVE 401 (TRADITIONAL 2PC PROTOCOL)
              </text>

              {/* Outbox Architecture Curve (Green / Flat) */}
              <path d="M80 280 Q 250 270, 380 255 T 560 240" stroke="#10b981" strokeWidth="3.5" fill="none" />
              <text x="330" y="230" fontSize="10" fontWeight="bold" fill="#10b981" stroke="none">
                CURVE 402 (TRANSACTIONAL OUTBOX ARCHITECTURE)
              </text>

              {/* Reference Grid lines */}
              <line x1="80" y1="220" x2="580" y2="220" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <line x1="80" y1="140" x2="580" y2="140" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <line x1="80" y1="60" x2="580" y2="60" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            </svg>
          )}

          {/* FIG 5: CRDT Merge Controller */}
          {selectedFigure === 5 && (
            <svg
              id="patent-fig-5"
              viewBox="0 0 650 360"
              className="w-full h-auto text-slate-900 dark:text-zinc-100 select-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              {/* Node A */}
              <rect x="50" y="60" width="160" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="75" y="90" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                ENCLAVE NODE A
              </text>
              <text x="90" y="110" fontSize="10" fill="currentColor" stroke="none">
                State: S_A (v1.4)
              </text>

              {/* Node B */}
              <rect x="50" y="220" width="160" height="70" rx="4" fill="currentColor" fillOpacity="0.08" />
              <text x="75" y="250" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                ENCLAVE NODE B
              </text>
              <text x="90" y="270" fontSize="10" fill="currentColor" stroke="none">
                State: S_B (v1.4)
              </text>

              {/* Merge Controller 501 */}
              <rect x="300" y="125" width="180" height="100" rx="6" strokeWidth="2.8" fill="currentColor" fillOpacity="0.1" />
              <text x="320" y="155" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">
                CRDT STATE REDUCER
              </text>
              <text x="345" y="175" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                ENGINE 501
              </text>
              <text x="325" y="200" fontSize="9" fill="currentColor" stroke="none">
                (Deterministic LWW Merge)
              </text>

              <path d="M210 95 L300 155" />
              <polygon points="300,155 290,148 292,158" fill="currentColor" stroke="none" />
              <path d="M210 255 L300 195" />
              <polygon points="300,195 292,192 290,202" fill="currentColor" stroke="none" />

              {/* Output Reconciled State */}
              <path d="M480 175 L560 175" />
              <polygon points="560,175 550,170 550,180" fill="currentColor" stroke="none" />
              <rect x="560" y="140" width="70" height="70" rx="35" fill="currentColor" fillOpacity="0.15" />
              <text x="575" y="172" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                STATE
              </text>
              <text x="570" y="188" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">
                S_MERGED
              </text>
            </svg>
          )}
        </div>

        {/* Figure Caption */}
        <div className="mt-2 text-center max-w-xl text-xs font-serif text-slate-800 dark:text-zinc-200 italic border-t border-line/60 pt-3">
          {figures[selectedFigure - 1].caption}
        </div>
      </div>
    </div>
  );
}
