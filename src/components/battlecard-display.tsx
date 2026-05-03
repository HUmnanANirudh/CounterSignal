"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { BattlecardDisplayProps, Citation, Battlecard } from "@/types";
import {
  Building2,
  FileText,
  Target,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Bomb,
  RotateCcw,
  BarChart3,
  Users,
  Newspaper,
  Rocket,
  Layers,
  BookOpen,
  CircleAlert,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

/* ── Section wrapper card ─────────────────────────────────── */

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SectionCard({
  icon,
  title,
  accentColor,
  children,
  defaultOpen = true,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl border border-white/6 overflow-hidden transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/3 transition-colors cursor-pointer"
      >
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: accentColor + "18", color: accentColor }}
        >
          {icon}
        </span>
        <span
          className="text-sm font-semibold tracking-wide uppercase flex-1"
          style={{ color: accentColor }}
        >
          {title}
        </span>
        <span className="text-muted-foreground">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-foreground/85">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Pill / Badge ─────────────────────────────────────────── */

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const colors: Record<string, string> = {
    default: "bg-white/10 text-foreground/70",
    success: "bg-emerald-500/15 text-emerald-400",
    warning: "bg-amber-500/15 text-amber-400",
    danger: "bg-red-500/15 text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

/* ── Citation tooltip ─────────────────────────────────────── */

function CitationSource({ citation }: { citation: Citation }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help underline decoration-dotted decoration-2 text-blue-400">
        {citation.id}
      </span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-popover border border-border rounded-lg shadow-xl text-xs">
          <span className="font-medium block truncate">{citation.title}</span>
          <span className="text-muted-foreground mt-1 block truncate">
            {citation.url}
          </span>
        </span>
      )}
    </span>
  );
}

/* ── Structured battlecard view ───────────────────────────── */

function StructuredBattlecard({
  battlecard,
  onDownloadPdf,
}: {
  battlecard: Battlecard;
  onDownloadPdf?: () => void;
}) {
  const {
    AE_BATTLECARD: ae,
    positioning,
    pricing_posture,
    customer_truths,
    recent_moves,
    citations,
    dataGaps,
  } = battlecard;

  const impactBadge = (impact: string) => {
    if (impact === "high") return <Badge variant="danger">High</Badge>;
    if (impact === "medium") return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="success">Low</Badge>;
  };

  return (
    <div className="space-y-3">
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-white/6 p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06))",
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {battlecard.competitor} Battlecard
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Badge>{ae.competitor_type?.toUpperCase() || "BFSI"}</Badge>
              <span>
                Confidence:{" "}
                <span
                  className={
                    battlecard.confidence.score >= 0.8
                      ? "text-emerald-400 font-semibold"
                      : battlecard.confidence.score >= 0.5
                        ? "text-amber-400 font-semibold"
                        : "text-red-400 font-semibold"
                  }
                >
                  {Math.round(battlecard.confidence.score * 100)}%
                </span>
              </span>
              <span>
                Generated {new Date(battlecard.generatedAt).toLocaleString()}
              </span>
              <span>{battlecard.researchDurationMs}ms</span>
            </div>
          </div>
          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
            >
              <Download size={14} />
              PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Company Overview ───────────────────────────────── */}
      {ae.company_overview && (
        <SectionCard
          icon={<Building2 size={16} />}
          title="Company Overview"
          accentColor="#818cf8"
        >
          <p>{ae.company_overview}</p>
        </SectionCard>
      )}

      {/* ── Category Contrast ───────────────────────────────── */}
      {ae.category_contrast && (
        <SectionCard
          icon={<FileText size={16} />}
          title="Category Contrast"
          accentColor="#a78bfa"
        >
          <p>{ae.category_contrast}</p>
        </SectionCard>
      )}

      {/* ── Positioning ────────────────────────────────────── */}
      {positioning && (
        <SectionCard
          icon={<Target size={16} />}
          title="Positioning"
          accentColor="#f472b6"
        >
          {positioning.tagline && (
            <p className="italic text-foreground/70 mb-3">
              &ldquo;{positioning.tagline}&rdquo;
            </p>
          )}
          {positioning.targetSegments?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Target Segments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {positioning.targetSegments.map((s, i) => (
                  <Badge key={i}>{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {positioning.differentiators?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Differentiators
              </p>
              <ul className="list-none space-y-1">
                {positioning.differentiators.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-pink-400 mt-0.5">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Quick Dismisses ────────────────────────────────── */}
      {ae.quick_dismisses?.length > 0 && (
        <SectionCard
          icon={<Zap size={16} />}
          title="Quick Dismisses"
          accentColor="#fbbf24"
        >
          <ul className="list-none space-y-2">
            {ae.quick_dismisses.slice(0, 2).map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-2 bg-amber-500/5 rounded-lg px-3 py-2"
              >
                <Zap size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Objection Handling ─────────────────────────────── */}
      {ae.objection_handling?.length > 0 && (
        <SectionCard
          icon={<Shield size={16} />}
          title="Objection Handling"
          accentColor="#38bdf8"
        >
          <div className="space-y-4">
            {ae.objection_handling.map((obj, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/5 overflow-hidden"
              >
                <div className="px-4 py-3 bg-sky-500/5">
                  <p className="font-medium text-sky-300 text-xs uppercase tracking-wider mb-1">
                    Objection
                  </p>
                  <p className="italic">&ldquo;{obj.objection}&rdquo;</p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-medium text-emerald-400 text-xs uppercase tracking-wider mb-1">
                    Counter
                  </p>
                  <p>{obj.counter}</p>
                  {obj.evidence?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {obj.evidence.map((e, j) => (
                        <Badge key={j} variant="default">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Why We Win / Lose ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ae.why_we_win?.length > 0 && (
          <SectionCard
            icon={<CheckCircle2 size={16} />}
            title="Why We Win"
            accentColor="#34d399"
          >
            <ul className="list-none space-y-1.5">
              {ae.why_we_win.slice(0, 4).map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 mt-0.5 shrink-0"
                  />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
        {ae.why_we_lose?.length > 0 && (
          <SectionCard
            icon={<AlertTriangle size={16} />}
            title="Why We Lose"
            accentColor="#fb923c"
          >
            <ul className="list-none space-y-1.5">
              {ae.why_we_lose.slice(0, 4).map((l, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle
                    size={14}
                    className="text-orange-400 mt-0.5 shrink-0"
                  />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      {/* ── Pricing ────────────────────────────────────────── */}
      {(ae.pricing_positioning || pricing_posture) && (
        <SectionCard
          icon={<DollarSign size={16} />}
          title="Pricing"
          accentColor="#a3e635"
        >
          {ae.pricing_positioning && (
            <p className="mb-3">{ae.pricing_positioning}</p>
          )}
          {pricing_posture && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-xs">
                {pricing_posture.model && (
                  <span>
                    <span className="text-muted-foreground">Model:</span>{" "}
                    {pricing_posture.model}
                  </span>
                )}
                {pricing_posture.entryPrice && (
                  <span>
                    <span className="text-muted-foreground">Entry:</span>{" "}
                    {pricing_posture.entryPrice}
                  </span>
                )}
                {pricing_posture.opacity && (
                  <span>
                    <span className="text-muted-foreground">Opacity:</span>{" "}
                    <Badge
                      variant={
                        pricing_posture.opacity === "clear"
                          ? "success"
                          : "danger"
                      }
                    >
                      {pricing_posture.opacity === "clear" ? "Clear" : "Opaque"}
                    </Badge>
                  </span>
                )}
              </div>
              {pricing_posture.tiers?.length > 0 && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">
                          Tier
                        </th>
                        <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">
                          Price
                        </th>
                        <th className="text-left py-2 font-semibold text-muted-foreground">
                          Features
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricing_posture.tiers.map((tier, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-2 pr-4 font-medium">{tier.name}</td>
                          <td className="py-2 pr-4 text-lime-400">
                            {tier.price}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {tier.features?.map((f, j) => (
                                <Badge key={j}>{f}</Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Landmines ──────────────────────────────────────── */}
      {ae.landmines?.length > 0 && (
        <SectionCard
          icon={<Bomb size={16} />}
          title="Landmines — Questions to Expose Gaps"
          accentColor="#f87171"
        >
          <ul className="list-none space-y-2">
            {ae.landmines.slice(0, 3).map((l, i) => (
              <li
                key={i}
                className="flex items-start gap-2 bg-red-500/5 rounded-lg px-3 py-2"
              >
                <Bomb size={14} className="text-red-400 mt-0.5 shrink-0" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── FUD Flip ───────────────────────────────────────── */}
      {ae.FUD_responses?.length > 0 && (
        <SectionCard
          icon={<RotateCcw size={16} />}
          title="FUD Flip"
          accentColor="#c084fc"
        >
          <ul className="list-none space-y-1.5">
            {ae.FUD_responses.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <RotateCcw
                  size={14}
                  className="text-purple-400 mt-0.5 shrink-0"
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Proof Points ───────────────────────────────────── */}
      {ae.proof_points?.length > 0 && (
        <SectionCard
          icon={<BarChart3 size={16} />}
          title="Proof Points"
          accentColor="#2dd4bf"
        >
          <ul className="list-none space-y-1.5">
            {ae.proof_points.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <BarChart3
                  size={14}
                  className="text-teal-400 mt-0.5 shrink-0"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Customer Truths ────────────────────────────────── */}
      {customer_truths && (
        <SectionCard
          icon={<Users size={16} />}
          title="Customer Truths"
          accentColor="#60a5fa"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer_truths.positives?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  What customers love
                </p>
                <ul className="list-none space-y-1">
                  {customer_truths.positives.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2
                        size={12}
                        className="text-emerald-400 mt-0.5 shrink-0"
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {customer_truths.negatives?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                  What customers dislike
                </p>
                <ul className="list-none space-y-1">
                  {customer_truths.negatives.slice(0, 3).map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CircleAlert
                        size={12}
                        className="text-red-400 mt-0.5 shrink-0"
                      />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {customer_truths.keyComplaints?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                Key Complaints
              </p>
              <ul className="list-none space-y-1">
                {customer_truths.keyComplaints.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle
                      size={12}
                      className="text-amber-400 mt-0.5 shrink-0"
                    />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Recent Moves ───────────────────────────────────── */}
      {recent_moves?.length > 0 && (
        <SectionCard
          icon={<Newspaper size={16} />}
          title="Recent Moves"
          accentColor="#fb7185"
        >
          <div className="space-y-2">
            {recent_moves.map((move, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 bg-white/2 rounded-lg px-3 py-2"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{move.name}</p>
                  <p className="text-xs text-muted-foreground">{move.date}</p>
                </div>
                {impactBadge(move.impact)}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Push Deal When ─────────────────────────────────── */}
      {ae.compete_aggressively_when?.length > 0 && (
        <SectionCard
          icon={<Rocket size={16} />}
          title="Push Deal When..."
          accentColor="#22d3ee"
        >
          <ul className="list-none space-y-1.5">
            {ae.compete_aggressively_when.slice(0, 4).map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <Rocket size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── VARS Framework ─────────────────────────────────── */}
      {battlecard.VARS_layer && (
        <SectionCard
          icon={<Layers size={16} />}
          title="VARS Framework"
          accentColor="#818cf8"
        >
          <div className="space-y-3">
            {battlecard.VARS_layer.validate && (
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                  Validate
                </p>
                <p>{battlecard.VARS_layer.validate}</p>
              </div>
            )}
            {battlecard.VARS_layer.acknowledge && (
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  Acknowledge
                </p>
                <p>{battlecard.VARS_layer.acknowledge}</p>
              </div>
            )}
            {battlecard.VARS_layer.reframe && (
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                  Reframe
                </p>
                <p>{battlecard.VARS_layer.reframe}</p>
              </div>
            )}
            {battlecard.VARS_layer.specify && (
              <div>
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  Specify
                </p>
                <p>{battlecard.VARS_layer.specify}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Sources ────────────────────────────────────────── */}
      {citations?.length > 0 && (
        <SectionCard
          icon={<BookOpen size={16} />}
          title="Sources"
          accentColor="#94a3b8"
          defaultOpen={false}
        >
          <ul className="list-none space-y-2">
            {citations.map((c, i) => (
              <li key={i} className="text-xs">
                <CitationSource citation={c} />
                <span className="ml-2 text-muted-foreground">
                  {c.title} — {c.source}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Data Gaps ──────────────────────────────────────── */}
      {dataGaps?.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <CircleAlert size={16} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Data Gaps
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dataGaps.map((g, i) => (
              <Badge key={i} variant="warning">
                {g}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────── */

export function BattlecardDisplay({
  markdown,
  battlecard,
  onDownloadPdf,
}: BattlecardDisplayProps) {
  const citations = battlecard?.citations || [];
  const citationMap = new Map(citations.map((c) => [c.id, c]));

  const processedMarkdown = markdown.replace(
    /\[(citation-\d+)\]/g,
    (_match, id) => {
      return `**${id}**`;
    },
  );

  // When the full battlecard is available, render the structured view
  if (battlecard) {
    return (
      <StructuredBattlecard
        battlecard={battlecard}
        onDownloadPdf={onDownloadPdf}
      />
    );
  }

  // During streaming (no battlecard yet), render markdown
  return (
    <div className="space-y-4">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            strong: ({ children, ...props }) => {
              const text = String(children);
              if (text.match(/^citation-\d+$/)) {
                const citation = citationMap.get(text);
                if (citation) {
                  return <CitationSource citation={citation} />;
                }
              }
              return <strong {...props}>{children}</strong>;
            },
          }}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
