import React from 'react'

const PALETTE = [
  ['#e0e7ff', '#3730a3'],
  ['#fce7f3', '#9d174d'],
  ['#dcfce7', '#166534'],
  ['#fef3c7', '#92400e'],
  ['#e0f2fe', '#075985'],
  ['#ede9fe', '#5b21b6'],
]

const colorsFor = (name = '') => PALETTE[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PALETTE.length]

const initials = (name = '?') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?'

const Avatar = ({ name, size = 'md', title }) => {
  const [background, color] = colorsFor(name)
  return (
    <span className={`avatar avatar-${size}`} style={{ background, color }} title={title ?? name} aria-hidden='true'>
      {initials(name)}
    </span>
  )
}

export default Avatar
