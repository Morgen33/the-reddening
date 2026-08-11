"use client";

import { useMemo, useState } from "react";
import { hierarchy, tree } from "d3-hierarchy";
import { useRouter } from "next/navigation";
import { COPY } from "@/lib/copy";

export type BloodNode = {
  id: string;
  handle: string;
  name: string;
  status: string;
  sireId: string | null;
  portraitUrl?: string | null;
};

export type BloodBond = {
  fromId: string;
  toId: string;
  kind: string;
};

type HierarchyDatum = {
  id: string;
  name: string;
  handle: string;
  status: string;
  portraitUrl?: string | null;
  children?: HierarchyDatum[];
};

function buildForest(nodes: BloodNode[]): HierarchyDatum[] {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  for (const n of nodes) {
    if (n.sireId && byId[n.sireId]) {
      const list = childrenMap.get(n.sireId) ?? [];
      list.push(n.id);
      childrenMap.set(n.sireId, list);
    }
  }

  const visiting = new Set<string>();
  const toDatum = (id: string): HierarchyDatum => {
    if (visiting.has(id)) {
      return {
        id: `${id}-cycle`,
        name: byId[id]?.name ?? "?",
        handle: byId[id]?.handle ?? "",
        status: byId[id]?.status ?? "ash",
      };
    }
    visiting.add(id);
    const n = byId[id];
    const kids = (childrenMap.get(id) ?? []).map(toDatum);
    visiting.delete(id);
    return {
      id: n.id,
      name: n.name,
      handle: n.handle,
      status: n.status,
      portraitUrl: n.portraitUrl,
      children: kids.length ? kids : undefined,
    };
  };

  const roots = nodes.filter(
    (n) => !n.sireId || !byId[n.sireId]
  );

  return roots.map((r) => toDatum(r.id));
}

function sagPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + 28;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export function BloodlineTree({
  nodes,
  bonds,
}: {
  nodes: BloodNode[];
  bonds: BloodBond[];
}) {
  const router = useRouter();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [cycleWarning] = useState(false);

  const layout = useMemo(() => {
    const forest = buildForest(nodes);
    const layouts: {
      nodes: { data: HierarchyDatum; x: number; y: number; depth: number }[];
      links: { source: { x: number; y: number; data: HierarchyDatum }; target: { x: number; y: number; data: HierarchyDatum } }[];
    }[] = [];

    let xOffset = 0;
    const padTop = 100;
    for (const root of forest) {
      const h = hierarchy(root);
      const layoutTree = tree<HierarchyDatum>().nodeSize([140, 120]);
      const rooted = layoutTree(h);
      const desc = rooted.descendants();
      const minX = Math.min(...desc.map((d) => d.x));
      const maxX = Math.max(...desc.map((d) => d.x));
      const shift = xOffset - minX + 80;
      layouts.push({
        nodes: desc.map((d) => ({
          data: d.data,
          x: d.x + shift,
          y: d.y + padTop,
          depth: d.depth,
        })),
        links: rooted.links().map((l) => ({
          source: {
            x: l.source.x + shift,
            y: l.source.y + padTop,
            data: l.source.data,
          },
          target: {
            x: l.target.x + shift,
            y: l.target.y + padTop,
            data: l.target.data,
          },
        })),
      });
      xOffset += maxX - minX + 200;
    }
    return layouts;
  }, [nodes]);

  const allLaid = layout.flatMap((l) => l.nodes);
  const width = Math.max(800, ...allLaid.map((n) => n.x + 120));
  const height = Math.max(500, ...allLaid.map((n) => n.y + 140));
  const maxDepth = Math.max(0, ...allLaid.map((n) => n.depth));

  const idSetRelated = useMemo(() => {
    if (!focusId) return null;
    const related = new Set<string>([focusId]);
    // ancestors
    let cur = nodes.find((n) => n.id === focusId);
    while (cur?.sireId) {
      related.add(cur.sireId);
      cur = nodes.find((n) => n.id === cur!.sireId);
    }
    // descendants BFS
    const queue = [focusId];
    while (queue.length) {
      const id = queue.shift()!;
      for (const n of nodes) {
        if (n.sireId === id && !related.has(n.id)) {
          related.add(n.id);
          queue.push(n.id);
        }
      }
    }
    return related;
  }, [focusId, nodes]);

  const lovers = bonds.filter((b) => b.kind === "lover");
  const posById = Object.fromEntries(allLaid.map((n) => [n.data.id, n]));

  return (
    <div className="relative overflow-x-auto overflow-y-visible pb-2">
      {cycleWarning && (
        <p className="mb-4 text-sm text-gilt">
          A cycle was detected in the bloodline and gently unwound.
        </p>
      )}
      <div className="mb-4 font-ledger text-xs tracking-wider text-vellum-dim uppercase">
        Generatio {["I", "II", "III", "IV", "V", "VI"][maxDepth] ?? maxDepth + 1}
      </div>
      <svg
        width={width}
        height={height}
        className="min-w-full overflow-visible"
        role="img"
        aria-label="Bloodline tree"
      >
        {layout.flatMap((l, li) =>
          l.links.map((link, i) => {
            const dim =
              idSetRelated &&
              (!idSetRelated.has(link.source.data.id) ||
                !idSetRelated.has(link.target.data.id));
            return (
              <path
                key={`sire-${li}-${i}`}
                d={sagPath(link.source.x, link.source.y, link.target.x, link.target.y)}
                fill="none"
                stroke="var(--arterial)"
                strokeWidth={2}
                strokeDasharray="6 8"
                className="animate-dash-flow"
                style={{
                  opacity: dim ? 0.12 : 0.85,
                  animation: "dash-flow 2.4s linear infinite",
                }}
              />
            );
          })
        )}

        {lovers.map((b) => {
          const a = posById[b.fromId];
          const c = posById[b.toId];
          if (!a || !c) return null;
          const dim =
            idSetRelated &&
            (!idSetRelated.has(b.fromId) || !idSetRelated.has(b.toId));
          return (
            <line
              key={`lover-${b.fromId}-${b.toId}`}
              x1={a.x}
              y1={a.y}
              x2={c.x}
              y2={c.y}
              stroke="var(--gilt)"
              strokeWidth={2}
              style={{ opacity: dim ? 0.12 : 0.9 }}
            />
          );
        })}

        {allLaid.map((n) => {
          const dim = idSetRelated && !idSetRelated.has(n.data.id);
          const isRoot = !nodes.find((x) => x.id === n.data.id)?.sireId;
          return (
            <g
              key={n.data.id}
              transform={`translate(${n.x}, ${n.y})`}
              opacity={dim ? 0.15 : 1}
              style={{ cursor: "pointer", transition: "opacity 300ms" }}
              onClick={() =>
                setFocusId((id) => (id === n.data.id ? null : n.data.id))
              }
            >
              <ellipse
                rx={42}
                ry={50}
                fill="var(--ash)"
                stroke="var(--gilt)"
                strokeWidth={1.5}
              />
              <text
                textAnchor="middle"
                y={6}
                fill="var(--vellum)"
                style={{ fontFamily: "var(--font-display)", fontSize: 13 }}
              >
                {n.data.name}
              </text>
              {isRoot && (
                <text
                  textAnchor="middle"
                  y={-58}
                  fill="var(--vellum-dim)"
                  style={{ fontFamily: "var(--font-body)", fontSize: 11, fontStyle: "italic" }}
                >
                  {COPY.originUnrecorded}
                </text>
              )}
              <text
                textAnchor="middle"
                y={72}
                fill="var(--gilt)"
                style={{ fontFamily: "var(--font-ledger)", fontSize: 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/cast/${n.data.handle}`);
                }}
              >
                dossier →
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-4 text-center text-sm text-vellum-dim">
        Click a medallion to isolate ancestry and descent. Gold lines are lover
        bonds.
      </p>
    </div>
  );
}
