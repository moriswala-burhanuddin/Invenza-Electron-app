import React, { useEffect, useRef, useCallback } from 'react';

export const CursorCanvas = ({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const particlesRef = useRef<{ x: number; y: number; baseX: number; baseY: number; vx: number; vy: number; size: number; opacity: number; hue: number }[]>([]);
  const animationRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: typeof particlesRef.current = [];
    const cols = Math.floor(width / 32);
    const rows = Math.floor(height / 32);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * 32 + (Math.random() - 0.5) * 8;
        const y = (row + 0.5) * 32 + (Math.random() - 0.5) * 8;
        particles.push({
          x, y,
          baseX: x,
          baseY: y,
          vx: 0, vy: 0,
          size: 1 + Math.random() * 1.5,
          opacity: 0.06 + Math.random() * 0.1,
          hue: 200 + Math.random() * 20,  // brand blue range
        });
      }
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
      mouseRef.current.active = true;
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    const w = () => canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const h = () => canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

    const animate = () => {
      if (!ctx || !canvas) return;
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);
      
      const mouse = mouseRef.current;
      
      // Smooth interpolation of mouse position
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;
      
      const particles = particlesRef.current;
      
      // Draw a subtle radial glow around cursor
      if (mouse.active) {
        const isDark = document.documentElement.classList.contains('dark');
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 450);
        if (isDark) {
          gradient.addColorStop(0, 'rgba(0, 113, 227, 0.25)'); // Softer center
          gradient.addColorStop(0.3, 'rgba(0, 113, 227, 0.08)');
          gradient.addColorStop(0.7, 'rgba(0, 113, 227, 0.01)');
          gradient.addColorStop(1, 'rgba(0, 113, 227, 0)');
        } else {
          gradient.addColorStop(0, 'rgba(0, 113, 227, 0.08)'); // Very soft for light mode
          gradient.addColorStop(0.3, 'rgba(0, 113, 227, 0.02)');
          gradient.addColorStop(0.7, 'rgba(0, 113, 227, 0.005)');
          gradient.addColorStop(1, 'rgba(0, 113, 227, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cw, ch);
      }
      
      for (const p of particles) {
        let extraBrightness = 0;
        
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 220;
          
          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            extraBrightness = force * 0.8;
            
            // Gentle push away from cursor
            const angle = Math.atan2(dy, dx);
            p.vx -= Math.cos(angle) * force * 1.2;
            p.vy -= Math.sin(angle) * force * 1.2;
          }
        }
        
        // Spring back to base position
        const dx = p.baseX - p.x;
        const dy = p.baseY - p.y;
        p.vx += dx * 0.025;
        p.vy += dy * 0.025;
        
        // Damping
        p.vx *= 0.9;
        p.vy *= 0.9;
        
        p.x += p.vx;
        p.y += p.vy;
        
        // Draw particle
        const isDark = document.documentElement.classList.contains('dark');
        const finalOpacity = Math.min(p.opacity + extraBrightness, 1) * (isDark ? 1 : 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + extraBrightness * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, ${45 + extraBrightness * 30}%, ${finalOpacity})`;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [containerRef, initParticles]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};
