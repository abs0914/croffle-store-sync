
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth';
import { StoreProvider } from './contexts/StoreContext';
import { ShiftProvider } from './contexts/shift';
import { CartProvider } from './contexts/cart/CartProvider';
import Login from './pages/Login';
import Index from './pages/Index';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainAppRoutes } from './components/app/MainAppRoutes';
import { AdminAppRoutes } from './components/app/AdminAppRoutes';

const queryClient = new QueryClient();

function App() {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <StoreProvider>
            <ShiftProvider>
              <CartProvider>
                <QueryClientProvider client={queryClient}>
                  <div className="min-h-screen bg-background">
                    <Routes>
                      {/* Root route */}
                      <Route path="/" element={<Index />} />
                      
                      <Route path="/login" element={<Login />} />
                      
                      {/* Main Application Routes */}
                      {MainAppRoutes()}
                      
                      {/* Admin Routes */}
                      {AdminAppRoutes()}
                    </Routes>
                    <Toaster />
                  </div>
                </QueryClientProvider>
              </CartProvider>
            </ShiftProvider>
          </StoreProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
