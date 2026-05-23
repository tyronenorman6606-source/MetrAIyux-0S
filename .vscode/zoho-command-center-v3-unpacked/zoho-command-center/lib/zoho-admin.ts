import { zohoFetch } from "./zoho";

export function getZohoOrgId(): string {
  const value = process.env.ZOHO_ORG_ID;
  if (!value) throw new Error("Missing ZOHO_ORG_ID. Add the Zoho organization id from Mail Admin / organization details.");
  return value;
}

export async function addDomainToOrg(domainName: string) {
  const zoid = getZohoOrgId();
  return zohoFetch(`/api/organization/${zoid}/domains`, {
    method: "POST",
    body: JSON.stringify({ domainName })
  });
}

export async function verifyDomain(domainName: string) {
  const zoid = getZohoOrgId();
  return zohoFetch(`/api/organization/${zoid}/domains/${encodeURIComponent(domainName)}`, {
    method: "PUT",
    body: JSON.stringify({ mode: "verifyDomain" })
  });
}

export async function enableMailHosting(domainName: string) {
  const zoid = getZohoOrgId();
  return zohoFetch(`/api/organization/${zoid}/domains/${encodeURIComponent(domainName)}`, {
    method: "PUT",
    body: JSON.stringify({ mode: "enableMailHosting" })
  });
}

export async function addUserToOrg(input: {
  primaryEmailAddress: string;
  password?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}) {
  const zoid = getZohoOrgId();
  return zohoFetch(`/api/organization/${zoid}/accounts`, {
    method: "POST",
    body: JSON.stringify({
      primaryEmailAddress: input.primaryEmailAddress,
      password: input.password,
      displayName: input.displayName,
      firstName: input.firstName,
      lastName: input.lastName || input.displayName || input.primaryEmailAddress.split("@")[0]
    })
  });
}

export async function addAlias(zuid: string, aliasAddress: string) {
  const zoid = getZohoOrgId();
  return zohoFetch(`/api/organization/${zoid}/accounts/${zuid}`, {
    method: "PUT",
    body: JSON.stringify({ mode: "addEmailAlias", emailAlias: aliasAddress })
  });
}
