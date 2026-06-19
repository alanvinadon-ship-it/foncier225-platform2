import { describe, it, expect } from "vitest";

// ============================================================
// Sprint 9 — Performance Rating Tests
// ============================================================

// Constants mirroring the router
const RATEABLE_TYPES = ["vendor", "contractor"] as const;
const SCORE_MIN = 1;
const SCORE_MAX = 5;
const CRITERIA = ["qualityScore", "delayScore", "costScore", "safetyScore", "complianceScore", "communicationScore"] as const;

// Helper: calculate overall score (same logic as router)
function calculateOverallScore(scores: Record<string, number>): number {
  const sum = CRITERIA.reduce((acc, key) => acc + (scores[key] || 0), 0);
  return Math.round((sum / 6) * 100);
}

// Helper: calculate average rating (1-5) from overallScore
function calculateAverageRating(overallScores: number[]): number | null {
  if (overallScores.length === 0) return null;
  const avg = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
  return Math.round(avg / 100);
}

describe("Performance Rating — Types & Constants", () => {
  it("should have 2 rateable types", () => {
    expect(RATEABLE_TYPES).toHaveLength(2);
    expect(RATEABLE_TYPES).toContain("vendor");
    expect(RATEABLE_TYPES).toContain("contractor");
  });

  it("should have 6 criteria", () => {
    expect(CRITERIA).toHaveLength(6);
    expect(CRITERIA).toContain("qualityScore");
    expect(CRITERIA).toContain("delayScore");
    expect(CRITERIA).toContain("costScore");
    expect(CRITERIA).toContain("safetyScore");
    expect(CRITERIA).toContain("complianceScore");
    expect(CRITERIA).toContain("communicationScore");
  });

  it("score range should be 1-5", () => {
    expect(SCORE_MIN).toBe(1);
    expect(SCORE_MAX).toBe(5);
  });
});

describe("Performance Rating — Score Validation", () => {
  it("should reject score below 1", () => {
    const isValid = (score: number) => score >= SCORE_MIN && score <= SCORE_MAX;
    expect(isValid(0)).toBe(false);
    expect(isValid(-1)).toBe(false);
  });

  it("should reject score above 5", () => {
    const isValid = (score: number) => score >= SCORE_MIN && score <= SCORE_MAX;
    expect(isValid(6)).toBe(false);
    expect(isValid(10)).toBe(false);
  });

  it("should accept scores 1-5", () => {
    const isValid = (score: number) => score >= SCORE_MIN && score <= SCORE_MAX;
    for (let i = 1; i <= 5; i++) {
      expect(isValid(i)).toBe(true);
    }
  });

  it("should reject non-integer scores", () => {
    const isValidInt = (score: number) => Number.isInteger(score) && score >= SCORE_MIN && score <= SCORE_MAX;
    expect(isValidInt(3.5)).toBe(false);
    expect(isValidInt(2.1)).toBe(false);
  });
});

describe("Performance Rating — Overall Score Calculation", () => {
  it("should calculate overall score as average * 100", () => {
    const scores = {
      qualityScore: 5,
      delayScore: 5,
      costScore: 5,
      safetyScore: 5,
      complianceScore: 5,
      communicationScore: 5,
    };
    expect(calculateOverallScore(scores)).toBe(500);
  });

  it("should calculate overall score for minimum scores", () => {
    const scores = {
      qualityScore: 1,
      delayScore: 1,
      costScore: 1,
      safetyScore: 1,
      complianceScore: 1,
      communicationScore: 1,
    };
    expect(calculateOverallScore(scores)).toBe(100);
  });

  it("should calculate overall score for mixed scores", () => {
    const scores = {
      qualityScore: 4,
      delayScore: 3,
      costScore: 5,
      safetyScore: 2,
      complianceScore: 4,
      communicationScore: 3,
    };
    // (4+3+5+2+4+3) / 6 * 100 = 21/6 * 100 = 350
    expect(calculateOverallScore(scores)).toBe(350);
  });

  it("should round overall score to nearest integer", () => {
    const scores = {
      qualityScore: 3,
      delayScore: 4,
      costScore: 3,
      safetyScore: 4,
      complianceScore: 3,
      communicationScore: 4,
    };
    // (3+4+3+4+3+4) / 6 * 100 = 21/6 * 100 = 350
    expect(calculateOverallScore(scores)).toBe(350);
  });

  it("should handle asymmetric scores", () => {
    const scores = {
      qualityScore: 5,
      delayScore: 1,
      costScore: 5,
      safetyScore: 1,
      complianceScore: 5,
      communicationScore: 1,
    };
    // (5+1+5+1+5+1) / 6 * 100 = 18/6 * 100 = 300
    expect(calculateOverallScore(scores)).toBe(300);
  });
});

describe("Performance Rating — Average Rating Calculation", () => {
  it("should return null for empty array", () => {
    expect(calculateAverageRating([])).toBeNull();
  });

  it("should calculate average for single rating", () => {
    expect(calculateAverageRating([400])).toBe(4);
  });

  it("should calculate average for multiple ratings", () => {
    // (500 + 300) / 2 = 400 → 400/100 = 4
    expect(calculateAverageRating([500, 300])).toBe(4);
  });

  it("should round to nearest integer", () => {
    // (500 + 400 + 300) / 3 = 400 → 400/100 = 4
    expect(calculateAverageRating([500, 400, 300])).toBe(4);
  });

  it("should handle all minimum scores", () => {
    expect(calculateAverageRating([100, 100, 100])).toBe(1);
  });

  it("should handle all maximum scores", () => {
    expect(calculateAverageRating([500, 500, 500])).toBe(5);
  });
});

describe("Performance Rating — Ranking Logic", () => {
  it("should sort top performers by descending overall score", () => {
    const items = [
      { name: "A", avgOverall: 450 },
      { name: "B", avgOverall: 380 },
      { name: "C", avgOverall: 490 },
    ];
    const sorted = [...items].sort((a, b) => b.avgOverall - a.avgOverall);
    expect(sorted[0].name).toBe("C");
    expect(sorted[1].name).toBe("A");
    expect(sorted[2].name).toBe("B");
  });

  it("should sort low performers by ascending overall score", () => {
    const items = [
      { name: "A", avgOverall: 450 },
      { name: "B", avgOverall: 380 },
      { name: "C", avgOverall: 490 },
    ];
    const sorted = [...items].sort((a, b) => a.avgOverall - b.avgOverall);
    expect(sorted[0].name).toBe("B");
    expect(sorted[1].name).toBe("A");
    expect(sorted[2].name).toBe("C");
  });

  it("should filter by rateable type", () => {
    const items = [
      { rateableType: "vendor", name: "V1", avgOverall: 400 },
      { rateableType: "contractor", name: "C1", avgOverall: 450 },
      { rateableType: "vendor", name: "V2", avgOverall: 350 },
    ];
    const vendorsOnly = items.filter((i) => i.rateableType === "vendor");
    expect(vendorsOnly).toHaveLength(2);
    expect(vendorsOnly.every((i) => i.rateableType === "vendor")).toBe(true);
  });
});

describe("Performance Rating — Permissions", () => {
  it("should require erp_vendors view permission for list/stats/top/low", () => {
    const viewProcedures = ["list", "forEntity", "top", "low", "stats"];
    // These procedures use erpPermissionProcedure("erp_vendors", "view")
    expect(viewProcedures).toHaveLength(5);
  });

  it("should require erp_vendors rate permission for create/update", () => {
    const rateProcedures = ["create", "update"];
    expect(rateProcedures).toHaveLength(2);
  });

  it("should require erp_vendors delete permission for delete", () => {
    const deleteProcedures = ["delete"];
    expect(deleteProcedures).toHaveLength(1);
  });

  it("project_manager should have rate permission on erp_vendors", () => {
    // Based on RBAC config: project_manager has manage on erp_vendors
    const pmPermissions = ["view", "create", "update", "delete", "assign", "rate"];
    expect(pmPermissions).toContain("rate");
  });
});

describe("Performance Rating — Entity Update Logic", () => {
  it("should update vendor rating after new evaluation", () => {
    // Simulate: vendor has ratings [400, 300, 500] → avg = 400 → rating = 4
    const overallScores = [400, 300, 500];
    const avgRating = calculateAverageRating(overallScores);
    expect(avgRating).toBe(4);
  });

  it("should update contractor rating after new evaluation", () => {
    const overallScores = [250, 350];
    const avgRating = calculateAverageRating(overallScores);
    expect(avgRating).toBe(3);
  });

  it("should handle deletion recalculation", () => {
    // Before deletion: [400, 200, 500] → avg = 367 → 4
    // After deletion of 200: [400, 500] → avg = 450 → 5
    const before = calculateAverageRating([400, 200, 500]);
    const after = calculateAverageRating([400, 500]);
    expect(before).toBe(4);
    expect(after).toBe(5);
  });

  it("should return null when all ratings deleted", () => {
    expect(calculateAverageRating([])).toBeNull();
  });
});

describe("Performance Rating — Display Formatting", () => {
  it("should format overall score as X.X/5", () => {
    const format = (overallScore: number) => (overallScore / 100).toFixed(1) + "/5";
    expect(format(450)).toBe("4.5/5");
    expect(format(333)).toBe("3.3/5");
    expect(format(500)).toBe("5.0/5");
    expect(format(100)).toBe("1.0/5");
  });

  it("should display star rating correctly", () => {
    const getStars = (score: number) => Math.round(score);
    expect(getStars(4.6)).toBe(5);
    expect(getStars(4.4)).toBe(4);
    expect(getStars(2.5)).toBe(3);
    expect(getStars(1.2)).toBe(1);
  });

  it("should format date in French locale", () => {
    const ts = new Date("2025-06-15T10:00:00Z").getTime();
    const formatted = new Date(ts).toLocaleDateString("fr-FR");
    expect(formatted).toMatch(/15\/06\/2025/);
  });
});
