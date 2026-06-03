import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CompleteProfile from "@/pages/CompleteProfile";
import Dashboard from "@/pages/Dashboard";
import ApplyLeave from "@/pages/ApplyLeave";
import LeaveHistory from "@/pages/LeaveHistory";
import GatePass from "@/pages/GatePass";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import SecurityDashboard from "@/pages/SecurityDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ParentApproval from "@/pages/ParentApproval";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/signup" component={Register} />
      <Route path="/reachsignup" component={Register} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/apply-leave" component={ApplyLeave} />
      <Route path="/leave-history" component={LeaveHistory} />
      <Route path="/parent-approval/:requestId/:action" component={ParentApproval} />
      <Route path="/gate-pass/:id" component={GatePass} />
      <Route path="/supervisor" component={SupervisorDashboard} />
      <Route path="/security" component={SecurityDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
