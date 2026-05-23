export type ZohoAccount = {
  accountId: string;
  accountDisplayName?: string;
  primaryEmailAddress?: string;
  mailboxAddress?: string;
  sendMailDetails?: Array<{ fromAddress?: string; displayName?: string; status?: boolean; validated?: boolean; mode?: string }>;
};

export type ZohoFolder = {
  folderId: string | number;
  folderName?: string;
  displayName?: string;
  path?: string;
  unreadCount?: number;
  count?: number;
};

export type ZohoMessage = {
  URI?: string;
  hasAttachment?: number;
  fromAddress?: string;
  folderId?: string | number;
  messageId: string | number;
  sender?: string;
  summary?: string;
  sentDateInGMT?: number;
  receivedtime?: number;
  size?: number;
  status?: string;
  subject?: string;
  threadId?: string | number;
  toAddress?: string;
};

export type SendMailInput = {
  toAddress: string;
  subject: string;
  content: string;
  ccAddress?: string;
  bccAddress?: string;
  fromAddress?: string;
  mailFormat?: "html" | "plaintext";
  askReceipt?: "yes" | "no";
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function accountsBase(): string {
  return process.env.ZOHO_ACCOUNTS_BASE || "https://accounts.zoho.com";
}

function mailBase(): string {
  return process.env.ZOHO_MAIL_BASE || "https://mail.zoho.com";
}

async function parseZohoResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.data?.moreInfo || payload?.message || payload?.status?.description || response.statusText;
    throw new Error(`Zoho API error ${response.status}: ${message}`);
  }

  return payload as T;
}

export async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: required("ZOHO_REFRESH_TOKEN"),
    client_id: required("ZOHO_CLIENT_ID"),
    client_secret: required("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token"
  });

  const response = await fetch(`${accountsBase()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });

  const payload = await parseZohoResponse<{ access_token?: string; error?: string }>(response);
  if (!payload.access_token) throw new Error(payload.error || "Zoho did not return an access token");
  return payload.access_token;
}

export async function zohoFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${mailBase()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${token}`,
      ...(init.headers || {})
    },
    cache: "no-store"
  });
  return parseZohoResponse<T>(response);
}

export async function getAccounts(): Promise<ZohoAccount[]> {
  const payload = await zohoFetch<{ data: ZohoAccount[] | ZohoAccount }>("/api/accounts");
  return Array.isArray(payload.data) ? payload.data : [payload.data];
}

export async function getAccountId(): Promise<string> {
  if (process.env.ZOHO_ACCOUNT_ID) return process.env.ZOHO_ACCOUNT_ID;
  const accounts = await getAccounts();
  const accountId = accounts[0]?.accountId;
  if (!accountId) throw new Error("No Zoho Mail accountId found. Set ZOHO_ACCOUNT_ID manually.");
  return String(accountId);
}

export async function getActiveAccount(): Promise<ZohoAccount> {
  const accountId = await getAccountId();
  const payload = await zohoFetch<{ data: ZohoAccount }>(`/api/accounts/${accountId}`);
  return payload.data;
}

export async function getFolders(accountId?: string): Promise<ZohoFolder[]> {
  const id = accountId || (await getAccountId());
  const payload = await zohoFetch<{ data: ZohoFolder[] }>(`/api/accounts/${id}/folders`);
  return payload.data || [];
}

export async function getMessages(options: { accountId?: string; folderId?: string; start?: number; limit?: number; status?: "all" | "read" | "unread" } = {}): Promise<ZohoMessage[]> {
  const id = options.accountId || (await getAccountId());
  const params = new URLSearchParams({
    start: String(options.start || 1),
    limit: String(options.limit || 25),
    status: options.status || "all",
    sortBy: "date",
    sortorder: "false",
    includeto: "true",
    includesent: "true"
  });
  if (options.folderId) params.set("folderId", options.folderId);

  const payload = await zohoFetch<{ data: ZohoMessage[] }>(`/api/accounts/${id}/messages/view?${params.toString()}`);
  return payload.data || [];
}

export async function searchMessages(searchKey: string, options: { accountId?: string; start?: number; limit?: number } = {}): Promise<ZohoMessage[]> {
  const id = options.accountId || (await getAccountId());
  const params = new URLSearchParams({
    searchKey,
    start: String(options.start || 1),
    limit: String(options.limit || 25),
    includeto: "true"
  });
  const payload = await zohoFetch<{ data: ZohoMessage[] }>(`/api/accounts/${id}/messages/search?${params.toString()}`);
  return payload.data || [];
}

export async function getMessageContent(accountId: string, folderId: string, messageId: string): Promise<any> {
  const path = `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`;
  const payload = await zohoFetch<{ data: any }>(path);
  return payload.data;
}

export async function sendMail(input: SendMailInput): Promise<any> {
  const accountId = await getAccountId();
  const fromAddress = input.fromAddress || required("ZOHO_DEFAULT_FROM");
  const body = {
    fromAddress,
    toAddress: input.toAddress,
    ccAddress: input.ccAddress || undefined,
    bccAddress: input.bccAddress || undefined,
    subject: input.subject,
    content: input.content,
    mailFormat: input.mailFormat || "html",
    askReceipt: input.askReceipt || "no"
  };

  const payload = await zohoFetch<{ data?: any; status?: any }>(`/api/accounts/${accountId}/messages`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return payload;
}

export function formatDate(ms?: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(ms));
}

export function getFolderLabel(folder: ZohoFolder): string {
  return folder.displayName || folder.folderName || folder.path || String(folder.folderId);
}
