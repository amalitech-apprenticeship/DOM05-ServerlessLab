import React, { useId } from 'react'

export const APP_NAME = 'Orvia'

// Same artwork as public/favicon.svg.
export const LogoMark = ({ size = 36, className = '' }) => {
  const gradientId = useId()
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox='0 0 40 40' aria-hidden='true' focusable='false'>
      <defs>
        <linearGradient id={gradientId} x1='0' y1='0' x2='40' y2='40' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#6366F1' />
          <stop offset='1' stopColor='#7C3AED' />
        </linearGradient>
      </defs>
      <rect width='40' height='40' rx='11' fill={`url(#${gradientId})`} />
      <path d='M28.43 12.93A11 11 0 1 0 31 20' fill='none' stroke='#fff' strokeWidth='3.2' strokeLinecap='round' />
      <path d='M14.6 20.4l4 4 7.6-8.4' fill='none' stroke='#fff' strokeWidth='3.2' strokeLinecap='round' strokeLinejoin='round' />
      <circle cx='30.4' cy='16.2' r='2.5' fill='#A5F3FC' />
    </svg>
  )
}

export const Brand = ({ tagline, inverse = false, size = 36 }) => (
  <div className={`brand ${inverse ? 'brand-inverse' : ''}`}>
    <LogoMark size={size} />
    <div>
      <strong className='brand-name'>{APP_NAME}</strong>
      {tagline && <span className='brand-tagline'>{tagline}</span>}
    </div>
  </div>
)
