import { ShieldCheck, ShieldAlert, Clock3, ShieldQuestion } from "lucide-react";
import "./KYCBadge.css";

const MAP = {
  approved: { label: "KYC Verified", icon: ShieldCheck, className: "kyc-badge kyc-approved" },
  pending: { label: "Under Review", icon: Clock3, className: "kyc-badge kyc-pending" },
  rejected: { label: "Verification Failed", icon: ShieldAlert, className: "kyc-badge kyc-rejected" },
  not_started: { label: "Not Verified", icon: ShieldQuestion, className: "kyc-badge kyc-none" },
};

export default function KYCBadge({ status = "not_started", size = "md", showLabel = true }) {
  const cfg = MAP[status] || MAP.not_started;
  const Icon = cfg.icon;
  return (
    <span className={`${cfg.className} kyc-${size}`} title={cfg.label}>
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2.4} />
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}