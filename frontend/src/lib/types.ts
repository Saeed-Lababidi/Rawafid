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
export interface CreditDecision {
  score: number;
  risk_band: RiskBand;
  approved: boolean;
  max_advance_ratio: number;
  max_advance_amount: number;
  reasons: string[];
  feature_contributions: Record<string, number>;
  model_version: string;
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
