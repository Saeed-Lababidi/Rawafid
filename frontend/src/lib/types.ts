// API payload types - mirrors the backend OpenAPI spec (FRONTEND_GUIDE §11).
// These are render contracts only; no arithmetic is derived from them here.

export type Role = 'merchant' | 'bank_admin';
export type ConnectionType = 'bank' | 'sales';
export type ConnectionStatus = 'pending_consent' | 'active' | 'revoked';
export type SettlementStatus = 'pending' | 'received';
export type OfferStatus = 'offered' | 'accepted' | 'rejected' | 'expired';
export type ContractStatus = 'active' | 'repaid' | 'defaulted';
export type ScheduleItemStatus = 'pending' | 'partial' | 'paid';
export type RiskBand = 'A' | 'B' | 'C' | 'D';
export type AlertType = 'revenue_drop' | 'settlement_delay' | 'missed_repayment';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}
export interface UserOut {
  id: string;
  email: string;
  role: Role;
  merchant_id: string | null;
}
export interface MerchantOut {
  id: string;
  name: string;
  business_type: string;
  city: string;
  verification_status: string;
  established_at: string;
}

export interface ConsentStartResponse {
  session_id: string;
  authorize_url: string;
  institution: string;
  connection_id: string;
}
export interface ConnectionOut {
  id: string;
  type: ConnectionType;
  provider: string;
  institution: string;
  status: ConnectionStatus;
  created_at: string;
}

export interface AggregateResponse {
  accounts: number;
  transactions: number;
  sales_orders: number;
  settlements: number;
  held_receivables_total: number;
}
export interface BankAccountOut {
  id: string;
  external_id: string;
  institution: string;
  iban: string;
  currency: string;
  balance: number;
}
export interface TransactionOut {
  id: string;
  account_external_id: string;
  date: string;
  amount: number;
  direction: 'credit' | 'debit';
  description: string;
  category: string | null;
}
export interface SalesOrderOut {
  id: string;
  platform: string;
  order_date: string;
  amount: number;
  currency: string;
  status: 'completed' | 'refunded';
}
export interface SettlementOut {
  id: string;
  platform: string;
  amount: number;
  expected_date: string;
  received_date: string | null;
  status: SettlementStatus;
  delayed: boolean;
}

export interface ScoringFeatures {
  merchant_id: string;
  window_days: number;
  total_revenue_90d: number;
  avg_daily_revenue: number;
  revenue_volatility: number;
  revenue_trend: number;
  num_settlement_cycles: number;
  avg_settlement_days: number;
  held_receivables_total: number;
  chargeback_ratio: number;
  account_age_days: number;
  platform_mix: Record<string, number>;
}
// ---- rafid-engine Decision ----
// Mirrors rafid-engine/rafid_engine/schema.py, verified against real engine
// output. The backend persists this verbatim on `decision.engine_decision`
// whenever SCORING_BACKEND=module (production); stub/http backends leave it
// null, so every consumer must treat it as optional.

/** Bilingual string. The engine narrates natively in both languages. */
export interface Localized {
  ar: string;
  en: string;
}

export type EngineOutcome = 'approve' | 'review' | 'decline';
export type HealthStatus = 'strong' | 'stable' | 'fragile' | 'distressed' | 'unknown';
export type ConfidenceBand = 'high' | 'medium' | 'low';
export type Polarity = 'positive' | 'negative' | 'neutral';
/** A+ | A | A- | B+ | B | B- | C | D (config.GRADE_BANDS). */
export type EngineGrade = string;

export interface FactorContribution {
  code: string;
  name: Localized;
  weight: number;
  /** 0..1 — how well this factor scored on its own. */
  sub_score: number;
  /** Share of the score this factor accounts for, as a percentage — NOT points. */
  contribution_pct: number;
  polarity: Polarity;
  detail: Localized;
}

export interface EngineRiskScore {
  /** 300..850. Note this is NOT the /1000 scale the backend docstring claims. */
  value_850: number;
  normalized: number;
  grade: EngineGrade;
  band: Localized;
  factors: FactorContribution[];
}

export interface ConfidenceDriver {
  code: string;
  detail: Localized;
}

export interface EngineConfidence {
  value: number;
  band: ConfidenceBand;
  drivers: ConfidenceDriver[];
}

/**
 * One projected collection against an upcoming settlement.
 * `projected: true` means it is scheduled against a forecast settlement cycle
 * rather than a settlement that already exists.
 */
export interface EngineDeduction {
  date: string;
  settlement_expected: number;
  deduction: number;
  projected: boolean;
}

export interface EngineRepayment {
  method: string;
  schedule: EngineDeduction[];
  expected_payoff_date: string | null;
}

export interface EngineFee {
  type: string;
  rate: number;
  amount: number;
}

export interface EngineFundingRecommendation {
  decision: EngineOutcome;
  recommended_amount: number;
  max_amount: number;
  advance_rate_effective: number;
  currency: string;
  /**
   * The engine's own single Murabaha fee (2.1%). This is NOT the fee schedule
   * the backend actually contracts on — services/offers.py prices an offer with
   * three separate percentages (platform 2% + success 1% + profit 6%). Never
   * render this next to a real offer; the offer's own figures are the binding
   * ones. See docs in components/engine/repayment-projection.tsx.
   */
  fee: EngineFee;
  total_repayment: number;
  repayment: EngineRepayment;
}

export interface EngineInsight {
  code: string;
  text: Localized;
}

export interface EngineNextStep {
  code: string;
  text: Localized;
  potential_impact: string | null;
}

export interface EngineAudit {
  rules_fired: string[];
  thresholds_version: string;
  generated_at: string;
  stub: boolean;
}

export interface EngineDecision {
  engine_version: string;
  assessment_id: string;
  as_of: string;
  currency: string;
  credit_assessment: { health: HealthStatus; health_label: Localized };
  risk_score: EngineRiskScore;
  confidence: EngineConfidence;
  funding_recommendation: EngineFundingRecommendation;
  explanation: { summary: Localized };
  strengths: EngineInsight[];
  weaknesses: EngineInsight[];
  next_steps: EngineNextStep[];
  audit: EngineAudit;
}

export interface CreditDecision {
  score: number;
  risk_band: RiskBand;
  approved: boolean;
  max_advance_ratio: number;
  max_advance_amount: number;
  reasons: string[];
  feature_contributions: Record<string, number>;
  model_version: string;
  // Full rafid-engine Decision, persisted verbatim. Present only when the
  // backend runs SCORING_BACKEND=module (it does in production); the stub and
  // http models leave it null.
  engine_decision?: EngineDecision | null;
}
export interface AssessmentOut {
  id: string;
  merchant_id: string;
  score: number;
  risk_band: RiskBand;
  approved: boolean;
  model_version: string;
  created_at: string;
}
export interface AssessmentDetailOut extends AssessmentOut {
  features: ScoringFeatures;
  decision: CreditDecision;
}

export interface OfferOut {
  id: string;
  merchant_id: string;
  assessment_id: string;
  principal: number;
  advance_ratio: number;
  platform_fee: number;
  success_fee: number;
  profit_amount: number;
  total_repayable: number;
  currency: string;
  status: OfferStatus;
  annotation: string | null;
  expires_at: string;
  created_at: string;
}
export interface ScheduleItemOut {
  id: string;
  seq: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  settlement_id: string | null;
  status: ScheduleItemStatus;
}
export interface ContractOut {
  id: string;
  merchant_id: string;
  offer_id: string;
  cost_price: number;
  profit_amount: number;
  sale_price: number;
  fees_total: number;
  total_due: number;
  outstanding: number;
  disbursed_at: string;
  status: ContractStatus;
}
export interface ContractDetailOut extends ContractOut {
  schedule: ScheduleItemOut[];
}
export interface RepaymentOut {
  id: string;
  contract_id: string;
  schedule_item_id: string;
  settlement_id: string;
  amount: number;
  applied_at: string;
}

export interface RiskAlertOut {
  id: string;
  merchant_id: string;
  contract_id: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  created_at: string;
}
export interface PortfolioOut {
  funnel: {
    registered: number;
    connected: number;
    scored: number;
    offered: number;
    accepted: number;
  };
  risk_distribution: Partial<Record<RiskBand, number>>;
  contracts: {
    active: number;
    disbursed_total: number;
    outstanding_total: number;
    expected_revenue: number;
  };
  open_alerts: number;
}
export interface AdminMerchantDetailOut {
  merchant: MerchantOut;
  connections: ConnectionOut[];
  assessments: AssessmentOut[];
  offers: OfferOut[];
  contracts: ContractOut[];
  alerts: RiskAlertOut[];
}
export interface ApiError {
  detail: string;
}
