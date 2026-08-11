import React from "react";
import { createRoot } from "react-dom/client";
import BusinessSuite from "../app/business-suite";
import "../app/globals.css";
import "../app/suite.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BusinessSuite
      supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
      supabaseKey={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}
    />
  </React.StrictMode>,
);
