/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { useLayoutEffect, useRef } from "react";

import { MessageListProps } from "./types";

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  atBottom: boolean;
}

function collectMetrics(element: HTMLDivElement): ScrollMetrics {
  const atBottom =
    Math.abs(
      element.scrollHeight - (element.scrollTop + element.clientHeight),
    ) <= 1;

  return {
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    atBottom,
  };
}

function scrollToBottom(element: HTMLDivElement) {
  if (typeof element.scrollTo === "function") {
    element.scrollTo({ top: element.scrollHeight, behavior: "auto" });
  } else {
    element.scrollTop = element.scrollHeight;
  }
}

export function MessageList({
  children,
  loading = false,
  loadingMore = false,
  onYReachStart,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const metricsRef = useRef<ScrollMetrics | null>(null);
  const mountedRef = useRef(false);
  const reachedStartRef = useRef(false);
  const handleScroll = () => {
    const element = containerRef.current;

    if (!element) return;

    metricsRef.current = collectMetrics(element);

    const isScrollable = element.scrollHeight > element.clientHeight + 1;

    if (element.scrollTop <= 0 && isScrollable) {
      if (!reachedStartRef.current) {
        reachedStartRef.current = true;
        onYReachStart?.(element);
      }
    } else {
      reachedStartRef.current = false;
    }
  };

  useLayoutEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      scrollToBottom(element);
      metricsRef.current = collectMetrics(element);

      return;
    }

    const previousMetrics = metricsRef.current || collectMetrics(element);
    const heightDelta = element.scrollHeight - previousMetrics.scrollHeight;

    if (heightDelta !== 0) {
      if (previousMetrics.atBottom) {
        scrollToBottom(element);
      } else if (previousMetrics.scrollTop <= 1 && heightDelta > 0) {
        element.scrollTop = previousMetrics.scrollTop + heightDelta;
      }
    }

    metricsRef.current = collectMetrics(element);
  }, [children, loading, loadingMore]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        minHeight: "1.25em",
        position: "relative",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      {loadingMore && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            display: "flex",
            justifyContent: "center",
            py: 0.2,
            bgcolor: "background.paper",
          }}
        >
          <CircularProgress size={18} thickness={5} />
        </Box>
      )}

      {loading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (theme) =>
              alpha(
                theme.palette.background.paper,
                theme.palette.mode === "dark" ? 0.55 : 0.65,
              ),
            backdropFilter: "blur(1px)",
          }}
        >
          <CircularProgress size={28} thickness={5} />
        </Box>
      )}

      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: 1.5,
          py: 0.5,
          overscrollBehaviorY: "none",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
