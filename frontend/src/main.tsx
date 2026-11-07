import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./index.css";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { EmptyState, Loading } from "./components/ui";
import { Layout } from "./components/Layout";

const Overview = lazy(() => import("./pages/Overview"));
const MapPage = lazy(() => import("./pages/MapPage"));
const StatesPage = lazy(() => import("./pages/StatesPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const TrendsPage = lazy(() => import("./pages/TrendsPage"));
const PreventionPage = lazy(() => import("./pages/PreventionPage"));
const EmergencyPage = lazy(() => import("./pages/EmergencyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SourcesPage = lazy(() => import("./pages/SourcesPage"));

function NotFound() {
  return (
    <EmptyState title="Page not found">
      That address does not exist. <Link className="text-accent underline" to="/">Return to the overview</Link>.
    </EmptyState>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="mx-auto max-w-[1400px] p-6"><Loading label="Loading page" height={320} /></div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="map" element={<MapPage />} />
            <Route path="states" element={<StatesPage />} />
            <Route path="states/:code" element={<StatesPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="financial" element={<FinancialPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="prevention" element={<PreventionPage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
