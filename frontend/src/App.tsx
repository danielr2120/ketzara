import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MetaProvider } from "./context/MetaContext";
import { DashboardPage } from "./pages/DashboardPage";
import { EditOrderPage } from "./pages/EditOrderPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PublicTrackingPage } from "./pages/PublicTrackingPage";
import { TrackOrderPage } from "./pages/TrackOrderPage";

function AdminShell() {
  return (
    <MetaProvider>
      <Layout />
    </MetaProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Página para el cliente: sin menú ni acceso a la administración. */}
      <Route path="seguimiento/:code" element={<PublicTrackingPage />} />

      <Route element={<AdminShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="consultar" element={<TrackOrderPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<NewOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="orders/:id/edit" element={<EditOrderPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
