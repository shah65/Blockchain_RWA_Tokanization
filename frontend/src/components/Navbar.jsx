// ============================================================================
// src/components/Navbar.jsx
// ============================================================================
import { Link, NavLink } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "../context/AuthContext";

// --- Inline icons (no icon library needed) --------------------------------
function Icon({ name, size = 18 }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "logo":
      return (
        <svg {...p} viewBox="0 0 32 32" width={28} height={28}>
          <path d="M16 3 4 9v14l12 6 12-6V9L16 3Z" />
          <path d="M16 11v10M11 14l5 3 5-3" />
        </svg>
      );
    case "grid":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "store":
      return (
        <svg {...p}>
          <path d="M3 9 5 4h14l2 5M3 9v10h18V9M3 9h18" />
          <path d="M9 13a3 3 0 0 0 6 0" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4" />
        </svg>
      );
    case "logout":
      return (
        <svg {...p}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    default:
      return null;
  }
}

// --- A single nav link with icon + active state ---------------------------
function NavItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `nav-item ${isActive ? "nav-item-active" : ""}`
      }
    >
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </NavLink>
  );
}

export default function Navbar() {
  const { role, profile, logout } = useAuth();
  const ready = Boolean(profile?.full_name && profile.full_name.trim());

  return (
    <header className="nav-shell">
      <nav className="nav-inner">
        {/* Left: brand */}
        <Link to="/" className="nav-brand">
          <span className="nav-brand-mark">
            <Icon name="logo" />
          </span>
          <span className="nav-brand-text">
            RWA
            <small>Tokenization</small>
          </span>
        </Link>

        {/* Center: role-specific links */}
        <div className="nav-links">
          {ready && role === "business_owner" && (
            <>
              <NavItem to="/owner" icon="grid">
                Dashboard
              </NavItem>
              {/* <NavItem to="/owner/create-business" icon="plus">
                New Business
              </NavItem> */}
            </>
          )}

          {ready && role === "investor" && (
            <>
              <NavItem to="/investor" icon="grid">
                Dashboard
              </NavItem>
              <NavItem to="/investor/marketplace" icon="store">
                Marketplace
              </NavItem>
              <NavItem to="/investor/portfolio" icon="chart">
                Portfolio
              </NavItem>
            </>
          )}
        </div>

        {/* Right: wallet + logout */}
        <div className="nav-actions">
          <WalletMultiButton className="nav-wallet" />
          <button
            type="button"
            className="nav-logout"
            onClick={logout}
            title="Log out"
          >
            <Icon name="logout" size={16} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}