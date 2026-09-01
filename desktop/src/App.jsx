import { useState } from "react";

import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import POS from "./pages/POS/POS";
import Products from "./pages/Products/Products";
import Settings from "./components/settings/Settings";


function App() {
  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);

  const [
    currentPage,
    setCurrentPage,
  ] = useState("dashboard");


  function handleLogin() {
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  }


  function handleLogout() {
    setIsLoggedIn(false);
    setCurrentPage("dashboard");
  }


  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }


  /* =========================================
     POS
  ========================================= */

  if (currentPage === "pos") {
    return (
      <POS
        onBackToDashboard={() =>
          setCurrentPage(
            "dashboard",
          )
        }
        onLogout={
          handleLogout
        }
      />
    );
  }


  /* =========================================
     PRODUCTS
  ========================================= */

  if (
    currentPage ===
    "products"
  ) {
    return (
      <Products
        onBackToDashboard={() =>
          setCurrentPage(
            "dashboard",
          )
        }
        onLogout={
          handleLogout
        }
      />
    );
  }


  /* =========================================
     SETTINGS
  ========================================= */

  if (
    currentPage ===
    "settings"
  ) {
    return (
      <Settings
        onBackToDashboard={() =>
          setCurrentPage(
            "dashboard",
          )
        }
      />
    );
  }


  /* =========================================
     DASHBOARD
  ========================================= */

  return (
    <Dashboard
      onOpenPOS={() =>
        setCurrentPage(
          "pos",
        )
      }
      onOpenProducts={() =>
        setCurrentPage(
          "products",
        )
      }
      onOpenSettings={() =>
        setCurrentPage(
          "settings",
        )
      }
      onLogout={
        handleLogout
      }
    />
  );
}


export default App;