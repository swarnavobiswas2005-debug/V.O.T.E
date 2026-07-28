import React, { useEffect, useState } from 'react';

interface CustomCursorProps {
  ghostMode?: boolean;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ ghostMode = false }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number }[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('button') ||
          target.closest('a') ||
          target.closest('.clickable') ||
          target.getAttribute('role') === 'button' ||
          target.getAttribute('data-hover') === 'expand')
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (ghostMode) return;
      const id = `${Date.now()}-${Math.random()}`;
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Remove ripples after 500ms animation
  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples(prev => prev.slice(1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  return (
    <>
      <div
        className={`custom-cursor-outer ${hovered ? 'custom-cursor-hover-outer' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      />
      <div
        className={`custom-cursor-inner ${hovered ? 'custom-cursor-hover-inner' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      />
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="click-ripple"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
          }}
        />
      ))}
    </>
  );
};
