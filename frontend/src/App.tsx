import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ManagerPage } from "./pages/ManagerPage";
import "./App.css";
import { MySchedulePage } from "./pages/MySchedulePage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />

        <Route element={<ProtectedRoute allowedRoles={["EMPLOYEE"]} />}>
          <Route path="/my-schedule" element={<MySchedulePage />} />
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["MANAGER"]} />}
        >
          <Route path="/manager" element={<ManagerPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;