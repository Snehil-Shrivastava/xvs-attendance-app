// hooks/useExpandedOverlay.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarDay } from "@/lib/calendarGrid";
import type { DayDetails } from "@/lib/calendarStatus";

export interface ExpandedOverlayConfig {
  day: CalendarDay;
  details: DayDetails;
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  isBottom: boolean;
  isRight: boolean;
}

export interface UseExpandedOverlayReturn {
  expandedDateStr: string | null;
  toggleDay: (day: CalendarDay) => void;
  collapse: () => void;
  overlayConfig: ExpandedOverlayConfig | null;
}

export function useExpandedOverlay(
  calendarDays: CalendarDay[],
  detailsFor: (day: CalendarDay) => DayDetails,
  currentMonthStr: string,
): UseExpandedOverlayReturn {
  const [expandedDateStr, setExpandedDateStr] = useState<string | null>(null);

  // Collapse when the month changes
  useEffect(() => {
    setExpandedDateStr(null);
  }, [currentMonthStr]);

  const toggleDay = (day: CalendarDay) => {
    if (!day.isCurrentMonth || !day.dateString) return;
    setExpandedDateStr((prev) =>
      prev === day.dateString ? null : day.dateString,
    );
  };

  const collapse = () => setExpandedDateStr(null);

  const overlayConfig = useMemo<ExpandedOverlayConfig | null>(() => {
    if (!expandedDateStr) return null;

    const idx = calendarDays.findIndex((d) => d.dateString === expandedDateStr);
    if (idx === -1) return null;

    const day = calendarDays[idx];
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    const totalRows = Math.ceil(calendarDays.length / 7);

    let leftCol = col;
    if (col === 6) {
      leftCol = 5;
    }

    let topRow = row - 1;
    let bottomRow = row;
    if (row === 0) {
      topRow = 0;
      bottomRow = 1;
    }

    const isBottom = row === bottomRow;
    const isRight = col === leftCol + 1;

    return {
      day,
      details: detailsFor(day),
      topPercent: (topRow / totalRows) * 100,
      leftPercent: (leftCol / 7) * 100,
      widthPercent: (2 / 7) * 100,
      heightPercent: (2 / totalRows) * 100,
      isBottom,
      isRight,
    };
  }, [expandedDateStr, calendarDays, detailsFor]);

  return { expandedDateStr, toggleDay, collapse, overlayConfig };
}
