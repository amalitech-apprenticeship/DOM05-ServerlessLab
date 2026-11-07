import React from 'react'
import Skeleton, { SkeletonText } from './Skeleton'

// Loading layouts built from the real layout classes, so content doesn't jump when it arrives.

const range = (count) => Array.from({ length: count }, (_, index) => index)

const Busy = ({ label, className = 'skeleton-stack', children }) => (
  <div className={className} aria-busy='true'>
    <span className='sr-only' role='status'>{label}</span>
    {children}
  </div>
)

// Neutral, centered: shown before we know whether the user is signed in.
export const SessionSkeleton = () => (
  <Busy label='Loading…' className='page-loading'>
    <div className='session-skeleton'>
      <Skeleton variant='circle' width={48} height={48} />
      <Skeleton width={180} height={14} />
      <Skeleton width={120} height={10} />
    </div>
  </Busy>
)

const HeroSkeleton = () => (
  <section className='card hero'>
    <div>
      <Skeleton width={190} height={12} />
      <div className='mt-3'><SkeletonText lines={2} height={30} lastWidth='45%' /></div>
      <div className='mt-3'><Skeleton width='70%' height={14} /></div>
    </div>
    <div className='hero-actions'>
      <Skeleton variant='block' width={120} height={40} />
      <Skeleton variant='block' width={150} height={40} />
    </div>
  </section>
)

export const StatCardSkeleton = () => (
  <div className='card stat-card'>
    <div className='stat-head'>
      <Skeleton width={110} height={12} />
      <Skeleton variant='block' width={38} height={38} />
    </div>
    <div className='stat-value'><Skeleton variant='block' width={64} height={34} /></div>
    <div className='stat-foot'><Skeleton width='70%' height={12} /></div>
  </div>
)

const PanelSkeleton = ({ rows = 4 }) => (
  <section className='card panel'>
    <div className='panel-head'>
      <div style={{ flex: 1 }}>
        <Skeleton width='40%' height={20} />
        <div className='mt-2'><Skeleton width='65%' height={12} /></div>
      </div>
    </div>
    {range(rows).map((index) => (
      <div key={index} className='skeleton-row'>
        <Skeleton variant='circle' width={30} height={30} />
        <div style={{ flex: 1 }}><SkeletonText lines={2} height={11} lastWidth='45%' /></div>
      </div>
    ))}
  </section>
)

// Rows for the team workload list (rendered inside its <ul>).
export const WorkloadRowsSkeleton = ({ rows = 3 }) => range(rows).map((index) => (
  <li key={index} aria-hidden='true'>
    <div className='workload-row'>
      <Skeleton variant='circle' width={38} height={38} />
      <div className='workload-name'><Skeleton width='45%' height={14} /><Skeleton width='80%' height={11} /></div>
      <div className='workload-stats'><Skeleton width={70} height={12} /><Skeleton width={34} height={14} /></div>
    </div>
    <Skeleton variant='pill' height={8} />
  </li>
))

export const DashboardSkeleton = ({ admin }) => (
  <Busy label='Loading dashboard…'>
    <HeroSkeleton />
    <div className='stat-grid'>{range(4).map((index) => <StatCardSkeleton key={index} />)}</div>
    {admin ? (
      <>
        <div className='grid-main'><PanelSkeleton /><PanelSkeleton /></div>
        <div className='grid-main'><PanelSkeleton rows={3} /><PanelSkeleton rows={3} /></div>
      </>
    ) : <PanelSkeleton rows={3} />}
  </Busy>
)

const PageHeadSkeleton = ({ pills = 2, action = true }) => (
  <div className='page-head'>
    <div>
      <Skeleton width={150} height={12} />
      <div className='mt-2'><Skeleton width={260} height={34} /></div>
      {pills > 0 && <div className='chip-row mt-3'>{range(pills).map((index) => <Skeleton key={index} variant='pill' width={84} height={26} />)}</div>}
    </div>
    {action && <div className='page-actions'><Skeleton variant='block' width={150} height={40} /></div>}
  </div>
)

const TaskCardSkeleton = () => (
  <div className='kcard'>
    <div className='kcard-top'>
      <span className='kcard-tags'><Skeleton variant='pill' width={64} height={20} /><Skeleton variant='pill' width={52} height={20} /></span>
    </div>
    <Skeleton width='85%' height={15} />
    <SkeletonText lines={2} height={11} lastWidth='55%' />
    <div className='kcard-foot'>
      <Skeleton width={80} height={11} />
      <Skeleton variant='circle' width={26} height={26} />
    </div>
  </div>
)

export const BoardSkeleton = () => (
  <Busy label='Loading tasks…'>
    <PageHeadSkeleton />
    <div className='card filter-bar'>
      {range(3).map((index) => <Skeleton key={index} variant='block' width={160} height={34} />)}
    </div>
    <div className='kanban'>
      {range(5).map((column) => (
        <div key={column} className='kanban-col'>
          <div className='kanban-head'>
            <Skeleton variant='circle' width={8} height={8} />
            <Skeleton width={90} height={16} />
          </div>
          {range(column < 3 ? 2 : 1).map((index) => <TaskCardSkeleton key={index} />)}
        </div>
      ))}
    </div>
  </Busy>
)

export const DetailsSkeleton = () => (
  <Busy label='Loading task…'>
    <div className='page-head'><Skeleton width={220} height={12} /></div>
    <div className='details-layout'>
      <div className='card details-main'>
        <div className='details-meta'><Skeleton variant='pill' width={140} height={24} /><Skeleton width={150} height={12} /></div>
        <div className='mt-3'><Skeleton width='70%' height={32} /></div>
        <div className='details-section'><Skeleton width={110} height={15} /></div>
        <SkeletonText lines={4} height={13} />
        <div className='details-section'><Skeleton width={90} height={15} /></div>
        <SkeletonText lines={3} height={13} lastWidth='40%' />
      </div>
      <div className='details-side'>
        <div className='card side-card'>
          <Skeleton width={70} height={11} />
          <Skeleton variant='block' height={40} />
          <div className='side-divider' />
          <Skeleton width={80} height={11} />
          <div className='skeleton-row'><Skeleton variant='circle' width={38} height={38} /><Skeleton width='50%' height={14} /></div>
          <div className='side-divider' />
          {range(4).map((index) => <Skeleton key={index} height={13} />)}
        </div>
        <div className='card side-card'>
          <Skeleton width={120} height={11} />
          {range(2).map((index) => <Skeleton key={index} variant='block' height={38} />)}
        </div>
      </div>
    </div>
  </Busy>
)

// Rows shaped like a notification (icon, title, message, time).
export const NotificationRowsSkeleton = ({ rows = 3, className = 'notif-item' }) => range(rows).map((index) => (
  <li key={index} className={className} aria-hidden='true'>
    <Skeleton variant='circle' width={32} height={32} />
    <span className='notif-body'>
      <Skeleton width='45%' height={13} />
      <Skeleton width='90%' height={12} />
      <Skeleton width={90} height={10} />
    </span>
  </li>
))

export const NotificationGroupSkeleton = () => (
  <section className='card notif-group' aria-busy='true'>
    <span className='sr-only' role='status'>Loading notifications…</span>
    <div className='notif-group-title'><Skeleton width={70} height={11} /></div>
    <ul><NotificationRowsSkeleton rows={4} className='notif-row' /></ul>
  </section>
)

export const NotificationsSkeleton = () => (
  <Busy label='Loading notifications…'>
    <PageHeadSkeleton pills={0} />
    <div className='card filter-bar'>
      <Skeleton variant='block' width={150} height={34} />
      <div className='chip-row'>{range(4).map((index) => <Skeleton key={index} variant='pill' width={84} height={30} />)}</div>
    </div>
    <section className='card notif-group'>
      <div className='notif-group-title'><Skeleton width={70} height={11} /></div>
      <ul><NotificationRowsSkeleton rows={4} className='notif-row' /></ul>
    </section>
  </Busy>
)

// Table rows for the team members table (6 columns).
export const MemberRowsSkeleton = ({ rows = 5 }) => range(rows).map((index) => (
  <tr key={index} aria-hidden='true'>
    <td><span className='kcard-assignee'><Skeleton variant='circle' width={38} height={38} /><Skeleton width={120} height={14} /></span></td>
    <td><Skeleton width={170} height={12} /></td>
    <td><Skeleton width={24} height={12} /></td>
    <td><Skeleton width={24} height={12} /></td>
    <td><Skeleton width={120} height={12} /></td>
    <td><Skeleton variant='block' width={110} height={30} /></td>
  </tr>
))

// Skeleton for whichever dashboard view is open while tasks load.
export const ViewSkeleton = ({ view, admin }) => {
  if (view === 'board') return <BoardSkeleton />
  if (view === 'details') return <DetailsSkeleton />
  if (view === 'notifications') return <NotificationsSkeleton />
  return <DashboardSkeleton admin={admin} />
}
