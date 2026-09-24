
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import AppDownload from "./pages/AppDownload";
import NotFound from "./pages/NotFound";
import RustoreAssets from "./pages/RustoreAssets";
import AppStoreAssets from "./pages/AppStoreAssets";
import { useEffect } from "react";
import { startAutoFlush } from "@/data/photoQueue";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => startAutoFlush(), []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/app" element={<AppDownload />} />
          <Route path="/rustore" element={<RustoreAssets />} />
          <Route path="/appstore" element={<AppStoreAssets />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;