import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { ProtectedRoute } from './protected-route';
import { PermissionRoute } from './permission-route';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const LoginPage = lazy(() => import('@/pages/login'));
const SetupPage = lazy(() => import('@/pages/setup'));
const AccessDeniedPage = lazy(() => import('@/pages/access-denied'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const CustomersPage = lazy(() => import('@/pages/customers/index'));
const CustomerDetailPage = lazy(() => import('@/pages/customers/[id]'));
const ProductsPage = lazy(() => import('@/pages/products/index'));
const ProductDetailPage = lazy(() => import('@/pages/products/[id]'));
const ProductLotsPage = lazy(() => import('@/pages/products/lots'));
const StockMovementsPage = lazy(() => import('@/pages/stock/movements'));
const MaterialsPage = lazy(() => import('@/pages/materials/index'));
const MaterialDetailPage = lazy(() => import('@/pages/materials/[id]'));
const CalculationsPage = lazy(() => import('@/pages/calculations/index'));
const SuppliersPage = lazy(() => import('@/pages/suppliers/index'));
const OrdersPage = lazy(() => import('@/pages/orders/index'));
const NewOrderPage = lazy(() => import('@/pages/orders/new'));
const OrderDetailPage = lazy(() => import('@/pages/orders/[id]'));
const EditOrderPage = lazy(() => import('@/pages/orders/edit'));
const OrderCheckPage = lazy(() => import('@/pages/orders/check'));
const ReturnsPage = lazy(() => import('@/pages/returns/index'));
const NewCustomerReturnPage = lazy(() => import('@/pages/returns/new'));
const ProductionPage = lazy(() => import('@/pages/production/index'));
const AttendancePage = lazy(() => import('@/pages/attendance/index'));
const PayrollPage = lazy(() => import('@/pages/payroll/index'));
const PayrollSlipPage = lazy(() => import('@/pages/payroll/PayrollSlipPage'));
const FinancePage = lazy(() => import('@/pages/finance/FinancePage'));
const ReportsHubPage = lazy(() => import('@/pages/reports/ReportsHubPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const RolesPage = lazy(() => import('@/pages/roles/index'));
const UsersPage = lazy(() => import('@/pages/users/index'));

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="sm" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="access-denied" element={<AccessDeniedPage />} />

          {/* Dashboard — hammaga ochiq */}
          <Route index element={<DashboardPage />} />

          {/* Sotuv */}
          <Route path="customers" element={<PermissionRoute permission="customers:read"><CustomersPage /></PermissionRoute>} />
          <Route path="customers/:id" element={<PermissionRoute permission="customers:read"><CustomerDetailPage /></PermissionRoute>} />
          <Route path="orders" element={<PermissionRoute permission="orders:read"><OrdersPage /></PermissionRoute>} />
          <Route path="orders/new" element={<PermissionRoute permission="orders:create"><NewOrderPage /></PermissionRoute>} />
          <Route path="orders/:id" element={<PermissionRoute permission="orders:read"><OrderDetailPage /></PermissionRoute>} />
          <Route path="orders/:id/edit" element={<PermissionRoute permission="orders:update"><EditOrderPage /></PermissionRoute>} />
          <Route path="orders/:id/check" element={<PermissionRoute permission="orders:read"><OrderCheckPage /></PermissionRoute>} />
          <Route path="returns" element={<PermissionRoute permission="returns:read"><ReturnsPage /></PermissionRoute>} />
          <Route path="returns/new" element={<PermissionRoute permission="returns:create"><NewCustomerReturnPage /></PermissionRoute>} />

          {/* Ombor */}
          <Route path="calculations" element={<PermissionRoute permission="products:read"><CalculationsPage /></PermissionRoute>} />
          <Route path="products" element={<PermissionRoute permission="products:read"><ProductsPage /></PermissionRoute>} />
          <Route path="products/lots" element={<PermissionRoute permission="products:read"><ProductLotsPage /></PermissionRoute>} />
          <Route path="products/:id" element={<PermissionRoute permission="products:read"><ProductDetailPage /></PermissionRoute>} />
          <Route path="stock/movements" element={<PermissionRoute permission="stock:read"><StockMovementsPage /></PermissionRoute>} />
          <Route path="materials" element={<PermissionRoute permission="products:read"><MaterialsPage /></PermissionRoute>} />
          <Route path="materials/:id" element={<PermissionRoute permission="products:read"><MaterialDetailPage /></PermissionRoute>} />
          <Route path="suppliers" element={<PermissionRoute permission="products:read"><SuppliersPage /></PermissionRoute>} />
          <Route path="production" element={<PermissionRoute permission="production:read"><ProductionPage /></PermissionRoute>} />

          {/* Kadrlar */}
          <Route path="attendance" element={<PermissionRoute permission="attendance:read"><AttendancePage /></PermissionRoute>} />
          <Route path="payroll" element={<PermissionRoute permission="payroll:read"><PayrollPage /></PermissionRoute>} />
          <Route path="payroll/:id/slip" element={<PermissionRoute permission="payroll:read"><PayrollSlipPage /></PermissionRoute>} />
          <Route path="users" element={<PermissionRoute permission="users:read"><UsersPage /></PermissionRoute>} />

          {/* Moliya */}
          <Route path="finance" element={<PermissionRoute permission="finance:read"><FinancePage /></PermissionRoute>} />

          {/* Hisobotlar */}
          <Route path="reports" element={<PermissionRoute permission="reports:read"><ReportsHubPage /></PermissionRoute>} />
          <Route path="reports/:department" element={<PermissionRoute permission="reports:read"><ReportsPage /></PermissionRoute>} />

          {/* Tizim */}
          <Route path="roles" element={<PermissionRoute permission="users:create"><RolesPage /></PermissionRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
