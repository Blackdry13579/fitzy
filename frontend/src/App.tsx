import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import { getAdminToken } from './api/adminClient';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { MachineDetailPage } from './pages/MachineDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReferralPage } from './pages/ReferralPage';
import { ProfilePage } from './pages/ProfilePage';
import { WalletPage } from './pages/WalletPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { MyProductsPage } from './pages/MyProductsPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { PurchasedMachinePage } from './pages/PurchasedMachinePage';
import { FaqPage } from './pages/FaqPage';
import { SupportPage } from './pages/SupportPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PolitiquePage } from './pages/PolitiquePage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorStatePage } from './pages/ErrorStatePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminDepositsPage } from './pages/admin/AdminDepositsPage';
import { AdminWithdrawalsPage } from './pages/admin/AdminWithdrawalsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminReferralsPage } from './pages/admin/AdminReferralsPage';
import { AdminPurchasesPage } from './pages/admin/AdminPurchasesPage';
import { AdminMachinesPage } from './pages/admin/AdminMachinesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: 24 }}>Chargement...</div>;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  if (!getAdminToken()) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="depots" element={<AdminDepositsPage />} />
          <Route path="retraits" element={<AdminWithdrawalsPage />} />
          <Route path="utilisateurs" element={<AdminUsersPage />} />
          <Route path="parrainages" element={<AdminReferralsPage />} />
          <Route path="achats" element={<AdminPurchasesPage />} />
          <Route path="produits" element={<AdminMachinesPage />} />
          <Route path="parametres" element={<AdminSettingsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogue" element={<CatalogPage />} />
          <Route path="/catalogue/:id" element={<MachineDetailPage />} />
          <Route path="/portefeuille" element={<RequireAuth><WalletPage /></RequireAuth>} />
          <Route path="/depot" element={<RequireAuth><DepositPage /></RequireAuth>} />
          <Route path="/retrait" element={<RequireAuth><WithdrawPage /></RequireAuth>} />
          <Route path="/mes-produits" element={<RequireAuth><MyProductsPage /></RequireAuth>} />
          <Route path="/mes-produits/:id" element={<RequireAuth><PurchasedMachinePage /></RequireAuth>} />
          <Route path="/parrainage" element={<RequireAuth><ReferralPage /></RequireAuth>} />
          <Route path="/compte" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/compte/modifier" element={<RequireAuth><EditProfilePage /></RequireAuth>} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/invite/:code" element={<RegisterPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
          <Route path="/politique" element={<PolitiquePage />} />
          <Route path="/politique/conditions" element={<TermsPage />} />
          <Route path="/politique/confidentialite" element={<PrivacyPage />} />
          <Route path="/erreur" element={<ErrorStatePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
