import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Shield, Search, ChevronDown, Check, Megaphone,
  Plus, X, UserCog, AlertCircle, Activity, ShieldCheck,
  Database, RefreshCw, TableProperties, KeyRound, Save, Bell, UserCheck, UserX, Trash2, Eye, Info, Printer, FileDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { approveRoleRequest, getPendingRoleRequests, rejectRoleRequest, adminDeleteUser, sendSupervisorStatusEmail } from "@/lib/api/leave";

type Role = "STUDENT" | "SUPERVISOR" | "SECURITY" | "ADMIN";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  status?: string;
  phone?: string;
  created_at: string;
  department_id?: string | null;
  department?: string;
  roll_number?: string | null;
  year?: number | null;
  room_number?: string | null;
  hostel_name?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: Role;
  department_id: string | null;
  status: string;
  created_at: string;
  full_name?: string;
  email?: string;
  department?: string;
}

const ROLES: Role[] = ["STUDENT", "SUPERVISOR", "SECURITY", "ADMIN"];

const roleStyle: Record<Role, { badge: string; accent: string; border: string }> = {
  STUDENT:    { badge: "bg-blue-50 text-blue-700 border-blue-200",     accent: "text-blue-600",   border: "border-l-blue-500" },
  SUPERVISOR: { badge: "bg-purple-50 text-purple-700 border-purple-200", accent: "text-purple-600", border: "border-l-purple-500" },
  SECURITY:   { badge: "bg-blue-50 text-blue-700 border-blue-200", accent: "text-blue-600", border: "border-l-blue-500" },
  ADMIN:      { badge: "bg-red-50 text-red-700 border-red-200",         accent: "text-red-600",    border: "border-l-red-500" },
};

const kpiConfig = [
  { role: "STUDENT"    as Role, label: "Total Students",  icon: Users,       border: "border-l-[#243B53]", iconColor: "text-[#243B53]" },
  { role: "SUPERVISOR" as Role, label: "Supervisors",     icon: UserCog,     border: "border-l-purple-500", iconColor: "text-purple-600" },
  { role: "SECURITY"   as Role, label: "Security Staff",  icon: ShieldCheck, border: "border-l-blue-500",   iconColor: "text-blue-600" },
  { role: "ADMIN"      as Role, label: "Administrators",  icon: Activity,    border: "border-l-red-500",    iconColor: "text-red-600" },
];

export default function AdminDashboard() {
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();

  const [users, setUsers]           = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [annTitle, setAnnTitle]     = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annLoading, setAnnLoading] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserProfile | null>(null);

  // New States for Student Audit Information
  const [activeTab, setActiveTab]   = useState<"users" | "audit">("users");
  const [leaves, setLeaves]         = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED">("ALL");
  const [profileRoleFilter, setProfileRoleFilter] = useState<"ALL" | Role>("ALL");




  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    const { data, error } = await supabase
      .from("leave_applications")
      .select(`
        id,
        leave_type,
        from_date,
        to_date,
        out_time,
        return_time,
        destination,
        reason,
        status,
        parent_name,
        parent_phone,
        parent_email,
        student:profiles!student_id (
          full_name,
          roll_number,
          department:departments (
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch leave applications error:", error.message);
    } else {
      setLeaves(data || []);
    }
    setLoadingLeaves(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data, error }, { data: departmentRows, error: departmentsError }, requestRows] = await Promise.all([
      supabase
      .from("profiles")
        .select("id, full_name, email, role, status, phone, created_at, department_id, departments(name), roll_number, year, room_number, hostel_name, parent_name, parent_phone, parent_email")
        .order("created_at", { ascending: false }),
      supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true }),
      getPendingRoleRequests(),
    ]);
    if (error) console.error("Fetch users:", error.message);
    if (departmentsError) console.error("Fetch departments:", departmentsError.message);
    const normalizedDepartments = departmentRows || [];
    const normalizedUsers = (data || []).map((user: any) => ({
      ...user,
      role: user.role?.toUpperCase(),
      status: user.status?.toUpperCase(),
      department: user.departments?.name,
    }));
    setDepartments(normalizedDepartments);
    setUsers(normalizedUsers);
    setRoleRequests((requestRows as any[]).map((request) => {
      const requestUser = normalizedUsers.find((user) => user.id === request.user_id);
      const requestDepartment = normalizedDepartments.find((department) => department.id === request.department_id);

      return {
        ...request,
        requested_role: request.requested_role?.toUpperCase(),
        status: request.status?.toUpperCase(),
        full_name: requestUser?.full_name,
        email: requestUser?.email,
        department: requestDepartment?.name,
      };
    }));
    setLoading(false);
    
    // Also fetch leave applications on mount/sync
    fetchLeaves();
  };

  const downloadAuditPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Pop-up Blocked", description: "Please allow pop-ups to print/download PDF report.", variant: "destructive" });
      return;
    }

    const filteredLeaves = leaves.filter((l) => {
      if (auditStatusFilter !== "ALL" && (l.status?.toUpperCase() || "") !== auditStatusFilter) return false;
      const q = auditSearch.toLowerCase();
      const student = l.student || {};
      const deptName = student.department?.name || "";
      return (
        (student.full_name || "").toLowerCase().includes(q) ||
        (student.roll_number || "").toLowerCase().includes(q) ||
        (deptName || "").toLowerCase().includes(q) ||
        (l.leave_type || "").toLowerCase().includes(q) ||
        (l.destination || "").toLowerCase().includes(q) ||
        (l.reason || "").toLowerCase().includes(q) ||
        (l.parent_name || "").toLowerCase().includes(q) ||
        (l.parent_phone || "").toLowerCase().includes(q) ||
        (l.parent_email || "").toLowerCase().includes(q)
      );
    });

    const rowsHtml = filteredLeaves.map((l, index) => {
      const student = l.student || {};
      const deptName = student.department?.name || "N/A";
      const sUpper = l.status?.toUpperCase() || "";
      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px; font-size: 12px; font-weight: bold;">${index + 1}</td>
          <td style="padding: 10px; font-size: 12px;">
            <strong>${student.full_name || "Unknown"}</strong><br>
            <span style="color: #718096; font-size: 11px;">Roll: ${student.roll_number || "N/A"}</span>
          </td>
          <td style="padding: 10px; font-size: 12px;">${deptName}</td>
          <td style="padding: 10px; font-size: 12px;">
            <span style="background-color: #EBF8FF; color: #2B6CB0; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold;">${l.leave_type}</span>
          </td>
          <td style="padding: 10px; font-size: 11px;">
            <strong>${l.from_date}</strong> to <strong>${l.to_date}</strong><br>
            <span style="color: #718096; font-size: 10px;">${l.out_time} - ${l.return_time}</span>
          </td>
          <td style="padding: 10px; font-size: 12px;">
            <strong>${l.destination || "N/A"}</strong><br>
            <span style="color: #718096; font-size: 11px;">${l.reason || "N/A"}</span>
          </td>
          <td style="padding: 10px; font-size: 12px;">
            <strong>${l.parent_name || "—"}</strong><br>
            <span style="color: #718096; font-size: 11px;">Ph: ${l.parent_phone || "—"}</span><br>
            <span style="color: #718096; font-size: 11px;">${l.parent_email || "—"}</span>
          </td>
          <td style="padding: 10px; font-size: 12px; font-weight: bold; color: ${sUpper === 'APPROVED' ? '#2F855A' : sUpper === 'REJECTED' ? '#C53030' : sUpper === 'COMPLETED' ? '#2B6CB0' : '#B7791F'}">
            ${l.status}
          </td>
        </tr>
      `;
    }).join("");

    const htmlContent = `
      <html>
        <head>
          <title>Student Leave Audit Report (${auditStatusFilter}) - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #2D3748; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #243B53; color: white; text-align: left; padding: 12px 10px; font-size: 12px; font-weight: bold; }
            h1 { color: #243B53; font-size: 24px; margin-bottom: 5px; }
            .header-info { color: #718096; font-size: 12px; margin-bottom: 25px; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; }
          </style>
        </head>
        <body>
          <h1>Hostel Leave Management System</h1>
          <div class="header-info">
            <strong>STUDENT LEAVE AUDIT REPORT (${auditStatusFilter})</strong> &bull; Generated on ${new Date().toLocaleString()} &bull; Total Leaves: ${filteredLeaves.length}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Student Details</th>
                <th>Dept</th>
                <th>Type</th>
                <th>Leave Period</th>
                <th>Reason & Destination</th>
                <th>Parent Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #A0AEC0;">No leave records found.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadProfilesPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Pop-up Blocked", description: "Please allow pop-ups to print/download PDF report.", variant: "destructive" });
      return;
    }

    const filteredUsers = users.filter((u) => {
      if (profileRoleFilter !== "ALL" && u.role !== profileRoleFilter) return false;
      const q = search.toLowerCase();
      return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

    const rowsHtml = filteredUsers.map((u, index) => {
      const isStudent = u.role === "STUDENT";
      const deptName = u.department || "—";
      const parentName = u.parent_name || "—";
      const parentPhone = u.parent_phone || "—";
      const statusText = u.status === "APPROVED" ? "ACTIVE" : u.status === "PENDING" ? "PENDING" : "DEACTIVATED";
      const statusColor = u.status === "APPROVED" ? "#2F855A" : u.status === "PENDING" ? "#B7791F" : "#C53030";

      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px; font-size: 12px; font-weight: bold;">${index + 1}</td>
          <td style="padding: 10px; font-size: 12px;">
            <strong>${u.full_name}</strong><br>
            <span style="color: #718096; font-size: 11px;">Roll: ${u.roll_number || "—"}</span>
          </td>
          <td style="padding: 10px; font-size: 12px;">${u.email}</td>
          <td style="padding: 10px; font-size: 12px;">${u.phone || "—"}</td>
          <td style="padding: 10px; font-size: 12px; font-weight: bold; color: #243B53;">${u.role}</td>
          <td style="padding: 10px; font-size: 12px;">${deptName}</td>
          <td style="padding: 10px; font-size: 11px;">
            ${isStudent ? `<strong>${parentName}</strong><br><span style="color: #718096;">Ph: ${parentPhone}</span>` : "—"}
          </td>
          <td style="padding: 10px; font-size: 12px; font-weight: bold; color: ${statusColor}">
            ${statusText}
          </td>
        </tr>
      `;
    }).join("");

    const htmlContent = `
      <html>
        <head>
          <title>User Accounts Report (${profileRoleFilter}) - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #2D3748; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #243B53; color: white; text-align: left; padding: 12px 10px; font-size: 12px; font-weight: bold; }
            h1 { color: #243B53; font-size: 24px; margin-bottom: 5px; }
            .header-info { color: #718096; font-size: 12px; margin-bottom: 25px; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; }
          </style>
        </head>
        <body>
          <h1>Hostel Leave Management System</h1>
          <div class="header-info">
            <strong>USER ACCOUNTS DATABASE REPORT (${profileRoleFilter})</strong> &bull; Generated on ${new Date().toLocaleString()} &bull; Total Accounts: ${filteredUsers.length}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Dept</th>
                <th>Parent Info (Student)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #A0AEC0;">No user records found.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const handleOpenAnnouncements = () => setShowAnnounce(true);
    const handleScrollUsers = () => {
      document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth" });
    };

    window.addEventListener("open-announcements", handleOpenAnnouncements);
    window.addEventListener("scroll-to-users", handleScrollUsers);

    const action = sessionStorage.getItem("admin-action");
    if (action === "Announcements") {
      setShowAnnounce(true);
      sessionStorage.removeItem("admin-action");
    } else if (action === "User Management") {
      setTimeout(handleScrollUsers, 100);
      sessionStorage.removeItem("admin-action");
    }

    return () => {
      window.removeEventListener("open-announcements", handleOpenAnnouncements);
      window.removeEventListener("scroll-to-users", handleScrollUsers);
    };
  }, []);

  const changeRole = async (userId: string, newRole: Role) => {
    if (userId === myProfile?.id && newRole !== "ADMIN") {
      toast({ title: "Cannot demote yourself", description: "Assign another admin first.", variant: "destructive" });
      return;
    }
    setUpdatingId(userId);
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) {
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated", description: `User is now ${newRole}.` });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    }
    setUpdatingId(null);
  };

  const assignDepartment = async (userId: string, dept: string | null) => {
    setUpdatingId(userId);
    const selectedDepartment = departments.find((department) => department.name === dept);
    const { error } = await supabase
      .from("profiles")
      .update({ department_id: selectedDepartment?.id ?? null })
      .eq("id", userId);
    if (error) {
      toast({ title: "Department update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Department updated", description: dept ? `Assigned to ${dept}` : "Department removed" });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, department_id: selectedDepartment?.id ?? null, department: dept || undefined } : u));
    }
    setUpdatingId(null);
  };

  const toggleUserStatus = async (userId: string, currentStatus: string | undefined) => {
    if (userId === myProfile?.id) {
      toast({ title: "Cannot deactivate yourself", description: "You cannot change your own status.", variant: "destructive" });
      return;
    }
    setUpdatingId(userId);
    const newStatus = currentStatus === "APPROVED" ? "REJECTED" : "APPROVED";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", userId);
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: newStatus === "APPROVED" ? "ID Activated" : "ID Deactivated",
        description: `User account is now ${newStatus === "APPROVED" ? "Active" : "Deactivated"}.`
      });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    }
    setUpdatingId(null);
  };


  const handleApproveRoleRequest = async (requestId: string) => {
    setUpdatingId(requestId);
    try {
      const reqObj = roleRequests.find((r) => r.id === requestId);
      await approveRoleRequest(requestId);
      toast({ title: "Request approved", description: "The user can now access their role dashboard." });
      
      // If the request was for a supervisor or security, send them an approval email notification
      if (reqObj && (reqObj.requested_role === "SUPERVISOR" || reqObj.requested_role === "SECURITY") && reqObj.email) {
        try {
          await sendSupervisorStatusEmail({
            email: reqObj.email,
            supervisorName: reqObj.full_name || "User",
            role: reqObj.requested_role,
            status: "APPROVED",
          });
          toast({ title: "Notification sent", description: `Approval email sent successfully to ${reqObj.email}` });
        } catch (emailErr: any) {
          console.error("Failed sending supervisor status email:", emailErr);
          let errorDetails = "Functions HTTP Error";
          if (emailErr.context) {
            try {
              const errJson = await emailErr.context.json();
              errorDetails = errJson.error || errJson.message || JSON.stringify(errJson);
            } catch {
              try {
                errorDetails = await emailErr.context.text();
              } catch {}
            }
          } else {
            errorDetails = emailErr.message || String(emailErr);
          }
          toast({
            title: "Email Delivery Failed",
            description: `Supervisor approved, but notification email could not be sent. Reason: ${errorDetails}`,
            variant: "warning" as any
          });
        }
      }
      
      await fetchUsers();
    } catch (error: any) {
      toast({ title: "Approval failed", description: error.message || "Unable to approve request.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectRoleRequest = async (requestId: string) => {
    setUpdatingId(requestId);
    try {
      const reqObj = roleRequests.find((r) => r.id === requestId);
      await rejectRoleRequest(requestId);
      toast({ title: "Request rejected", description: "The user's account has been marked as rejected." });
      
      // If the request was for a supervisor or security, send them a rejection email notification
      if (reqObj && (reqObj.requested_role === "SUPERVISOR" || reqObj.requested_role === "SECURITY") && reqObj.email) {
        try {
          await sendSupervisorStatusEmail({
            email: reqObj.email,
            supervisorName: reqObj.full_name || "User",
            role: reqObj.requested_role,
            status: "REJECTED",
          });
          toast({ title: "Notification sent", description: `Rejection email sent successfully to ${reqObj.email}` });
        } catch (emailErr: any) {
          console.error("Failed sending supervisor status email:", emailErr);
          let errorDetails = "Functions HTTP Error";
          if (emailErr.context) {
            try {
              const errJson = await emailErr.context.json();
              errorDetails = errJson.error || errJson.message || JSON.stringify(errJson);
            } catch {
              try {
                errorDetails = await emailErr.context.text();
              } catch {}
            }
          } else {
            errorDetails = emailErr.message || String(emailErr);
          }
          toast({
            title: "Email Delivery Failed",
            description: `Supervisor rejected, but notification email could not be sent. Reason: ${errorDetails}`,
            variant: "warning" as any
          });
        }
      }
      
      await fetchUsers();
    } catch (error: any) {
      toast({ title: "Rejection failed", description: error.message || "Unable to reject request.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === myProfile?.id) {
      toast({ title: "Action denied", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    
    if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    
    setUpdatingId(userId);
    try {
      await adminDeleteUser(userId);
      toast({ title: "User deleted", description: "The user has been permanently removed." });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      toast({ title: "Deletion failed", description: error.message || "Unable to delete user.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const postAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) return;
    setAnnLoading(true);
    const { error } = await supabase.from("announcements").insert({
      title: annTitle.trim(), message: annMessage.trim(), created_by: myProfile?.id,
    });
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement posted" });
      setAnnTitle(""); setAnnMessage(""); setShowAnnounce(false);
    }
    setAnnLoading(false);
  };

  const filtered = users.filter((u) => {
    if (profileRoleFilter !== "ALL" && u.role !== profileRoleFilter) return false;
    const q = search.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });


  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <DashboardLayout
        title="Admin Dashboard"
        subtitle="Database-friendly controls for profiles, departments, roles, and announcements."
      >
        {roleRequests.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-amber-600" />
                  role_requests
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Approve supervisor/security accounts before they can access the system.</p>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded-full">
                {roleRequests.length} pending
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {roleRequests.map((request) => (
                <div key={request.id} className="px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{request.full_name || "New user request"}</div>
                    <div className="text-xs text-gray-500 truncate">{request.email || request.user_id}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleStyle[request.requested_role].badge}`}>
                        {request.requested_role}
                      </span>
                      {request.department && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-50 text-gray-600 border-gray-200">
                          {request.department}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#2BB673] hover:bg-[#239a60] text-white gap-1.5"
                      onClick={() => handleApproveRoleRequest(request.id)}
                      disabled={updatingId === request.id}
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                      onClick={() => handleRejectRoleRequest(request.id)}
                      disabled={updatingId === request.id}
                    >
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiConfig.map((kpi, i) => {
            const count = loading
              ? "—"
              : users.filter((u) => u.role === kpi.role).length;
            return (
              <motion.div
                key={kpi.role}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`bg-white border border-gray-200 border-l-4 ${kpi.border} rounded-lg shadow-sm p-5`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {kpi.label}
                    </p>
                    <div className="text-3xl font-bold text-gray-800">
                      {loading
                        ? <span className="inline-block w-8 h-7 rounded bg-gray-100 animate-pulse" />
                        : count}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6 gap-2 bg-white p-1 rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 font-semibold text-sm rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === "users"
                ? "bg-[#243B53] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            profiles
          </button>
          <button
            onClick={() => {
              setActiveTab("audit");
              fetchLeaves();
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 font-semibold text-sm rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === "audit"
                ? "bg-[#243B53] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <TableProperties className="w-4 h-4" />
            leave_applications
          </button>
        </div>

        {activeTab === "users" ? (
          /* User Management Table */
          <div id="users-table" className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <TableProperties className="w-4 h-4 text-[#243B53]" />
                  profiles
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{users.length} rows from profiles joined with departments</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users…"
                    className="pl-9 h-9 w-full sm:w-64 text-sm border-gray-200 bg-gray-50 focus:bg-white"
                    data-testid="input-search-users"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    onClick={fetchUsers}
                    variant="outline"
                    size="sm"
                    className="border-gray-200 text-gray-600 gap-1.5 h-9 text-xs flex-1 sm:flex-initial"
                    disabled={loading}
                    data-testid="button-refresh-users"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync
                  </Button>
                  <Button
                    onClick={downloadProfilesPDF}
                    size="sm"
                    className="bg-[#2BB673] hover:bg-[#239a60] text-white gap-1.5 h-9 text-xs font-semibold shadow-sm flex-1 sm:flex-initial"
                    disabled={users.length === 0}
                  >
                    <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Download PDF Report</span><span className="sm:hidden">PDF</span>
                  </Button>
                  <Button
                    onClick={() => setShowAnnounce(true)}
                    size="sm"
                    className="bg-[#243B53] hover:bg-[#1a2d40] text-white gap-1.5 h-9 text-xs w-full sm:w-auto"
                    data-testid="button-new-announcement"
                  >
                    <Bell className="w-3.5 h-3.5" /> Insert into announcements
                  </Button>
                </div>
              </div>
            </div>

            {/* Role Filter segmented control */}
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500 mr-2 uppercase tracking-wider">Role filter:</span>
              {(["ALL", "STUDENT", "SUPERVISOR", "SECURITY", "ADMIN"] as const).map((roleVal) => {
                const count = roleVal === "ALL" 
                  ? users.length 
                  : users.filter(u => u.role === roleVal).length;
                return (
                  <button
                    key={roleVal}
                    onClick={() => setProfileRoleFilter(roleVal)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      profileRoleFilter === roleVal
                        ? roleVal === 'STUDENT' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' :
                          roleVal === 'SUPERVISOR' ? 'bg-purple-600 border-purple-600 text-white shadow-sm' :
                          roleVal === 'SECURITY' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' :
                          roleVal === 'ADMIN' ? 'bg-red-600 border-red-600 text-white shadow-sm' :
                          'bg-[#243B53] border-[#243B53] text-white shadow-sm'
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {roleVal} ({count})
                  </button>
                );
              })}
            </div>

            {/* Column headers */}
            <div className="hidden md:grid grid-cols-12 px-6 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Profile Row</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-3">Role & Department FK</div>
              <div className="col-span-2 text-right">Update</div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No users match your search</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex flex-col md:grid md:grid-cols-12 px-6 py-4 md:py-3.5 items-start md:items-center hover:bg-gray-50 transition-colors gap-4 md:gap-0"
                    data-testid={`user-row-${user.id}`}
                  >
                    {/* Name */}
                    <div className="md:col-span-4 flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-full bg-[#243B53]/10 border border-[#243B53]/15 flex items-center justify-center text-[#243B53] text-xs font-bold shrink-0">
                        {user.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col md:block justify-center md:justify-start">
                        <div className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1 w-full md:w-auto">
                          <span className="truncate">{user.full_name}</span>
                          {user.id === myProfile?.id && (
                            <span className="text-[10px] font-medium text-[#2BB673] bg-emerald-50 border border-emerald-200 px-1.5 py-0 rounded-full shrink-0">You</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 md:hidden mt-0.5">
                          <ExpandableText text={user.email} threshold={20} />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="hidden md:block md:col-span-3">
                      <span className="text-sm text-gray-500">
                        <ExpandableText text={user.email} threshold={25} />
                      </span>
                    </div>

                    {/* Role badge & Dept */}
                    <div className="md:col-span-3 flex items-center justify-between md:justify-start gap-2 w-full md:w-auto mt-1 md:mt-0">
                      <span className="md:hidden text-xs text-gray-500 font-medium uppercase tracking-wider">Access Info:</span>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleStyle[user.role].badge}`}>
                          <Shield className="w-3 h-3 mr-1" /> {user.role}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          user.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          user.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {user.status === 'APPROVED' ? 'Active' : user.status === 'PENDING' ? 'Pending' : 'Deactivated'}
                        </span>
                        {user.department && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-50 text-gray-600 border-gray-200">
                            <KeyRound className="w-3 h-3 mr-1" /> {user.department}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-1 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-gray-100 md:border-0">
                      <span className="md:hidden text-xs text-gray-500 font-medium uppercase tracking-wider">Actions:</span>
                      <div className="flex justify-end gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 w-7 p-0 border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => setSelectedUserDetails(user)}
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {user.role === "SUPERVISOR" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs border-gray-200 text-gray-600 px-2" disabled={updatingId === user.id}>
                              <Database className="w-3 h-3 mr-1" /> Dept FK <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => assignDepartment(user.id, null)}>None</DropdownMenuItem>
                            {departments.map((department) => (
                              <DropdownMenuItem key={department.id} onClick={() => assignDepartment(user.id, department.name)} className="flex justify-between">
                                {department.name} {user.department === department.name && <Check className="w-3.5 h-3.5 text-[#2BB673]" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-gray-200 text-gray-600 hover:border-gray-300 gap-1 px-2" disabled={updatingId === user.id}>
                            {updatingId === user.id ? "…" : <><Save className="w-3 h-3" /> Actions</>}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <div className="px-2 py-1 text-xs font-semibold text-gray-400">Change Role</div>
                          {ROLES.map((role) => (
                            <DropdownMenuItem key={role} onClick={() => changeRole(user.id, role)} className="flex items-center justify-between text-xs cursor-pointer">
                              <span className={`font-medium ${roleStyle[role].accent}`}>{role}</span>
                              {user.role === role && <Check className="w-3.5 h-3.5 text-[#2BB673]" />}
                            </DropdownMenuItem>
                          ))}
                          <div className="h-px bg-gray-100 my-1 mx-2" />
                          <div className="px-2 py-1 text-xs font-semibold text-gray-400">Account Access</div>
                          <DropdownMenuItem 
                            onClick={() => toggleUserStatus(user.id, user.status)} 
                            className={`flex items-center justify-between text-xs cursor-pointer ${
                              user.status === 'APPROVED' ? 'text-amber-600 focus:text-amber-700 focus:bg-amber-50' : 'text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50'
                            }`}
                          >
                            <span className="font-semibold">{user.status === 'APPROVED' ? 'Deactivate ID' : 'Activate ID'}</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-gray-100 my-1 mx-2" />
                          <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                Showing {filtered.length} of {users.length} users
              </div>
            )}
          </div>
        ) : (
          /* Leave Audit Log Table */
          <div id="audit-table" className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#2BB673]" />
                  leave_applications
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{leaves.length} total leave applications audit trail</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search leave applications…"
                    className="pl-9 h-9 w-full sm:w-64 text-sm border-gray-200 bg-gray-50 focus:bg-white"
                    data-testid="input-search-audit"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={fetchLeaves}
                    variant="outline"
                    size="sm"
                    className="border-gray-200 text-gray-600 gap-1.5 h-9 text-xs flex-1 sm:flex-initial"
                    disabled={loadingLeaves}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaves ? "animate-spin" : ""}`} /> Sync
                  </Button>
                  <Button
                    onClick={downloadAuditPDF}
                    size="sm"
                    className="bg-[#2BB673] hover:bg-[#239a60] text-white gap-1.5 h-9 text-xs font-semibold shadow-sm flex-1 sm:flex-initial"
                    disabled={leaves.length === 0}
                  >
                    <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Download PDF Report</span><span className="sm:hidden">PDF</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Filter segmented control */}
            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500 mr-2 uppercase tracking-wider">Status filter:</span>
              {(["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"] as const).map((status) => {
                const count = status === "ALL" 
                  ? leaves.length 
                  : leaves.filter(l => (l.status?.toUpperCase() || "") === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setAuditStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      auditStatusFilter === status
                        ? status === 'APPROVED' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' :
                          status === 'REJECTED' ? 'bg-red-600 border-red-600 text-white shadow-sm' :
                          status === 'PENDING' ? 'bg-amber-600 border-amber-600 text-white shadow-sm' :
                          status === 'COMPLETED' ? 'bg-blue-600 border-blue-600 text-white shadow-sm' :
                          'bg-[#243B53] border-[#243B53] text-white shadow-sm'
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {status} ({count})
                  </button>
                );
              })}
            </div>

            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-12 px-6 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">Student Details</div>
              <div className="col-span-2">Leave Type & status</div>
              <div className="col-span-2">Date & Timings</div>
              <div className="col-span-2">Destination & Reason</div>
              <div className="col-span-3">Parent Information</div>
            </div>

            {/* Rows */}
            {loadingLeaves ? (
              <div className="divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leaves.filter((l) => {
              if (auditStatusFilter !== "ALL" && (l.status?.toUpperCase() || "") !== auditStatusFilter) return false;
              const q = auditSearch.toLowerCase();
              const student = l.student || {};
              const deptName = student.department?.name || "";
              return (
                (student.full_name || "").toLowerCase().includes(q) ||
                (student.roll_number || "").toLowerCase().includes(q) ||
                (deptName || "").toLowerCase().includes(q) ||
                (l.leave_type || "").toLowerCase().includes(q) ||
                (l.destination || "").toLowerCase().includes(q) ||
                (l.reason || "").toLowerCase().includes(q) ||
                (l.parent_name || "").toLowerCase().includes(q) ||
                (l.parent_phone || "").toLowerCase().includes(q) ||
                (l.parent_email || "").toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No leave logs match your search</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {leaves
                  .filter((l) => {
                    if (auditStatusFilter !== "ALL" && (l.status?.toUpperCase() || "") !== auditStatusFilter) return false;
                    const q = auditSearch.toLowerCase();
                    const student = l.student || {};
                    const deptName = student.department?.name || "";
                    return (
                      (student.full_name || "").toLowerCase().includes(q) ||
                      (student.roll_number || "").toLowerCase().includes(q) ||
                      (deptName || "").toLowerCase().includes(q) ||
                      (l.leave_type || "").toLowerCase().includes(q) ||
                      (l.destination || "").toLowerCase().includes(q) ||
                      (l.reason || "").toLowerCase().includes(q) ||
                      (l.parent_name || "").toLowerCase().includes(q) ||
                      (l.parent_phone || "").toLowerCase().includes(q) ||
                      (l.parent_email || "").toLowerCase().includes(q)
                    );
                  })
                  .map((l, i) => {
                    const student = l.student || {};
                    const deptName = student.department?.name || "N/A";
                    const sUpper = l.status?.toUpperCase() || "";
                    return (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex flex-col lg:grid lg:grid-cols-12 px-6 py-4 items-start lg:items-center hover:bg-gray-50 transition-colors gap-4 lg:gap-0"
                      >
                        {/* Student */}
                        <div className="lg:col-span-3 flex items-center gap-3 w-full">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                            {student.full_name?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div className="flex-1 flex lg:block items-center justify-between lg:justify-start min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">{student.full_name || "Unknown Student"}</div>
                            <div className="text-xs text-gray-400">Roll: {student.roll_number || "N/A"} &bull; <span className="lg:inline hidden">{deptName}</span></div>
                          </div>
                        </div>

                        {/* Leave Type & Status */}
                        <div className="lg:col-span-2 flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-2 w-full lg:w-auto mt-1 lg:mt-0">
                          <span className="lg:hidden text-xs text-gray-500 font-medium uppercase tracking-wider">Leave Info:</span>
                          <div className="flex gap-2 items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                              {l.leave_type}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              sUpper === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              sUpper === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                              sUpper === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {l.status}
                            </span>
                          </div>
                        </div>

                        {/* Date & Timings */}
                        <div className="lg:col-span-2 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start w-full lg:w-auto text-xs text-gray-600 border-t border-gray-100 lg:border-t-0 pt-2 lg:pt-0">
                          <span className="lg:hidden text-xs text-gray-500 font-medium uppercase tracking-wider">Date/Time:</span>
                          <div className="text-right lg:text-left">
                            <div className="font-semibold text-gray-800">{l.from_date} to {l.to_date}</div>
                            <div className="text-gray-400 mt-0.5">{l.out_time} - {l.return_time}</div>
                          </div>
                        </div>

                        {/* Destination & Reason */}
                        <div className="lg:col-span-2 flex flex-row lg:flex-col justify-between lg:justify-start items-start w-full lg:w-auto text-xs text-gray-700 pr-0 lg:pr-2 border-t border-gray-100 lg:border-t-0 pt-2 lg:pt-0">
                          <span className="lg:hidden text-xs text-gray-500 font-medium uppercase tracking-wider min-w-[80px]">Details:</span>
                          <div className="text-right lg:text-left flex-1 pl-2 min-w-0">
                            <div className="font-semibold text-gray-800" title={l.destination}>
                              <ExpandableText text={l.destination || "N/A"} threshold={25} />
                            </div>
                            <div className="text-gray-400 mt-0.5" title={l.reason}>
                              <ExpandableText text={l.reason || "N/A"} lineClampClass="line-clamp-2" threshold={50} />
                            </div>
                          </div>
                        </div>

                        {/* Parent Information */}
                        <div className="lg:col-span-3 flex flex-row lg:flex-col justify-between lg:justify-start items-start w-full lg:w-auto text-xs text-gray-600 border-t border-gray-100 lg:border-t-0 pt-2 lg:pt-0 mt-1 lg:mt-0">
                          <span className="lg:hidden text-xs text-gray-500 font-medium uppercase tracking-wider min-w-[60px]">Parent:</span>
                          <div className="text-right lg:text-left flex-1 pl-2 min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{l.parent_name || "—"}</div>
                            <div className="text-gray-500 mt-0.5 flex flex-col lg:flex-row lg:flex-wrap gap-x-2 gap-y-0.5 items-end lg:items-start justify-end lg:justify-start min-w-0">
                              <span className="w-full text-right lg:text-left lg:w-auto">Ph: {l.parent_phone || "—"}</span>
                              <span className="text-gray-300 hidden lg:inline">|</span>
                              <span className="w-full text-right lg:text-left lg:w-auto">
                                <ExpandableText text={l.parent_email || "—"} threshold={20} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}

            {/* Footer */}
            {!loadingLeaves && leaves.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                Showing {leaves.filter((l) => {
                  if (auditStatusFilter !== "ALL" && (l.status?.toUpperCase() || "") !== auditStatusFilter) return false;
                  const q = auditSearch.toLowerCase();
                  const student = l.student || {};
                  const deptName = student.department?.name || "";
                  return (
                    (student.full_name || "").toLowerCase().includes(q) ||
                    (student.roll_number || "").toLowerCase().includes(q) ||
                    (deptName || "").toLowerCase().includes(q) ||
                    (l.leave_type || "").toLowerCase().includes(q) ||
                    (l.destination || "").toLowerCase().includes(q) ||
                    (l.reason || "").toLowerCase().includes(q) ||
                    (l.parent_name || "").toLowerCase().includes(q) ||
                    (l.parent_phone || "").toLowerCase().includes(q) ||
                    (l.parent_email || "").toLowerCase().includes(q)
                  );
                }).length} of {leaves.length} logs
              </div>
            )}
          </div>

        )}

        {/* Announcement Modal */}
        {showAnnounce && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.97, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#243B53]" />
                  Insert into announcements
                </h2>
                <button
                  onClick={() => setShowAnnounce(false)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                  <Input
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement title…"
                    className="border-gray-200"
                    data-testid="input-ann-title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
                  <Textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Write the announcement message…"
                    rows={4}
                    className="border-gray-200 resize-none"
                    data-testid="input-ann-message"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
                <Button variant="outline" className="border-gray-200 text-gray-600" onClick={() => setShowAnnounce(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={postAnnouncement}
                  disabled={annLoading || !annTitle.trim() || !annMessage.trim()}
                  className="bg-[#243B53] hover:bg-[#1a2d40] text-white"
                  data-testid="button-post-announcement"
                >
                  {annLoading ? "Inserting…" : <><Plus className="w-4 h-4 mr-1" /> Insert Row into announcements</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* User Details Modal */}
        {selectedUserDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.97, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#243B53]" />
                  User Profile Details
                </h2>
                <button
                  onClick={() => setSelectedUserDetails(null)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 block text-xs">Full Name</span> {selectedUserDetails.full_name}</div>
                    <div><span className="text-gray-500 block text-xs">Email</span> {selectedUserDetails.email}</div>
                    <div><span className="text-gray-500 block text-xs">Phone</span> {selectedUserDetails.phone || "—"}</div>
                    <div>
                      <span className="text-gray-500 block text-xs">Role</span> 
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold border ${roleStyle[selectedUserDetails.role].badge}`}>
                        {selectedUserDetails.role}
                      </span>
                    </div>
                    {selectedUserDetails.department && (
                      <div className="col-span-2">
                        <span className="text-gray-500 block text-xs">Department</span>
                        {selectedUserDetails.department}
                      </div>
                    )}
                  </div>
                </div>

                {selectedUserDetails.role === "STUDENT" && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">Hostel & Academic Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-500 block text-xs">Roll Number</span> {selectedUserDetails.roll_number || "—"}</div>
                        <div><span className="text-gray-500 block text-xs">Year</span> {selectedUserDetails.year || "—"}</div>
                        <div><span className="text-gray-500 block text-xs">Hostel Name</span> {selectedUserDetails.hostel_name || "—"}</div>
                        <div><span className="text-gray-500 block text-xs">Room Number</span> {selectedUserDetails.room_number || "—"}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">Parent / Guardian Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="col-span-2"><span className="text-gray-500 block text-xs">Parent Name</span> {selectedUserDetails.parent_name || "—"}</div>
                        <div><span className="text-gray-500 block text-xs">Parent Phone</span> {selectedUserDetails.parent_phone || "—"}</div>
                        <div><span className="text-gray-500 block text-xs">Parent Email</span> {selectedUserDetails.parent_email || "—"}</div>
                      </div>
                    </div>
                  </>
                )}
                
                {selectedUserDetails.role === "SECURITY" && selectedUserDetails.roll_number && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">Guard Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-500 block text-xs">Guard Unique ID</span> {selectedUserDetails.roll_number}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
