import { Circle } from "lucide-react";
import "./MarginBadge.css";

function getMarginStatus(margin) {
  const numericMargin = Number(margin);

  if (!Number.isFinite(numericMargin)) {
    return {
      level: "unknown",
      label: "Unavailable",
      value: "—",
    };
  }

  if (numericMargin < 12) {
    return {
      level: "low",
      label: "Low Margin",
      value: `${numericMargin.toFixed(1)}%`,
    };
  }

  if (numericMargin <= 25) {
    return {
      level: "healthy",
      label: "Healthy Margin",
      value: `${numericMargin.toFixed(1)}%`,
    };
  }

  return {
    level: "excellent",
    label: "Excellent Margin",
    value: `${numericMargin.toFixed(1)}%`,
  };
}

function MarginBadge({ margin }) {
  const status = getMarginStatus(margin);

  return (
    <div className={`margin-badge margin-badge--${status.level}`}>
      <div className="margin-badge-value">
        <Circle
          className="margin-badge-indicator"
          aria-hidden="true"
        />

        <strong>{status.value}</strong>
      </div>

      <span className="margin-badge-label">
        {status.label}
      </span>
    </div>
  );
}

export default MarginBadge;