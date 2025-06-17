
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import CustomerForm from "@/pages/Stores/CustomerForm";
import CustomerFormPreview from "@/pages/Stores/CustomerFormPreview";
import { AdminRoutes } from "./AdminRoutes";
import { ProtectedRoutes } from "./ProtectedRoutes";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/customer-form/:storeId" element={<CustomerForm />} />
      <Route path="/customer-form-preview/:storeId" element={<CustomerFormPreview />} />

      {/* Admin routes - call as function to get the fragment content */}
      {AdminRoutes()}

      {/* Protected app routes - call as function to get the fragment content */}
      {ProtectedRoutes()}
    </Routes>
  );
}
