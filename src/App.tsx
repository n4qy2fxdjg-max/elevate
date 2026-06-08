import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Library from './pages/Library'
import Builder from './pages/Builder'
import ActiveWorkout from './pages/ActiveWorkout'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import UpdatePrompt from './components/UpdatePrompt'

export default function App() {
  return (
    <BrowserRouter>
      <UpdatePrompt />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="builder" element={<Builder />} />
          <Route path="progress" element={<Progress />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="active" element={<ActiveWorkout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
