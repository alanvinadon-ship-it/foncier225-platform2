import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import AnalyticsScript from "./components/AnalyticsScript";
import CitizenLayout from "./components/CitizenLayout";
import DashboardLayout from "./components/DashboardLayout";
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
