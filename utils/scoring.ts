// Utility functions for scoring and compatibility levels
export const getCompatibilityLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", color: "#059669", bgColor: "#D1FAE5", emoji: "🎯" };
    if (score >= 60) return { level: "Good", color: "#D97706", bgColor: "#FEF3C7", emoji: "👍" };
    if (score >= 40) return { level: "Fair", color: "#DC2626", bgColor: "#FEE2E2", emoji: "⚠️" };
    return { level: "Limited", color: "#6B7280", bgColor: "#F3F4F6", emoji: "🤔" };
};

export const getScoreColor = (score: number) => {
    if (score >= 80) return "#059669";
    if (score >= 60) return "#D97706";
    return "#DC2626";
};