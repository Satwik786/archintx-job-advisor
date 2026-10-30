import { Route, Routes } from 'react-router-dom'
import Layout from './layouts/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import JobsPage from './pages/JobsPage'
import ApplyPage from './pages/ApplyPage'
import ResultPage from './pages/ResultPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import { Empty } from './components/ui'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<JobsPage />} />
        <Route path="/apply/:jobId" element={<ApplyPage />} />
        <Route path="/results/:applicationId" element={<ResultPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>
        <Route path="*" element={<Empty title="Page not found">Check the address and try again.</Empty>} />
      </Route>
    </Routes>
  )
}
