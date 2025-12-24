
export enum RiskLevel {
  LOW = 'Bajo',
  MEDIUM = 'Medio',
  HIGH = 'Alto'
}

export interface UserStats {
  usedToday: number;
  riskLevel: RiskLevel;
  licenseActive: boolean;
  licenseKey: string;
  personality: string;
}

export interface GenerationHistoryRecord {
  id: string;
  timestamp: Date;
  postSnippet: string;
  comment: string;
}

export const RISK_LIMITS = {
  [RiskLevel.LOW]: 20,
  [RiskLevel.MEDIUM]: 50,
  [RiskLevel.HIGH]: 100,
};
