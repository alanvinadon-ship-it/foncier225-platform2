import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ParcelPublic from "./pages/ParcelPublic";
import Verify from "./pages/Verify";
import AdminDashboard from "./pages/admin/Dashboard";
import AuditAdmin from "./pages/admin/AuditAdmin";
import ParcelsAdmin from "./pages/admin/ParcelsAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/parcelle/:token" component={ParcelPublic} />
      <Route path="/verify" component={Verify} />
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
