import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./supabase";
import Layout from "./Layout";

// Lazy loading or direct imports for all pages
import Landing from "./pages/Landing";
import AdminDashboard from "./pages/AdminDashboard";
import AdminFraud from "./pages/AdminFraud";
import AdminUsers from "./pages/AdminUsers";
import CreateCampaign from "./pages/CreateCampaign";
import CreateAd from "./pages/CreateAd";
import AdminCampaigns from "./pages/AdminCampaigns";
import MyCampaigns from "./pages/MyCampaigns";
import PromoterDashboard from "./pages/PromoterDashboard";
import PromoterStats from "./pages/PromoterStats";
import Prizes from "./pages/Prizes";
import ManagePrizes from "./pages/ManagePrizes";
import ReviewTasks from "./pages/ReviewTasks";
import TaskDetail from "./pages/TaskDetail";
import Tasks from "./pages/Tasks";
import WorkerBalance from "./pages/WorkerBalance";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerHistory from "./pages/WorkerHistory";
import DailyMissions from "./pages/DailyMissions";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Ranking from "./pages/Ranking";
import Settings from "./pages/Settings";
import PromoterMissionManager from "./pages/PromoterMissionManager";
import SocialTasks from "./pages/SocialTasks";
import CreateSocialTask from "./pages/CreateSocialTask";
import SocialReview from "./pages/SocialReview";
import AdminFeed from "./pages/AdminFeed";
import AdminBanners from "./pages/AdminBanners";
import AdminLogs from "./pages/AdminLogs";
import ExploreNew from "./pages/ExploreNew";
import CampaignPage from "./pages/CampaignPage";





import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Referrals from "./pages/Referrals";

function AppRoutes() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("clickwin_ref", ref);
    }
  }, []);

  useEffect(() => {
    async function trackReferral() {
      if (user?.id) {
        const storedRef = sessionStorage.getItem("clickwin_ref");
        if (storedRef && storedRef !== user.id) {
          try {
            await supabase.from("referrals").insert({
              invited_user: user.id,
              referrer_user: storedRef
            });
            sessionStorage.removeItem("clickwin_ref");
          } catch (err) {
            // Ignore if already referred (unique constraint)
            console.warn("Referral tracking skipped:", err.message);
            sessionStorage.removeItem("clickwin_ref");
          }
        }
      }
    }
    trackReferral();
  }, [user]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }} className="text-gray-400 font-medium">
        Cargando aplicación...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout currentPageName="Landing"><Landing /></Layout>} />
      <Route path="/login" element={<Layout currentPageName="Login"><Login /></Layout>} />
      <Route path="/register" element={<Layout currentPageName="Register"><Register /></Layout>} />

      {/* Social Feed */}
      <Route path="/feed" element={<Layout currentPageName="Feed"><Feed /></Layout>} />

      {/* Worker Routes */}
      <Route path="/worker-dashboard" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Worker Dashboard"><WorkerDashboard /></Layout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Tasks"><Tasks /></Layout></ProtectedRoute>} />
      <Route path="/tasks/campaign/:campaignId" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Task Detail"><TaskDetail /></Layout></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Task Detail"><TaskDetail /></Layout></ProtectedRoute>} />
      <Route path="/worker-balance" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Worker Balance"><WorkerBalance /></Layout></ProtectedRoute>} />
      <Route path="/worker-history" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Worker History"><WorkerHistory /></Layout></ProtectedRoute>} />
      <Route path="/daily-missions" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Daily Missions"><DailyMissions /></Layout></ProtectedRoute>} />
      <Route path="/prizes" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Prizes"><Prizes /></Layout></ProtectedRoute>} />
      <Route path="/ranking" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Ranking"><Ranking /></Layout></ProtectedRoute>} />
      <Route path="/social-tasks" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Crecimiento Social"><SocialTasks /></Layout></ProtectedRoute>} />
      <Route path="/create-social-task" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Nueva Misión Social"><CreateSocialTask /></Layout></ProtectedRoute>} />
      <Route path="/social-review" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Revisiones Sociales"><SocialReview /></Layout></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute permission="VIEW_TASKS"><Layout currentPageName="Referidos"><Referrals /></Layout></ProtectedRoute>} />




      {/* Promoter Routes */}
      <Route path="/promoter-dashboard" element={<ProtectedRoute permission="CREATE_CAMPAIGN"><Layout currentPageName="Promoter Dashboard"><PromoterDashboard /></Layout></ProtectedRoute>} />
      <Route path="/my-campaigns" element={<ProtectedRoute permission="CREATE_CAMPAIGN"><Layout currentPageName="My Campaigns"><MyCampaigns /></Layout></ProtectedRoute>} />
      <Route path="/create-campaign" element={<ProtectedRoute permission="CREATE_CAMPAIGN"><Layout currentPageName="Create Campaign"><CreateCampaign /></Layout></ProtectedRoute>} />
      <Route path="/publish-ad" element={<ProtectedRoute permission="CREATE_CAMPAIGN"><Layout currentPageName="Publish Ad"><CreateAd /></Layout></ProtectedRoute>} />
      <Route path="/review-tasks" element={<ProtectedRoute permission="REVIEW_TASKS"><Layout currentPageName="Review Tasks"><ReviewTasks /></Layout></ProtectedRoute>} />
      <Route path="/promoter-stats" element={<ProtectedRoute permission="VIEW_STATS"><Layout currentPageName="Promoter Stats"><PromoterStats /></Layout></ProtectedRoute>} />
      <Route path="/promoter-mission-manager" element={<ProtectedRoute permission="MANAGE_MISSIONS"><Layout currentPageName="Promoter Mission Manager"><PromoterMissionManager /></Layout></ProtectedRoute>} />
      <Route path="/manage-prizes" element={<ProtectedRoute permission="CREATE_CAMPAIGN"><Layout currentPageName="Manage Prizes"><ManagePrizes /></Layout></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin-dashboard" element={<ProtectedRoute permission="MANAGE_USERS"><Layout currentPageName="Admin Dashboard"><AdminDashboard /></Layout></ProtectedRoute>} />
      <Route path="/admin-users" element={<ProtectedRoute permission="MANAGE_USERS"><Layout currentPageName="Admin Users"><AdminUsers /></Layout></ProtectedRoute>} />
      <Route path="/admin-campaigns" element={<ProtectedRoute permission="MANAGE_CAMPAIGNS"><Layout currentPageName="Admin Campaigns"><AdminCampaigns /></Layout></ProtectedRoute>} />
      <Route path="/admin-fraud" element={<ProtectedRoute permission="MANAGE_FRAUD"><Layout currentPageName="Admin Fraud"><AdminFraud /></Layout></ProtectedRoute>} />
      <Route path="/admin-feed"    element={<ProtectedRoute permission="MANAGE_USERS"><Layout currentPageName="Admin Feed"><AdminFeed /></Layout></ProtectedRoute>} />
      <Route path="/admin-banners" element={<ProtectedRoute permission="MANAGE_USERS"><Layout currentPageName="Admin Banners"><AdminBanners /></Layout></ProtectedRoute>} />
      <Route path="/admin-logs"    element={<ProtectedRoute permission="MANAGE_USERS"><Layout currentPageName="Audit Logs"><AdminLogs /></Layout></ProtectedRoute>} />

      {/* Shared Routes */}
      <Route path="/explore-new" element={<Layout currentPageName="Explorar"><ExploreNew /></Layout>} />
      <Route path="/campaign/:id" element={<Layout currentPageName="Campaña"><CampaignPage /></Layout>} />
      <Route path="/settings" element={<ProtectedRoute><Layout currentPageName="Settings"><Settings /></Layout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

