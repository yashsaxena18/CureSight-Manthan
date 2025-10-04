import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import Auth Context
import { AuthProvider } from "./contexts/AuthContext";

// Import Components
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import DoctorProtectedRoute from "./components/DoctorProtectedRoute";

// Import Public Pages
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";

// Import Doctor Auth Pages
import DoctorSignIn from "./pages/DoctorSignIn";
import DoctorSignUp from "./pages/DoctorSignUp";

// Import Patient Pages
import Dashboard from "./pages/Dashboard";
import SymptomChecker from "./pages/SymptomChecker";
import ReportAnalyzer from "./pages/ReportAnalyzer";
import CancerDetection from "./pages/CancerDetection";
import FindDoctors from "./pages/FindDoctors";
import DoctorProfile from "./pages/DoctorProfile";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";
import AppointmentDetails from "./pages/AppointmentDetails"; // 🔧 NEW: Added AppointmentDetails
import EmergencyPractice from "./pages/EmergencyPractice";
import MedicineComparison from "./pages/MedicineComparison";
import DailyMonitoring from "./pages/DailyMonitoring";

// Import Doctor Pages (FIXED PATHS)
import DoctorDashboard from "./pages/DoctorDashboard";

// Import existing pages instead:
import DoctorPatients from "./pages/DoctorPatients";
import DoctorSchedule from "./pages/DoctorSchedule";
import DoctorSettings from "./pages/DoctorSettings";
import PatientConsultation from "./pages/PatientConsultation";
import VideoConsultation from "./pages/VideoConsultation";
import PatientChat from "./pages/PatientChat";
import VoiceCall from "./pages/VoiceCall";
import VideoCenterDashboard from "./pages/VideoCenterDashboard";
import ChatCenterDashboard from "./pages/ChatCenterDashboard";
import VoiceCenterDashboard from "./pages/VoiceCenterDashboard";
import PatientDetailPage from "./pages/PatientDetailPage";
import NewConsultation from "./pages/NewConsultation";
import MyConsultations from "./pages/MyConsultations"; // 🔧 NEW: Added MyConsultations

// Import Admin Pages
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminDoctorVerification from "./pages/AdminDoctorVerification";
import AdminDoctorReview from "./pages/AdminDoctorReview";

// Import Settings & Profile Pages
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />

                {/* Authentication Routes */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Doctor Authentication Routes */}
                <Route path="/doctor-signin" element={<DoctorSignIn />} />
                <Route path="/doctor-signup" element={<DoctorSignUp />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <AdminProtectedRoute>
                      <AdminDashboard />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/doctors/verification"
                  element={
                    <AdminProtectedRoute requiredPermission="verify_doctors">
                      <AdminDoctorVerification />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="/admin/doctors/:doctorId/review"
                  element={
                    <AdminProtectedRoute requiredPermission="verify_doctors">
                      <AdminDoctorReview />
                    </AdminProtectedRoute>
                  }
                />

                {/* Patient Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* AI Health Tools - Patient Routes */}
                <Route
                  path="/symptom-checker"
                  element={
                    <ProtectedRoute>
                      <SymptomChecker />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report-analyzer"
                  element={
                    <ProtectedRoute>
                      <ReportAnalyzer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cancer-detection"
                  element={
                    <ProtectedRoute>
                      <CancerDetection />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Search & Booking - Patient Routes */}
                <Route
                  path="/find-doctors"
                  element={
                    <ProtectedRoute>
                      <FindDoctors />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctors/:doctorId"
                  element={
                    <ProtectedRoute>
                      <DoctorProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/book-appointment/:doctorId"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <BookAppointment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-appointments"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <MyAppointments />
                    </ProtectedRoute>
                  }
                />
                {/* 🔧 NEW: Appointment Details Route */}
                <Route
                  path="/appointments/:appointmentId"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <AppointmentDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/video-consultation/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <VideoConsultation />
                    </DoctorProtectedRoute>
                  }
                />

                <Route
                  path="/doctor/chat/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <PatientChat />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/video-consultation"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <VideoConsultation />
                    </DoctorProtectedRoute>
                  }
                />

                <Route
                  path="/doctor/voice-calls/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <VoiceCall />
                    </DoctorProtectedRoute>
                  }
                />

                <Route
                  path="/doctor/voice-calls"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <VoiceCall />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/chat-center/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <PatientChat />
                    </DoctorProtectedRoute>
                  }
                />

                <Route
                  path="/doctor/chat-center"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <PatientChat />
                    </DoctorProtectedRoute>
                  }
                />

                <Route
                  path="/doctor/video-center"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <VideoCenterDashboard />
                    </DoctorProtectedRoute>
                  }
                />

                <Route
                  path="/doctor/chat-center"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <ChatCenterDashboard />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/voice-center"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <VoiceCenterDashboard />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/patient-detail/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <PatientDetailPage />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/consultation/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <NewConsultation />
                    </DoctorProtectedRoute>
                  }
                />

                {/* Other Patient Features */}
                <Route
                  path="/emergency-practice"
                  element={
                    <ProtectedRoute>
                      <EmergencyPractice />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medicine-comparison"
                  element={
                    <ProtectedRoute>
                      <MedicineComparison />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/daily-monitoring"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <DailyMonitoring />
                    </ProtectedRoute>
                  }
                />
                <Route path="/my-consultations" element={<MyConsultations />} />

                {/* Patient Profile & Settings */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute requiredRole="patient">
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Protected Routes */}
                <Route
                  path="/doctor-dashboard"
                  element={
                    <DoctorProtectedRoute>
                      <DoctorDashboard />
                    </DoctorProtectedRoute>
                  }
                />

                {/* Doctor Management Routes */}
                <Route
                  path="/doctor/patients"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <DoctorPatients />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/appointments"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <DoctorPatients />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/schedule"
                  element={
                    <DoctorProtectedRoute>
                      <DoctorSchedule />
                    </DoctorProtectedRoute>
                  }
                />

                {/* Doctor Profile & Settings */}
                <Route
                  path="/doctor/profile"
                  element={
                    <DoctorProtectedRoute>
                      <DoctorProfile />
                    </DoctorProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/settings"
                  element={
                    <DoctorProtectedRoute>
                      <DoctorSettings />
                    </DoctorProtectedRoute>
                  }
                />

                {/* Doctor Consultation Routes */}
                <Route
                  path="/doctor/consultation/:patientId"
                  element={
                    <DoctorProtectedRoute requireVerification={true}>
                      <PatientConsultation />
                    </DoctorProtectedRoute>
                  }
                />

                {/* Shared Emergency Route */}
                <Route
                  path="/emergency"
                  element={
                    <ProtectedRoute>
                      <EmergencyPractice />
                    </ProtectedRoute>
                  }
                />

                {/* Dynamic Redirects */}
                <Route
                  path="/login"
                  element={<Navigate to="/signin" replace />}
                />
                <Route
                  path="/register"
                  element={<Navigate to="/signup" replace />}
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
