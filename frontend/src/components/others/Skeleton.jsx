import React from 'react'

// Placeholder shape shown while data loads. variant: 'text' | 'block' | 'circle' | 'pill'.
// Hidden from assistive tech: put aria-busy and a "Loading…" label on the container instead.
const Skeleton = ({ variant = 'text', width, height, className = '' }) => (
  <span aria-hidden='true' className={`skeleton skeleton-${variant} ${className}`.trim()} style={{ width, height }} />
)

// A paragraph of text lines; the last one is shorter.
export const SkeletonText = ({ lines = 2, lastWidth = '60%', height }) => (
  <span className='skeleton-lines' aria-hidden='true'>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton key={index} height={height} width={index === lines - 1 && lines > 1 ? lastWidth : '100%'} />
    ))}
  </span>
)

export default Skeleton
