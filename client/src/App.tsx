import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import CitizenLayout from "./components/CitizenLayout";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { BankLayout } from "./components/bank/BankLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ParcelPublic from "./pages/ParcelPublic";
import Verify from "./pages/Verify";
import AdminDashboard from "./pages/admin/Dashboard";
import AuditAdmin from "./pages/admin/AuditAdmin";
import DocumentsAdmin from "./pages/admin/DocumentsAdmin";
import ParcelsAdmin from "./pages/admin/ParcelsAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import BankCreditFileDetailPage from "./pages/bank/BankCreditFileDetailPage";
import BankCreditFilesPage from "./pages/bank/BankCreditFilesPage";
import CitizenDashboard from "./pages/citizen/CitizenDashboard";
import CitizenCreditFileCreate from "./pages/citizen/CitizenCreditFileCreate";
import CitizenCreditFileDetail from "./pages/citizen/CitizenCreditFileDetail";
import CitizenCreditFiles from "./pages/citizen/CitizenCreditFiles";
import CitizenDocuments from "./pages/citizen/CitizenDocuments";
import CitizenParcelDetail from "./pages/citizen/CitizenParcelDetail";
import CitizenParcels from "./pages/citizen/CitizenParcels";
import CitizenProfile from "./pages/citizen/CitizenProfile";
import CitizenTimeline from "./pages/citizen/CitizenTimeline";

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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
