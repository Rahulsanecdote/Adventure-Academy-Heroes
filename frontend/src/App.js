import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";

// Pages
import LandingPage from "@/pages/LandingPage";
import ParentSignup from "@/pages/ParentSignup";
import ParentLogin from "@/pages/ParentLogin";
import Onboarding from "@/pages/Onboarding";
import AdventureHub from "@/pages/AdventureHub";
import MathMountain from "@/pages/MathMountain";
import ParentDashboard from "@/pages/ParentDashboard";

import "@/App.css";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/parent/signup" element={<ParentSignup />} />
            <Route path="/parent/login" element={<ParentLogin />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/adventure-hub" element={<AdventureHub />} />
            <Route path="/math-mountain" element={<MathMountain />} />
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;