import React, { useRef, useState, useEffect } from 'react';
import { Icon } from './Icon';

interface SignaturePadProps {
    onSave: (signature: string) => void;
    onClear?: () => void;
    initialSignature?: string;
    label?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear, initialSignature, label }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(!initialSignature);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas to its display size
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            ctx.lineCap = 'round';
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';

            if (initialSignature) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, rect.width, rect.height);
                };
                img.src = initialSignature;
            }
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [initialSignature]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.beginPath(); // Reset path
            onSave(canvas.toDataURL('image/png'));
            setIsEmpty(false);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).clientX - rect.left;
            y = (e as React.MouseEvent).clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
            }
            setIsEmpty(true);
            onSave('');
            if (onClear) onClear();
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-xs text-gray-400 uppercase font-bold">{label}</label>}
            <div className="relative bg-white rounded-lg overflow-hidden border border-gray-300 h-40">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-full touch-none cursor-crosshair"
                />
                {!isEmpty && (
                    <button
                        onClick={clear}
                        className="absolute bottom-2 right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                        title="Limpar"
                    >
                        <Icon name="trash" size={16} />
                    </button>
                )}
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-sm italic">
                        Assine aqui
                    </div>
                )}
            </div>
            <p className="text-[10px] text-gray-500 text-center italic">Use seu dedo ou uma caneta touch para assinar.</p>
        </div>
    );
};
