'use client'

import { useState, useRef } from 'react'

export default function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const [above, setAbove] = useState(true)
  const iconRef = useRef<HTMLSpanElement>(null)

  function handleMouseEnter() {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      // flip to below if less than 160px above the icon
      setAbove(rect.top > 160)
    }
    setVisible(true)
  }

  const arrowUp = {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '5px solid transparent',
    borderBottomColor: '#1e293b',
  }

  const arrowDown = {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '5px solid transparent',
    borderTopColor: '#1e293b',
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        ref={iconRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--border)',
          color: 'var(--text-muted)',
          fontSize: 9,
          fontWeight: 700,
          cursor: 'help',
          userSelect: 'none',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        i
      </span>
      {visible && (
        <span
          style={{
            position: 'absolute',
            ...(above
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: 11,
            lineHeight: 1.55,
            padding: '7px 10px',
            borderRadius: 6,
            whiteSpace: 'pre-wrap',
            maxWidth: 260,
            width: 'max-content',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          }}
        >
          {text}
          <span style={above ? arrowDown : arrowUp} />
        </span>
      )}
    </span>
  )
}
