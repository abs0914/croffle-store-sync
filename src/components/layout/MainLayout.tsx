
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "../ui/spinner";

export function MainLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-croffle-background">
        <Spinner className="h-8 w-8 text-croffle-accent" />
        <span className="ml-2 text-croffle-primary font-semibold">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="w-64 hidden md:block" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
