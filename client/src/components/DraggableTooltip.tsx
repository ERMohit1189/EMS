import React, { useState, useRef, useEffect } from 'react';
import { TooltipRenderProps } from 'react-joyride';

export default function DraggableTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
  isLastStep,
}: TooltipRenderProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset position and show tooltip when step changes
    setPosition({ x: 0, y: 0 });
    setVisible(true);
  }, [index]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      setVisible(false);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the title bar
    if ((e.target as HTMLElement).closest('.joyride-tooltip-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && tooltipRef.current) {
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const tooltipHeight = tooltipRef.current.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // Keep tooltip within viewport bounds
      newX = Math.max(0, Math.min(newX, viewportWidth - tooltipWidth));
      newY = Math.max(0, Math.min(newY, viewportHeight - tooltipHeight));

      setPosition({
        x: newX,
        y: newY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      {...tooltipProps}
      style={{
        position: 'fixed',
        zIndex: 99999,
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        maxWidth: 450,
        width: 450,
      }}
    >
      <div
        className="joyride-tooltip-header"
        style={{
          cursor: 'grab',
          padding: '12px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
        onMouseDown={handleMouseDown}
      >
        {step.title && (
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: '#1f2937',
              flex: 1,
            }}
          >
            {step.title}
          </h3>
        )}
        <div style={{ fontSize: 12, color: '#6b7280', marginLeft: 12 }}>
          {index + 1} / {size}
        </div>
      </div>

      <div style={{ padding: 20, backgroundColor: '#ffffff' }}>
        {step.content && (
          <div
            style={{
              fontSize: 14,
              lineHeight: '1.6',
              color: '#4b5563',
              marginBottom: 20,
            }}
          >
            {step.content}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {index > 0 && (
              <button
                {...backProps}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 14,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isLastStep && (
              <button
                {...skipProps}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: 14,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                Skip
              </button>
            )}

            {continuous && (
              <button
                {...primaryProps}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  padding: '8px 20px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontWeight: 500,
                }}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </button>
            )}

            {!continuous && (
              <button
                {...closeProps}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  padding: '8px 20px',
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
          padding: '8px 20px',
          paddingTop: 0,
          fontStyle: 'italic',
          backgroundColor: '#ffffff',
        }}
      >
        💡 Tip: Drag from the header to move this tooltip
      </div>
    </div>
  );
}
