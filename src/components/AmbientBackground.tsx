import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  alphaFactor: number;
  colorTone: "primary" | "muted";
}

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number | null = null;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Mouse tracking for subtle hover repulsion
    const mouse = { x: -1000, y: -1000, active: false };

    // Get current theme palette colors
    const getThemeColors = () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      return isDark
        ? {
            primary: "255, 255, 255", // crisp pure white #ffffff
            muted: "115, 115, 115",   // onyx neutral #737373
            dotAlphaMax: 0.35,
            lineAlphaMax: 0.16,
            maxLineDist: 115,
          }
        : {
            primary: "0, 0, 0",       // pitch black #000000
            muted: "102, 102, 102",   // deep grey #666666
            dotAlphaMax: 0.24,
            lineAlphaMax: 0.10,
            maxLineDist: 110,
          };
    };

    let themeColors = getThemeColors();

    // Listen for theme attribute changes on <html>
    const themeObserver = new MutationObserver(() => {
      themeColors = getThemeColors();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Initialize particles based on screen width
    const initParticles = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Sparse density: ~36 particles on desktop, ~18 on mobile
      const count = width < 640 ? 16 : width < 1024 ? 26 : 38;

      particles = [];
      for (let i = 0; i < count; i++) {
        // Bias distribution slightly toward left & right margins while maintaining coverage
        let x: number;
        if (Math.random() < 0.65) {
          // outer 30% of each side
          x = Math.random() < 0.5 ? Math.random() * (width * 0.32) : width - Math.random() * (width * 0.32);
        } else {
          x = Math.random() * width;
        }

        particles.push({
          x,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18, // ultra slow ambient drift
          vy: (Math.random() - 0.5) * 0.18,
          baseRadius: 1.0 + Math.random() * 0.9,
          alphaFactor: 0.4 + Math.random() * 0.6,
          colorTone: Math.random() < 0.45 ? "primary" : "muted",
        });
      }
    };

    // Calculate center fade: particles in center column are faded to keep card content clean
    const getCenterFade = (x: number) => {
      const centerX = width / 2;
      const distFromCenter = Math.abs(x - centerX);
      const halfWidth = width / 2;
      const normalizedDist = distFromCenter / (halfWidth || 1); // 0 at center, 1 at edge

      // Soft curve: central 600px has ~0.15–0.30 visibility, edges have 1.0 visibility
      if (width < 768) {
        return Math.max(0.2, Math.min(1, normalizedDist * 1.3));
      }
      return Math.max(0.12, Math.min(1, Math.pow(normalizedDist, 1.3) * 1.25));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connecting lines
      const maxDist = themeColors.maxLineDist;
      const pLen = particles.length;

      for (let i = 0; i < pLen; i++) {
        const p1 = particles[i];
        const fade1 = getCenterFade(p1.x);

        for (let j = i + 1; j < pLen; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const fade2 = getCenterFade(p2.x);
            const combinedFade = Math.min(fade1, fade2);
            const proximity = 1 - dist / maxDist;
            const lineAlpha = proximity * proximity * themeColors.lineAlphaMax * combinedFade;

            if (lineAlpha > 0.005) {
              const colorStr = p1.colorTone === "primary" || p2.colorTone === "primary" ? themeColors.primary : themeColors.muted;
              ctx.beginPath();
              ctx.strokeStyle = `rgba(${colorStr}, ${lineAlpha})`;
              ctx.lineWidth = 0.85;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Draw dots and update particle positions
      for (let i = 0; i < pLen; i++) {
        const p = particles[i];
        const centerFade = getCenterFade(p.x);
        const finalAlpha = p.alphaFactor * themeColors.dotAlphaMax * centerFade;

        // Draw dot
        const colorStr = p.colorTone === "primary" ? themeColors.primary : themeColors.muted;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorStr}, ${finalAlpha})`;
        ctx.fill();

        // If reduced motion, do not drift
        if (!isReducedMotion) {
          // Mouse interaction (subtle gentle repulsion)
          if (mouse.active) {
            const mdx = p.x - mouse.x;
            const mdy = p.y - mouse.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < 120 && mDist > 0) {
              const force = (1 - mDist / 120) * 0.4;
              p.x += (mdx / mDist) * force;
              p.y += (mdy / mDist) * force;
            }
          }

          // Gentle ambient drift
          p.x += p.vx;
          p.y += p.vy;

          // Boundary wrapping with margin
          if (p.x < -20) p.x = width + 20;
          else if (p.x > width + 20) p.x = -20;

          if (p.y < -20) p.y = height + 20;
          else if (p.y > height + 20) p.y = -20;
        }
      }
    };

    const loop = () => {
      draw();
      if (!isReducedMotion) {
        animId = requestAnimationFrame(loop);
      }
    };

    // Initialize and run
    initParticles();
    loop();

    // Event listeners
    const handleResize = () => {
      initParticles();
      if (isReducedMotion) draw();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
      } else {
        if (!isReducedMotion) {
          animId = requestAnimationFrame(loop);
        } else {
          draw();
        }
      }
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
      if (!isReducedMotion && !animId) {
        animId = requestAnimationFrame(loop);
      } else if (isReducedMotion && animId) {
        cancelAnimationFrame(animId);
        draw();
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      themeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
