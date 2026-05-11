// Status badge component with color-coded processing states.

const STATUS_CONFIG = {
    pending: { label: "Pending", color: "var(--text-muted)", bg: "color-mix(in srgb, var(--text-muted) 22%, transparent 78%)" },
    ocr_processing: { label: "OCR Processing", color: "var(--accent-alt)", bg: "var(--accent-alt-soft)" },
    ai_correction: { label: "AI Correction", color: "var(--warn)", bg: "color-mix(in srgb, var(--warn) 18%, transparent 82%)" },
    completed: { label: "Completed", color: "var(--ok)", bg: "var(--ok-soft)" },
    failed: { label: "Failed", color: "var(--danger)", bg: "var(--danger-soft)" },
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
