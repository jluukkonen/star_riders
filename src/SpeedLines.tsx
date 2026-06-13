import React, { useEffect, useRef } from 'react';

export const SpeedLines = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const linesRef = useRef<{ angle: number, dist: number, speed: number, length: number, width: number }[]>([]);
    const opacityRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let reqId: number;

        const populateLines = () => {
            const lines = linesRef.current;
            while (lines.length < 150) {
                lines.push({
                    angle: Math.random() * Math.PI * 2,
                    dist: Math.random() * window.innerWidth,
                    speed: 20 + Math.random() * 40,
                    length: 100 + Math.random() * 200,
                    width: 1 + Math.random() * 3
                });
            }
        };

        const render = () => {
            reqId = requestAnimationFrame(render);

            // Update size
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            const currentSpeed = (window as any)._currentSpeed || 3.0;
            const targetOpacity = currentSpeed > 3.5 ? Math.min(1.0, (currentSpeed - 3.5) / 5.0) : 0;
            opacityRef.current += (targetOpacity - opacityRef.current) * 0.15;

            if (opacityRef.current < 0.01) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = opacityRef.current;
            ctx.lineCap = 'round';

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            populateLines();

            const lines = linesRef.current;
            const maxRadius = Math.max(canvas.width, canvas.height) * 1.5;

            for (let i = lines.length - 1; i >= 0; i--) {
                const l = lines[i];
                l.dist += l.speed;
                
                if (l.dist > maxRadius) {
                    lines.splice(i, 1);
                    continue;
                }

                // Inner deadzone so lines don't draw over the character as much
                const minRadius = Math.min(canvas.width, canvas.height) * 0.15;
                if (l.dist + l.length < minRadius) {
                    continue; // completely behind the character
                }

                const actualDist = Math.max(l.dist, minRadius);
                const actualLength = l.length - (actualDist - l.dist);

                if (actualLength <= 0) continue;

                const x1 = cx + Math.cos(l.angle) * actualDist;
                const y1 = cy + Math.sin(l.angle) * actualDist;
                
                const x2 = cx + Math.cos(l.angle) * (actualDist + actualLength);
                const y2 = cy + Math.sin(l.angle) * (actualDist + actualLength);

                ctx.lineWidth = l.width;
                // Fade lines in from center
                ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, actualDist / 200)})`; 
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        };

        render();

        return () => cancelAnimationFrame(reqId);
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="pointer-events-none fixed inset-0 z-10 w-full h-full mix-blend-screen"
        />
    );
};
