import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChartContainerSize = {
  width: number;
  height: number;
};

interface ResponsiveChartBoxProps {
  className?: string;
  role?: string;
  "aria-label"?: string;
  children: (size: ChartContainerSize) => ReactNode;
}

/** Contenedor con tamaño medido; evita warnings de Recharts con width/height -1. */
export function ResponsiveChartBox({
  className,
  role = "img",
  "aria-label": ariaLabel,
  children,
}: ResponsiveChartBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) {
        return;
      }
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const ready = size.width > 0 && size.height > 0;

  return (
    <div
      ref={ref}
      role={role}
      aria-label={ariaLabel}
      className={cn("w-full min-w-0 min-h-0 shrink-0", className)}
    >
      {ready ? children(size) : null}
    </div>
  );
}
