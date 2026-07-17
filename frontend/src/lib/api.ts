// Typed client for the Rafid backend. Token pair lives in localStorage; every
// authed call attaches the access token and transparently retries once through
// /auth/refresh on a 401 (FRONTEND_GUIDE §3). The host is read ONLY from
// NEXT_PUBLIC_API_URL - no host string is hardcoded (D-04).
'use client';

import type {
  AdminMerchantDetailOut,
  AggregateResponse,
  AssessmentDetailOut,
  AssessmentOut,
  BankAccountOut,
  ConnectionOut,
  ConsentStartResponse,
  ContractDetailOut,
  ContractOut,
  OfferOut,
  PortfolioOut,
  RepaymentOut,
  RiskAlertOut,
  Role,
  SalesOrderOut,
  SettlementOut,
  TransactionOut,
  TokenPair,
  UserOut,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const ACCESS_KEY = 'rafid_access';
const REFRESH_KEY = 'rafid_refresh';

export function getAccess(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}
function getRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}
export function setTokens(pair: TokenPair): void {
  window.localStorage.setItem(ACCESS_KEY, pair.access_token);
  window.localStorage.setItem(REFRESH_KEY, pair.refresh_token);
}
export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

// Decode the `role` claim client-side so we can route to the right surface
// without an extra round-trip. Never trusted for authorization - the backend
// re-derives identity from the token on every call.
export function roleFromToken(token: string | null): Role | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  // Populated for 422 only: field name -> first validation message, so forms
  // can bind errors to inputs instead of dumping a toast (AUTH-05).
  fields: Record<string, string>;

  constructor(status: number, detail: string, fields: Record<string, string> = {}) {
    super(detail);
    this.status = status;
    this.fields = fields;
  }

  /** 400s carry a hand-authored, user-presentable `detail` — safe to toast. */
  get isBusinessRule(): boolean {
    return this.status === 400;
  }
}

type ValidationItem = { loc?: (string | number)[]; msg?: string };

async function parseError(res: Response): Promise<never> {
  let detail = res.statusText;
  const fields: Record<string, string> = {};

  try {
    const body = await res.json();
    if (typeof body.detail === 'string') {
      detail = body.detail;
    } else if (Array.isArray(body.detail)) {
      // FastAPI 422: detail: [{ loc: ["body", "email"], msg, type }, ...]
      for (const item of body.detail as ValidationItem[]) {
        const field = item.loc?.[item.loc.length - 1];
        if (typeof field === 'string' && item.msg && !(field in fields)) {
          fields[field] = item.msg;
        }
      }
      detail = (body.detail as ValidationItem[])[0]?.msg ?? detail;
    }
  } catch {
    /* non-JSON body */
  }

  throw new ApiError(res.status, detail, fields);
}

// Fires when refresh fails terminally, so the app can log out once from
// anywhere (no router access down here in the transport layer).
const AUTH_EXPIRED_EVENT = 'rafid:auth-expired';

export function onAuthExpired(handler: () => void): () => void {
  window.addEventListener(AUTH_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
}

// Single-flight refresh (AUTH-02). Screens poll concurrently, so one expired
// access token produces a burst of simultaneous 401s — without coordination
// every one of them POSTs /auth/refresh.
//
// Today that burst is survivable rather than fatal: /auth/refresh is stateless
// (it verifies the JWT signature and mints a new pair; there is no jti,
// denylist, or token-family revocation), so each racing refresh independently
// succeeds and the only cost is N redundant round-trips and a last-write-wins
// scramble over the stored pair.
//
// It is coordinated here anyway, for two reasons: the redundant burst hits a
// free-tier backend N times for one logical refresh, and the moment refresh
// rotation gains revocation — the normal hardening step — the race stops being
// wasteful and starts logging users out mid-demo. The first caller parks its
// in-flight promise here; every concurrent caller awaits that same promise.
let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refresh_token = getRefresh();
  if (!refresh_token) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return false;
    setTokens((await res.json()) as TokenPair);
    return true;
  } catch {
    // Network failure is not proof the session died — surface it as a failed
    // refresh for this attempt, but don't clear tokens (the caller decides).
    return false;
  }
}

function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

type FetchOpts = { method?: string; body?: unknown; auth?: boolean; retry?: boolean };

export async function api<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = 'GET', body, auth = true, retry = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) {
    const token = getAccess();
    if (token) headers['authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 401 && auth && retry) {
    if (await refreshTokens()) {
      return api<T>(path, { ...opts, retry: false });
    }
    clearTokens();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!res.ok) return parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- auth ----
export const login = (email: string, password: string) =>
  api<TokenPair>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
export const register = (body: {
  email: string;
  password: string;
  business_name: string;
  business_type?: string;
  city?: string;
}) => api<TokenPair>('/auth/register', { method: 'POST', body, auth: false });
export const me = () => api<UserOut>('/auth/me');

// ---- merchant ----
export const getMerchant = () => api<import('./types').MerchantOut>('/merchants/me');
/** Mirrors app/schemas/auth.py MerchantUpdate — every field optional. */
export const updateMerchant = (body: {
  name?: string;
  business_type?: string;
  city?: string;
}) => api<import('./types').MerchantOut>('/merchants/me', { method: 'PATCH', body });
export const getConnections = () => api<ConnectionOut[]>('/connections');
export const revokeConnection = (id: string) =>
  api<ConnectionOut>(`/connections/${id}/revoke`, { method: 'POST' });
export const startConsent = (kind: 'bank' | 'sales', institution: string) =>
  api<ConsentStartResponse>(`/connections/${kind}/consent/start`, {
    method: 'POST',
    body: { institution },
  });
export const completeConsent = (session_id: string, auth_code = 'demo') =>
  api<ConnectionOut>('/connections/consent/complete', {
    method: 'POST',
    body: { session_id, auth_code },
  });
export const aggregate = () =>
  api<AggregateResponse>('/merchants/me/aggregate', { method: 'POST' });
export const getAccounts = () => api<BankAccountOut[]>('/accounts');
export const getTransactions = (limit = 500) =>
  api<TransactionOut[]>(`/transactions?limit=${limit}`);
export const getSales = (limit = 5000) => api<SalesOrderOut[]>(`/sales?limit=${limit}`);
export const getSettlements = () => api<SettlementOut[]>('/settlements');
export const receiveSettlement = (id: string) =>
  api<SettlementOut>(`/settlements/${id}/receive`, { method: 'POST' });

export const runAssessment = () =>
  api<AssessmentDetailOut>('/assessments/run', { method: 'POST' });
export const getAssessments = () => api<AssessmentOut[]>('/assessments/me');
export const getAssessment = (id: string) =>
  api<AssessmentDetailOut>(`/assessments/${id}`);

export const generateOffer = () => api<OfferOut>('/offers/generate', { method: 'POST' });
export const getOffers = () => api<OfferOut[]>('/offers/me');
export const acceptOffer = (id: string) =>
  api<ContractOut>(`/offers/${id}/accept`, { method: 'POST' });
export const rejectOffer = (id: string) =>
  api<OfferOut>(`/offers/${id}/reject`, { method: 'POST' });

export const getContracts = () => api<ContractOut[]>('/contracts/me');
export const getContract = (id: string) => api<ContractDetailOut>(`/contracts/${id}`);
export const getRepayments = (id: string) =>
  api<RepaymentOut[]>(`/contracts/${id}/repayments`);
export const getAlerts = () => api<RiskAlertOut[]>('/alerts/me');

// ---- admin ----
export const getPortfolio = () => api<PortfolioOut>('/admin/portfolio');
export const getAdminMerchants = () => api<import('./types').MerchantOut[]>('/admin/merchants');
export const getAdminMerchant = (id: string) =>
  api<AdminMerchantDetailOut>(`/admin/merchants/${id}`);
export const annotateOffer = (offerId: string, annotation: string) =>
  api<OfferOut>(`/admin/offers/${offerId}/annotate`, {
    method: 'POST',
    body: { annotation },
  });
export const getAdminAssessment = (id: string) =>
  api<AssessmentDetailOut>(`/admin/assessments/${id}`);
export const getAdminAlerts = () =>
  api<RiskAlertOut[]>('/admin/alerts?include_resolved=false');
export interface TickResponse {
  sim_date: string;
  settlements_received: number;
  settlements_delayed: number;
  repayments_applied: number;
  contracts_closed: number;
  alerts_raised: number;
}
export const monitorTick = () =>
  api<TickResponse>('/admin/monitor/tick', { method: 'POST' });
