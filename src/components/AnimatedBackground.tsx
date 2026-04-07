import { useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  pulse: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: -Math.random() * 0.2 - 0.05,
          opacity: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    };

    interface Blob {
      x: number; y: number; vx: number; vy: number;
      radius: number; color: number[]; color2: number[];
    }

    const isDark = theme === 'dark';

    const blobs: Blob[] = isDark
      ? [
          { x: canvas.width * 0.3, y: canvas.height * 0.3, vx: 0.4, vy: 0.3, radius: 180, color: [0, 119, 255, 0.2], color2: [0, 80, 200, 0.06] },
          { x: canvas.width * 0.7, y: canvas.height * 0.5, vx: -0.3, vy: 0.35, radius: 160, color: [137, 207, 240, 0.18], color2: [100, 170, 220, 0.05] },
          { x: canvas.width * 0.5, y: canvas.height * 0.7, vx: 0.35, vy: -0.25, radius: 140, color: [220, 20, 60, 0.12], color2: [180, 15, 50, 0.04] },
          { x: canvas.width * 0.2, y: canvas.height * 0.8, vx: -0.25, vy: -0.3, radius: 120, color: [0, 80, 180, 0.15], color2: [0, 50, 150, 0.04] },
          { x: canvas.width * 0.8, y: canvas.height * 0.2, vx: 0.2, vy: 0.4, radius: 150, color: [60, 160, 255, 0.14], color2: [40, 120, 220, 0.04] },
        ]
      : [
          { x: canvas.width * 0.3, y: canvas.height * 0.3, vx: 0.4, vy: 0.3, radius: 220, color: [0, 119, 255, 0.18], color2: [0, 80, 200, 0.06] },
          { x: canvas.width * 0.7, y: canvas.height * 0.5, vx: -0.3, vy: 0.35, radius: 200, color: [137, 207, 240, 0.16], color2: [100, 170, 220, 0.05] },
          { x: canvas.width * 0.5, y: canvas.height * 0.7, vx: 0.35, vy: -0.25, radius: 180, color: [180, 140, 255, 0.14], color2: [140, 100, 220, 0.04] },
          { x: canvas.width * 0.2, y: canvas.height * 0.8, vx: -0.25, vy: -0.3, radius: 160, color: [0, 80, 180, 0.14], color2: [0, 50, 150, 0.04] },
          { x: canvas.width * 0.8, y: canvas.height * 0.2, vx: 0.2, vy: 0.4, radius: 190, color: [60, 160, 255, 0.15], color2: [40, 120, 220, 0.05] },
        ];

    const drawBlobs = () => {
      const w = canvas.width;
      const h = canvas.height;
      blobs.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.radius) b.vx = Math.abs(b.vx);
        if (b.x > w + b.radius) b.vx = -Math.abs(b.vx);
        if (b.y < -b.radius) b.vy = Math.abs(b.vy);
        if (b.y > h + b.radius) b.vy = -Math.abs(b.vy);

        const pulseR = b.radius + Math.sin(time * 0.008 + b.x * 0.001) * 30;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pulseR);
        g.addColorStop(0, `rgba(${b.color.join(',')})`);
        g.addColorStop(0.5, `rgba(${b.color2.join(',')})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    };

    const drawParticles = () => {
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.02;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        const alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${alpha * 0.1})`
          : `rgba(0, 80, 200, ${alpha * 0.12})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${alpha})`
          : `rgba(0, 100, 220, ${alpha * 0.6})`;
        ctx.fill();
      });
    };

    const drawMesh = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cols = 28;
      const rows = 16;
      const cellW = w / cols;
      const cellH = h / rows;

      ctx.lineWidth = isDark ? 0.5 : 0.8;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellW;
          const y = row * cellH;

          const offsetX = Math.sin(time * 0.002 + row * 0.3 + col * 0.2) * 8;
          const offsetY = Math.cos(time * 0.0015 + col * 0.25 + row * 0.15) * 8;

          const px = x + offsetX;
          const py = y + offsetY;

          const dist = Math.sqrt((px - w / 2) ** 2 + (py - h / 2) ** 2);
          const maxDist = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
          const alpha = isDark
            ? 0.06 + 0.06 * (1 - dist / maxDist)
            : 0.1 + 0.1 * (1 - dist / maxDist);

          const hue = (col * 4 + row * 6 + time * 0.1) % 360;
          const sat = isDark ? 70 : 70;
          const lum = isDark ? 55 : 45;

          // Horizontal line
          if (col < cols - 1) {
            const nx = (col + 1) * cellW + Math.sin(time * 0.002 + row * 0.3 + (col + 1) * 0.2) * 8;
            const ny = row * cellH + Math.cos(time * 0.0015 + (col + 1) * 0.25 + row * 0.15) * 8;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${alpha})`;
            ctx.stroke();
          }

          // Vertical line
          if (row < rows - 1) {
            const nx = col * cellW + Math.sin(time * 0.002 + (row + 1) * 0.3 + col * 0.2) * 8;
            const ny = (row + 1) * cellH + Math.cos(time * 0.0015 + col * 0.25 + (row + 1) * 0.15) * 8;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${alpha})`;
            ctx.stroke();
          }

          // Node dot
          ctx.beginPath();
          ctx.arc(px, py, isDark ? 1.2 : 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${alpha + (isDark ? 0.05 : 0.08)})`;
          ctx.fill();
        }
      }
    };

    const animate = () => {
      time++;
      ctx.fillStyle = isDark ? '#060611' : '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawBlobs();
      drawMesh();
      drawParticles();
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    const handleResize = () => { resize(); createParticles(); };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', handleResize); };
  }, [theme]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }} />;
}
