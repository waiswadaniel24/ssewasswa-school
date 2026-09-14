// FileName: src/components/SignatureCapture.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Canvas-based signature capture with save and clear

import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function SignatureCapture({
    onSave,
    width = 400,
    height = 150,
    label = 'Draw your signature below'
}) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    // FIXED: drawing is stored in a REF, not React state.
    // React state updates are async — setDrawing(true) doesn't take effect
    // until the next render, so draw() would read stale false on first call.
    const drawingRef = useRef(false);

    const [hasContent, setHasContent] = useState(false);
    const [saving, setSaving] = useState(false);

    // ─── Initialize canvas on mount ─────────────────────────────
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw guide line (signature baseline)
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, height - 25);
        ctx.lineTo(width - 20, height - 25);
        ctx.stroke();
        ctx.setLineDash([]);

        // Set drawing style
        ctx.strokeStyle = '#1a237e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctxRef.current = ctx;
    }, [width, height]);

    useEffect(() => {
        initCanvas();
        // No cleanup needed — canvas is destroyed with component
    }, [initCanvas]);

    // ─── Get pointer position relative to canvas ───────────────
    const getPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Scale from display size to canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    // ─── Start drawing ─────────────────────────────────────────
    const startDraw = (e) => {
        e.preventDefault();
        drawingRef.current = true;

        const ctx = ctxRef.current;
        if (!ctx) return;

        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };

    // ─── Draw line ──────────────────────────────────────────────
    const draw = (e) => {
        if (!drawingRef.current) return;
        e.preventDefault();

        const ctx = ctxRef.current;
        if (!ctx) return;

        const p = getPos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (!hasContent) setHasContent(true);
    };

    // ─── Stop drawing ───────────────────────────────────────────
    const stopDraw = () => {
        drawingRef.current = false;
    };

    // ─── Clear canvas ──────────────────────────────────────────
    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;

        // Clear and redraw background + guide line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, height - 25);
        ctx.lineTo(width - 20, height - 25);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#1a237e';
        ctx.lineWidth = 2;

        setHasContent(false);
        drawingRef.current = false;
    };

    // ─── Save signature as PNG data URL ────────────────────────
    const handleSave = () => {
        if (!hasContent) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        setSaving(true);

        try {
            const dataUrl = canvas.toDataURL('image/png');
            if (onSave) onSave(dataUrl);
        } catch (e) {
            console.error('SignatureCapture: failed to export:', e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'inline-block' }}>
            {label && (
                <p style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '6px'
                }}>
                    {label}
                </p>
            )}

            {/* ─── Canvas ─────────────────────────────────────── */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    border: '2px solid #dadce0',
                    borderRadius: '8px',
                    cursor: 'crosshair',
                    touchAction: 'none',  // Prevent scrolling on touch
                    maxWidth: '100%',
                    height: 'auto',
                    background: 'white',
                    display: 'block'
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
            />

            {/* ─── Action Buttons ─────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                    type="button"
                    onClick={clear}
                    disabled={!hasContent}
                    style={{
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid #dadce0',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#5f6368',
                        cursor: !hasContent ? 'not-allowed' : 'pointer',
                        opacity: !hasContent ? 0.5 : 1
                    }}
                >
                    🗑️ Clear
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasContent || saving}
                    style={{
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '6px',
                        background: (hasContent && !saving) ? '#1a73e8' : '#ccc',
                        color: 'white',
                        cursor: (hasContent && !saving) ? 'pointer' : 'not-allowed',
                        boxShadow: (hasContent && !saving) ? '0 2px 4px rgba(26, 115, 232, 0.2)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    {saving ? '⏳ Saving...' : '💾 Save Signature'}
                </button>
            </div>

            {/* ─── Hint ───────────────────────────────────────── */}
            {hasContent && (
                <p style={{
                    fontSize: '11px',
                    color: '#0d904f',
                    marginTop: '6px',
                    margin: '6px 0 0 0'
                }}>
                    ✓ Signature ready to save
                </p>
            )}
        </div>
    );
}