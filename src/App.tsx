import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Library from './pages/Library'
import Builder from './pages/Builder'
import ActiveWorkout from './pages/ActiveWorkout'
import Progress from './pages/Progress'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="builder" element={<Builder />} />
          <Route path="progress" element={<Progress />} />
        </Route>
        <Route path="active" element={<ActiveWorkout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
