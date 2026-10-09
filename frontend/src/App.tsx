import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MetaProvider } from "./context/MetaContext";
import { DashboardPage } from "./pages/DashboardPage";
import { EditOrderPage } from "./pages/EditOrderPage";
import { LoginPage } from "./pages/LoginPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PublicOrderPage } from "./pages/PublicOrderPage";
import { PublicTrackingPage } from "./pages/PublicTrackingPage";
import { TrackOrderPage } from "./pages/TrackOrderPage";

function AdminShell() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return (
    <MetaProvider>
      <Layout />
    </MetaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Páginas para el cliente: sin menú ni acceso a la administración. */}
        <Route
          index
          element={
            <MetaProvider>
              <PublicOrderPage />
            </MetaProvider>
          }
        />
        <Route path="seguimiento/:code" element={<PublicTrackingPage />} />
        {/* Enlace anterior de la página de pedidos; se conserva para los que ya se compartieron. */}
        <Route path="pedir" element={<Navigate to="/" replace />} />

        {/* Administración. */}
        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin" element={<AdminShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="consultar" element={<TrackOrderPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="orders/:id/edit" element={<EditOrderPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
