import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import AnalyticsScript from "./components/AnalyticsScript";
import CitizenLayout from "./components/CitizenLayout";
import DashboardLayout from "./components/DashboardLayout";
import { ErpLayout } from "./components/ErpLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { BankLayout } from "./components/bank/BankLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ParcelPublic from "./pages/ParcelPublic";

const Verify = lazy(() => import("./pages/Verify"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AuditAdmin = lazy(() => import("./pages/admin/AuditAdmin"));
const DocumentsAdmin = lazy(() => import("./pages/admin/DocumentsAdmin"));
const ParcelsAdmin = lazy(() => import("./pages/admin/ParcelsAdmin"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const BankCreditFileDetailPage = lazy(() => import("./pages/bank/BankCreditFileDetailPage"));
const BankCreditFilesPage = lazy(() => import("./pages/bank/BankCreditFilesPage"));
const CitizenDashboard = lazy(() => import("./pages/citizen/CitizenDashboard"));
const CitizenCreditFileCreate = lazy(() => import("./pages/citizen/CitizenCreditFileCreate"));
const CitizenCreditFileDetail = lazy(() => import("./pages/citizen/CitizenCreditFileDetail"));
const CitizenCreditFiles = lazy(() => import("./pages/citizen/CitizenCreditFiles"));
const CitizenDocuments = lazy(() => import("./pages/citizen/CitizenDocuments"));
const CitizenParcelDetail = lazy(() => import("./pages/citizen/CitizenParcelDetail"));
const CitizenParcels = lazy(() => import("./pages/citizen/CitizenParcels"));
const CitizenProfile = lazy(() => import("./pages/citizen/CitizenProfile"));
const CitizenTimeline = lazy(() => import("./pages/citizen/CitizenTimeline"));
const DelimitationVillageoise = lazy(() => import("./pages/admin/DelimitationVillageoise"));
const AdminLandTitleList = lazy(() => import("./pages/admin/AdminLandTitleList"));
const AdminLandTitleDetail = lazy(() => import("./pages/admin/AdminLandTitleDetail"));
const CitizenLandTitleList = lazy(() => import("./pages/citizen/CitizenLandTitleList"));
const CitizenLandTitleDetail = lazy(() => import("./pages/citizen/CitizenLandTitleDetail"));
const CitizenLandTitleCreate = lazy(() => import("./pages/citizen/CitizenLandTitleCreate"));
const TrackApplication = lazy(() => import("./pages/TrackApplication"));
const WorkflowPage = lazy(() => import("./pages/WorkflowPage"));
const NotificationSettings = lazy(() => import("./pages/citizen/NotificationSettings"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminSigConfig = lazy(() => import("./pages/admin/AdminSigConfig"));
const AdminSigDashboard = lazy(() => import("./pages/admin/AdminSigDashboard"));
const CitizenUrbanAcdList = lazy(() => import("./pages/citizen/CitizenUrbanAcdList"));
const CitizenUrbanAcdCreate = lazy(() => import("./pages/citizen/CitizenUrbanAcdCreate"));
const CitizenUrbanAcdDetail = lazy(() => import("./pages/citizen/CitizenUrbanAcdDetail"));
const AdminUnifiedDashboard = lazy(() => import("./pages/admin/UnifiedDashboard"));
const AdminUrbanAcdList = lazy(() => import("./pages/admin/AdminUrbanAcdList"));
const AdminUrbanAcdDetail = lazy(() => import("./pages/admin/AdminUrbanAcdDetail"));
const NewApplication = lazy(() => import("./pages/citizen/NewApplication"));
const UrbanWorkflowPage = lazy(() => import("./pages/UrbanWorkflowPage"));
const MyDossiers = lazy(() => import("./pages/citizen/MyDossiers"));
const Payments = lazy(() => import("./pages/citizen/Payments"));
const CitizenAppointments = lazy(() => import("./pages/citizen/Appointments"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminInterconnexion = lazy(() => import("./pages/admin/AdminInterconnexion"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const SuiviDossiers = lazy(() => import("./pages/citizen/SuiviDossiers"));
const CitizenMessages = lazy(() => import("./pages/citizen/Messages"));
const AdminRbac = lazy(() => import("./pages/admin/AdminRbac"));

// ERP Construction
const ErpDashboard = lazy(() => import("./pages/erp/ErpDashboard"));
const ErpAdminUsers = lazy(() => import("./pages/erp/ErpAdminUsers"));
const ErpAdminRoles = lazy(() => import("./pages/erp/ErpAdminRoles"));
const ErpAdminPermissions = lazy(() => import("./pages/erp/ErpAdminPermissions"));
const ErpProjectsList = lazy(() => import("./pages/erp/ErpProjectsList"));
const ErpProjectCreate = lazy(() => import("./pages/erp/ErpProjectCreate"));
const ErpProjectDetail = lazy(() => import("./pages/erp/ErpProjectDetail"));
const ErpProjectEdit = lazy(() => import("./pages/erp/ErpProjectEdit"));
const ErpProjectTasks = lazy(() => import("./pages/erp/ErpProjectTasks"));
const ErpTaskDetail = lazy(() => import("./pages/erp/ErpTaskDetail"));
const ErpProjectGantt = lazy(() => import("./pages/erp/ErpProjectGantt"));
const ErpProjectMilestones = lazy(() => import("./pages/erp/ErpProjectMilestones"));
const ErpDocuments = lazy(() => import("./pages/erp/ErpDocuments"));
const ErpPermits = lazy(() => import("./pages/erp/ErpPermits"));
const ErpCompliance = lazy(() => import("./pages/erp/ErpCompliance"));
const ErpEquipment = lazy(() => import("./pages/erp/ErpEquipment"));
const ErpMaintenanceCalendar = lazy(() => import("./pages/erp/ErpMaintenanceCalendar"));
const ErpSafety = lazy(() => import("./pages/erp/ErpSafety"));
const ErpVendors = lazy(() => import("./pages/erp/ErpVendors"));
const ErpContractors = lazy(() => import("./pages/erp/ErpContractors"));
const ErpCertifications = lazy(() => import("./pages/erp/ErpCertifications"));
const ErpRatings = lazy(() => import("./pages/erp/ErpRatings"));
const ErpInvoices = lazy(() => import("./pages/erp/ErpInvoices"));
const ErpPayments = lazy(() => import("./pages/erp/ErpPayments"));
const ErpInventory = lazy(() => import("./pages/erp/ErpInventory"));
const ErpMaterialRequests = lazy(() => import("./pages/erp/ErpMaterialRequests"));
const ErpSupplierIntegration = lazy(() => import("./pages/erp/ErpSupplierIntegration"));
const ErpWastage = lazy(() => import("./pages/erp/ErpWastage"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-ci-green border-t-transparent" />
        <h1 className="text-lg font-semibold text-foreground">Chargement de l'espace Foncier225</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nous preparons la page demandee.
        </p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/parcelle/:token" component={ParcelPublic} />
      <Route path="/verify" component={Verify} />


      {/* Citizen routes */}
      <Route path="/citizen">
        <CitizenLayout>
          <CitizenDashboard />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/parcels">
        <CitizenLayout>
          <CitizenParcels />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/parcels/:id">
        <CitizenLayout>
          <CitizenParcelDetail />
        </CitizenLayout>
      </Route>

      <Route path="/citizen/timeline">
        <CitizenLayout>
          <CitizenTimeline />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/documents">
        <CitizenLayout>
          <CitizenDocuments />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/land-title">
        <CitizenLayout>
          <CitizenLandTitleList />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/land-title/new">
        <CitizenLayout>
          <CitizenLandTitleCreate />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/land-title/:id">
        <CitizenLayout>
          <CitizenLandTitleDetail />
        </CitizenLayout>
      </Route>

      <Route path="/citizen/new-application">
        <CitizenLayout>
          <NewApplication />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/urban-acd">
        <CitizenLayout>
          <CitizenUrbanAcdList />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/urban-acd/new">
        <CitizenLayout>
          <CitizenUrbanAcdCreate />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/urban-acd/:id">
        <CitizenLayout>
          <CitizenUrbanAcdDetail />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/urban-workflow">
        <CitizenLayout>
          <UrbanWorkflowPage />
        </CitizenLayout>
      </Route>

      <Route path="/citizen/credit-habitat">
        <CitizenLayout>
          <CitizenCreditFiles />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/credit-habitat/new">
        <CitizenLayout>
          <CitizenCreditFileCreate />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/credit-habitat/:id">
        <CitizenLayout>
          <CitizenCreditFileDetail />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/profile">
        <CitizenLayout>
          <CitizenProfile />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/suivi">
        <CitizenLayout>
          <TrackApplication />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/payments">
        <CitizenLayout>
          <Payments />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/my-dossiers">
        <CitizenLayout>
          <MyDossiers />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/workflow">
        <CitizenLayout>
          <WorkflowPage />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/appointments">
        <CitizenLayout>
          <CitizenAppointments />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/suivi-dossiers">
        <CitizenLayout>
          <SuiviDossiers />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/messages">
        <CitizenLayout>
          <CitizenMessages />
        </CitizenLayout>
      </Route>
      <Route path="/citizen/notifications">
        <CitizenLayout>
          <NotificationSettings />
        </CitizenLayout>
      </Route>

      {/* Bank routes */}
      <Route path="/bank/credit-files">
        <BankLayout>
          <BankCreditFilesPage />
        </BankLayout>
      </Route>
      <Route path="/bank/credit-files/:id">
        <BankLayout>
          <BankCreditFileDetailPage />
        </BankLayout>
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <DashboardLayout>
          <AdminDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/admin/unified-dashboard">
        <DashboardLayout>
          <AdminUnifiedDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/admin/parcels">
        <DashboardLayout>
          <ParcelsAdmin />
        </DashboardLayout>
      </Route>
      <Route path="/admin/documents">
        <DashboardLayout>
          <DocumentsAdmin />
        </DashboardLayout>
      </Route>
      <Route path="/admin/users">
        <DashboardLayout>
          <UsersAdmin />
        </DashboardLayout>
      </Route>
      <Route path="/admin/audit">
        <DashboardLayout>
          <AuditAdmin />
        </DashboardLayout>
      </Route>
      <Route path="/admin/land-title">
        <DashboardLayout>
          <AdminLandTitleList />
        </DashboardLayout>
      </Route>
      <Route path="/admin/land-title/:id">
        <DashboardLayout>
          <AdminLandTitleDetail />
        </DashboardLayout>
      </Route>
      <Route path="/admin/delimitation">
        <DashboardLayout>
          <DelimitationVillageoise />
        </DashboardLayout>
      </Route>
      <Route path="/admin/notifications">
        <DashboardLayout>
          <AdminNotifications />
        </DashboardLayout>
      </Route>
      <Route path="/admin/sig-config">
        <DashboardLayout>
          <AdminSigConfig />
        </DashboardLayout>
      </Route>
      <Route path="/admin/sig-dashboard">
        <DashboardLayout>
          <AdminSigDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/admin/appointments">
        <DashboardLayout>
          <AdminAppointments />
        </DashboardLayout>
      </Route>
      <Route path="/admin/interconnexion">
        <DashboardLayout>
          <AdminInterconnexion />
        </DashboardLayout>
      </Route>
      <Route path="/admin/analytics">
        <DashboardLayout>
          <AdminAnalytics />
        </DashboardLayout>
      </Route>
      <Route path="/admin/messages">
        <DashboardLayout>
          <AdminMessages />
        </DashboardLayout>
      </Route>
      <Route path="/admin/rbac">
        <DashboardLayout>
          <AdminRbac />
        </DashboardLayout>
      </Route>
      <Route path="/admin/urban-acd">
        <DashboardLayout>
          <AdminUrbanAcdList />
        </DashboardLayout>
      </Route>
      <Route path="/admin/urban-acd/:id">
        <DashboardLayout>
          <AdminUrbanAcdDetail />
        </DashboardLayout>
      </Route>

      {/* ERP Construction routes */}
      <Route path="/erp">
        <ErpLayout>
          <ErpDashboard />
        </ErpLayout>
      </Route>
      <Route path="/erp/admin/users">
        <ErpLayout>
          <ErpAdminUsers />
        </ErpLayout>
      </Route>
      <Route path="/erp/admin/roles">
        <ErpLayout>
          <ErpAdminRoles />
        </ErpLayout>
      </Route>
      <Route path="/erp/admin/permissions">
        <ErpLayout>
          <ErpAdminPermissions />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects">
        <ErpLayout>
          <ErpProjectsList />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects/create">
        <ErpLayout>
          <ErpProjectCreate />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects/:id">
        <ErpLayout>
          <ErpProjectDetail />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects/:id/edit">
        <ErpLayout>
          <ErpProjectEdit />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects/:id/tasks">
        <ErpLayout>
          <ErpProjectTasks />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects/:id/gantt">
        <ErpLayout>
          <ErpProjectGantt />
        </ErpLayout>
      </Route>
      <Route path="/erp/projects/:id/milestones">
        <ErpLayout>
          <ErpProjectMilestones />
        </ErpLayout>
      </Route>
      <Route path="/erp/tasks/:id">
        <ErpLayout>
          <ErpTaskDetail />
        </ErpLayout>
      </Route>
      <Route path="/erp/documents">
        <ErpLayout>
          <ErpDocuments />
        </ErpLayout>
      </Route>
      <Route path="/erp/permits">
        <ErpLayout>
          <ErpPermits />
        </ErpLayout>
      </Route>
      <Route path="/erp/compliance">
        <ErpLayout>
          <ErpCompliance />
        </ErpLayout>
      </Route>
      <Route path="/erp/equipment">
        <ErpLayout>
          <ErpEquipment />
        </ErpLayout>
      </Route>
      <Route path="/erp/equipment/maintenance-calendar">
        <ErpLayout>
          <ErpMaintenanceCalendar />
        </ErpLayout>
      </Route>
      <Route path="/erp/safety">
        <ErpLayout>
          <ErpSafety />
        </ErpLayout>
      </Route>
      <Route path="/erp/vendors">
        <ErpLayout>
          <ErpVendors />
        </ErpLayout>
      </Route>
      <Route path="/erp/contractors">
        <ErpLayout>
          <ErpContractors />
        </ErpLayout>
      </Route>
      <Route path="/erp/certifications">
        <ErpLayout>
          <ErpCertifications />
        </ErpLayout>
      </Route>
      <Route path="/erp/performance-ratings">
        <ErpLayout>
          <ErpRatings />
        </ErpLayout>
      </Route>
      <Route path="/erp/invoices">
        <ErpLayout>
          <ErpInvoices />
        </ErpLayout>
      </Route>
      <Route path="/erp/payments">
        <ErpLayout>
          <ErpPayments />
        </ErpLayout>
      </Route>
      <Route path="/erp/inventory">
        <ErpLayout>
          <ErpInventory />
        </ErpLayout>
      </Route>
      <Route path="/erp/material-requests">
        <ErpLayout>
          <ErpMaterialRequests />
        </ErpLayout>
      </Route>
      <Route path="/erp/supplier-integration">
        <ErpLayout>
          <ErpSupplierIntegration />
        </ErpLayout>
      </Route>
      <Route path="/erp/wastage">
        <ErpLayout>
          <ErpWastage />
        </ErpLayout>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AnalyticsScript />
          <Toaster />
          <Suspense fallback={<RouteFallback />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
