// Status badge component with color-coded processing states.

const STATUS_CONFIG = {
    pending:        { label: "Pending",        color: "#92a0cf", bg: "rgba(146,160,207,0.15)" },
    ocr_processing: { label: "OCR Processing", color: "#28c7f0", bg: "rgba(40,199,240,0.15)"  },
    ai_correction:  { label: "AI Correction",  color: "#f0a328", bg: "rgba(240,163,40,0.15)"  },
    completed:      { label: "Completed",       color: "#37d39b", bg: "rgba(55,211,155,0.15)"  },
    failed:         { label: "Failed",          color: "#f05252", bg: "rgba(240,82,82,0.15)"   },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.color}44`,
            whiteSpace: "nowrap",
        }}>
            {status !== "completed" && status !== "failed" && (
                <span style={{
                    width: 7, height: 7,
                    borderRadius: "50%",
                    background: cfg.color,
                    animation: "pulse 1.4s ease-in-out infinite",
                    flexShrink: 0,
                }} />
            )}
            {cfg.label}
        </span>
    );
}

export default StatusBadge;
