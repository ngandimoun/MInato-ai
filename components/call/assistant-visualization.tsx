// components/call/assistant-visualization.tsx
"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AssistantVisualizationProps {
  state:
    | "idle"
    | "listening"
    | "thinking"
    | "speaking"
    | "connecting"
    | "error";
  size: "small" | "large";
}

export function AssistantVisualization({
  state,
  size,
}: AssistantVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getDimensions = () =>
    size === "large" ? 240 : size === "small" ? 100 : 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dimensions = getDimensions();
    canvas.width = dimensions * devicePixelRatio;
    canvas.height = dimensions * devicePixelRatio;
    canvas.style.width = `${dimensions}px`;
    canvas.style.height = `${dimensions}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const centerX = dimensions / 2;
    const centerY = dimensions / 2;
    const maxRadius = dimensions / 2 - (size === "large" ? 10 : 5);
    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      radius: number;
      color: string;
      speed: number;
      angle: number;
      opacity: number;
      growth: number;
    }[] = [];

    const getStateConfig = () => {
      switch (state) {
        case "listening":
          return {
            count: size === "large" ? 20 : 10,
            baseColor: `59, 130, 246`, // Blue
            speedFactor: 0.8,
            pulseFactor: 3,
          };
        case "thinking":
          return {
            count: size === "large" ? 35 : 18,
            baseColor: `245, 158, 11`, // Amber
            speedFactor: 1.2,
            pulseFactor: 0,
          };
        case "speaking":
          return {
            count: size === "large" ? 25 : 12,
            baseColor: `34, 197, 94`, // Green
            speedFactor: 1.0,
            pulseFactor: 4,
          };
        case "connecting":
          return {
            count: size === "large" ? 15 : 8,
            baseColor: `100, 116, 139`, // Slate
            speedFactor: 0.5,
            pulseFactor: 2,
          };
        case "error":
          return {
            count: size === "large" ? 10 : 5,
            baseColor: `239, 68, 68`, // Red
            speedFactor: 0.3,
            pulseFactor: 0,
          };
        case "idle":
        default:
          return {
            count: size === "large" ? 8 : 4,
            baseColor: `148, 163, 184`, // Cool Gray
            speedFactor: 0.3,
            pulseFactor: 1,
          };
      }
    };

    const createParticles = () => {
      particles = [];
      const { count, baseColor } = getStateConfig();
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius * 0.8 + maxRadius * 0.1;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const particleRadius =
          Math.random() * (size === "large" ? 4 : 2) +
          (size === "large" ? 2 : 1);
        const opacity = Math.random() * 0.4 + 0.4;
        const growth = Math.random() * 0.01 - 0.005;
        particles.push({
          x,
          y,
          radius: particleRadius,
          color: `rgba(${baseColor}, ${opacity})`,
          speed: Math.random() * 0.3 + 0.1,
          angle: Math.random() * Math.PI * 2,
          opacity,
          growth,
        });
      }
    };
    createParticles(); 

    const drawBackground = () => {
      const { baseColor } = getStateConfig();
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadius
      );
      gradient.addColorStop(0, `rgba(${baseColor}, 0.1)`);
      gradient.addColorStop(1, `rgba(${baseColor}, 0.0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions, dimensions);
    };

    const animate = () => {
      const currentTime = Date.now();
      ctx.clearRect(0, 0, dimensions, dimensions);
      drawBackground();
      const config = getStateConfig();

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        p.radius += p.growth;
        if (p.radius < 1 || p.radius > (size === "large" ? 8 : 4)) {
          p.growth = -p.growth;
        }

        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const currentAngle = Math.atan2(dy, dx);
        let moveX = 0,
          moveY = 0;

        switch (state) {
          case "idle":
            const newAngleIdle = currentAngle + 0.002 * config.speedFactor;
            moveX = Math.cos(newAngleIdle) * dist - dx;
            moveY = Math.sin(newAngleIdle) * dist - dy;
            break;
          case "listening":
            const pulseListen =
              Math.sin(currentTime / 300) *
              config.pulseFactor *
              (size === "large" ? 1 : 0.5);
            const newDistListen = dist + pulseListen * (dist / maxRadius);
            moveX = Math.cos(currentAngle) * newDistListen - dx;
            moveY = Math.sin(currentAngle) * newDistListen - dy;
            break;
          case "thinking":
            p.angle +=
              Math.sin(currentTime / 800 + p.x * 0.02) *
              0.05 *
              config.speedFactor;
            moveX = Math.cos(p.angle) * p.speed * config.speedFactor;
            moveY = Math.sin(p.angle) * p.speed * config.speedFactor;
            break;
          case "speaking":
            const lowFreq =
              Math.sin(currentTime / 400 + currentAngle * 2) *
              config.pulseFactor *
              0.8;
            const midFreq =
              Math.sin(currentTime / 250 + currentAngle * 4) *
              config.pulseFactor *
              0.6;
            const highFreq =
              Math.sin(currentTime / 150 + currentAngle * 8) *
              config.pulseFactor *
              0.4;
            const distRatio = dist / maxRadius;
            const freqMix =
              lowFreq * (1 - distRatio) +
              midFreq * distRatio * (1 - distRatio) * 4 +
              highFreq * distRatio;
            const newDistSpeak = dist + freqMix * (size === "large" ? 1 : 0.5);
            moveX = Math.cos(currentAngle) * newDistSpeak - dx;
            moveY = Math.sin(currentAngle) * newDistSpeak - dy;
            break;
          case "connecting":
            const pulseConnect =
              Math.sin(currentTime / 600) *
              config.pulseFactor *
              (size === "large" ? 1 : 0.5);
            const newDistConnect = dist + pulseConnect;
            moveX = Math.cos(currentAngle) * newDistConnect - dx;
            moveY = Math.sin(currentAngle) * newDistConnect - dy;
            break;
          case "error":
            moveX = (Math.random() - 0.5) * 0.5 * config.speedFactor;
            moveY = (Math.random() - 0.5) * 0.5 * config.speedFactor;
            break;
        }
        p.x += moveX;
        p.y += moveY;

        const newDist = Math.sqrt(
          Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)
        );
        if (newDist > maxRadius) {
          const normAngle = Math.atan2(p.y - centerY, p.x - centerX);
          p.x = centerX + Math.cos(normAngle) * maxRadius;
          p.y = centerY + Math.sin(normAngle) * maxRadius;
          if (state === "thinking") p.angle += Math.PI;
        }
      });

      const glowRadius =
        maxRadius * (state === "speaking" || state === "listening" ? 0.4 : 0.3);
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        glowRadius
      );
      const glowColor = `rgba(${config.baseColor}, `;
      const pulseGlow =
        ((Math.sin(currentTime / (state === "connecting" ? 800 : 500)) + 1) /
          2) *
          0.1 +
        0.05;
      glowGradient.addColorStop(
        0,
        glowColor + (state === "error" ? 0.15 : pulseGlow) + ")"
      );
      glowGradient.addColorStop(1, glowColor + "0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, size]); 

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-full overflow-hidden backdrop-blur-md bg-background/80 border border-border shadow-lg",
        size === "large" ? "h-60 w-60" : "h-[100px] w-[100px]"
      )}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
}
