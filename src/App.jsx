import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import CandidateForm from './pages/CandidateForm'
import Dashboard from './pages/Dashboard'
import Interviewer1 from './pages/Interviewer1'
import Interviewer2 from './pages/Interviewer2'
import Interviewer3 from './pages/Interviewer3'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Página pública — acessada via QR code pelo candidato */}
      <Route path="/cadastro" element={<CandidateForm />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute allow={['analista']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entrevistador1"
        element={
          <ProtectedRoute allow={['entrevistador1', 'analista']}>
            <Interviewer1 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entrevistador2"
        element={
          <ProtectedRoute allow={['entrevistador2', 'analista']}>
            <Interviewer2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entrevistador3"
        element={
          <ProtectedRoute allow={['entrevistador3', 'analista']}>
            <Interviewer3 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={['analista']}>
            <Admin />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
