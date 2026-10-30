import React from 'react'

const PATHS = {
  dashboard: <><rect x='3' y='3' width='7' height='7' rx='1.5' /><rect x='14' y='3' width='7' height='7' rx='1.5' /><rect x='3' y='14' width='7' height='7' rx='1.5' /><rect x='14' y='14' width='7' height='7' rx='1.5' /></>,
  board: <><rect x='3' y='4' width='18' height='16' rx='2' /><path d='M9 4v16M15 4v16' /></>,
  details: <><path d='M7 3h7l5 5v13H7z' /><path d='M14 3v5h5M10 13h6M10 17h6' /></>,
  search: <><circle cx='11' cy='11' r='7' /><path d='m20 20-3.5-3.5' /></>,
  plus: <path d='M12 5v14M5 12h14' />,
  bell: <><path d='M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8' /><path d='M10.3 20a2 2 0 0 0 3.4 0' /></>,
  logout: <><path d='M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' /><path d='M10 17l-5-5 5-5M5 12h11' /></>,
  calendar: <><rect x='3' y='5' width='18' height='16' rx='2' /><path d='M16 3v4M8 3v4M3 10h18' /></>,
  alert: <><path d='M12 3 2 20h20z' /><path d='M12 10v4M12 17.5v.01' /></>,
  check: <><circle cx='12' cy='12' r='9' /><path d='m8 12 3 3 5-6' /></>,
  clock: <><circle cx='12' cy='12' r='9' /><path d='M12 7v5l3 2' /></>,
  gauge: <><path d='M4 18a9 9 0 1 1 16 0' /><path d='m12 14 4-4' /></>,
  users: <><circle cx='9' cy='8' r='3.5' /><path d='M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6' /></>,
  user: <><circle cx='12' cy='8' r='4' /><path d='M4 21a8 8 0 0 1 16 0' /></>,
  list: <path d='M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01' />,
  activity: <path d='M3 12h4l3-8 4 16 3-8h4' />,
  edit: <><path d='M4 20h4L19 9l-4-4L4 16z' /><path d='m13.5 6.5 4 4' /></>,
  trash: <><path d='M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' /></>,
  arrowRight: <path d='M5 12h14M13 6l6 6-6 6' />,
  flag: <><path d='M5 21V4M5 4h11l-2 4 2 4H5' /></>,
  close: <path d='M6 6l12 12M18 6 6 18' />,
  building: <><rect x='4' y='3' width='16' height='18' rx='1.5' /><path d='M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2' /></>,
  filter: <path d='M4 5h16l-6 8v6l-4-2v-4z' />,
  mail: <><rect x='3' y='5' width='18' height='14' rx='2' /><path d='m3.5 7 8.5 6 8.5-6' /></>,
  lock: <><rect x='4.5' y='10.5' width='15' height='10' rx='2' /><path d='M8 10.5V7.5a4 4 0 0 1 8 0v3' /></>,
  eye: <><path d='M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' /><circle cx='12' cy='12' r='3' /></>,
  eyeOff: <><path d='M3 3l18 18M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.7 3.4M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1' /><path d='M9.9 9.9a3 3 0 0 0 4.2 4.2' /></>,
  userOff: <><circle cx='10' cy='8' r='4' /><path d='M2.5 21a7.5 7.5 0 0 1 12-6M16 16l5 5M21 16l-5 5' /></>,
  comment: <path d='M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z' />,
  paperclip: <path d='M20.5 11.5 12 20a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9' />,
  download: <><path d='M12 4v11M7 10l5 5 5-5' /><path d='M5 20h14' /></>,
  archive: <><rect x='3' y='4' width='18' height='5' rx='1.5' /><path d='M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4' /></>,
  restore: <><path d='M3 12a9 9 0 1 0 3-6.7L3 8' /><path d='M3 3v5h5' /></>,
}

const Icon = ({ name, size = 18, className = '' }) => (
  <svg className={`icon ${className}`} width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false'>
    {PATHS[name]}
  </svg>
)

export default Icon
