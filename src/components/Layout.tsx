import { Outlet, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"
          stroke={active ? '#3A2E28' : '#C4A882'}
          strokeWidth={active ? 2 : 1.5}
          fill={active ? '#F2C4B0' : 'none'}
        />
        <path
          d="M9 21V12h6v9"
          stroke={active ? '#3A2E28' : '#C4A882'}
          strokeWidth={active ? 2 : 1.5}
        />
      </svg>
    ),
  },
  {
    to: '/library',
    label: 'Library',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="2" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} fill={active ? '#F2C4B0' : 'none'} />
        <rect x="14" y="3" width="7" height="7" rx="2" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} fill={active ? '#F2C4B0' : 'none'} />
        <rect x="3" y="14" width="7" height="7" rx="2" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} fill={active ? '#F2C4B0' : 'none'} />
        <rect x="14" y="14" width="7" height="7" rx="2" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} fill={active ? '#F2C4B0' : 'none'} />
      </svg>
    ),
  },
  {
    to: '/builder',
    label: 'Build',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} fill={active ? '#F2C4B0' : 'none'} />
        <path d="M12 8v4l3 3" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/progress',
    label: 'Progress',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V12" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
        <path d="M9 20V8" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
        <path d="M14 20V14" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
        <path d="M19 20V5" stroke={active ? '#3A2E28' : '#C4A882'} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh', background: '#FAF7F2', overflow: 'hidden' }}>
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 'max(44px, env(safe-area-inset-top))',
          paddingBottom: 80,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          background: 'rgba(250,247,242,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(196,168,130,0.2)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: 8 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={{ textDecoration: 'none', flex: 1 }}
            >
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '6px 0',
                    cursor: 'pointer',
                  }}
                >
                  {item.icon(isActive)}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#3A2E28' : '#C4A882',
                      fontFamily: '"DM Sans", system-ui, sans-serif',
                      letterSpacing: 0.2,
                    }}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#F2C4B0',
                      }}
                    />
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
