import { db } from '@/db';
import { quotes, leads, contacts, services } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ tenantId?: string }> }) {
  const { tenantId } = await searchParams;
  if (!tenantId) return <div>Missing tenant</div>;

  const allQuotes = await db.query.quotes.findMany({
    where: eq(quotes.tenantId, tenantId),
    with: { lead: { with: { contact: true } }, service: true },
    orderBy: (quotes, { desc }) => [desc(quotes.createdAt)],
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quotes</h1>
      <div className="grid gap-4">
        {allQuotes.map((q) => {
          const lead = (Array.isArray(q.lead) ? q.lead[0] : q.lead) as
            | { contact?: { name?: string | null; phone?: string | null; email?: string | null } | Array<{ name?: string | null; phone?: string | null; email?: string | null }> | null }
            | null
            | undefined;
          const contact = (lead && Array.isArray(lead.contact) ? lead.contact[0] : lead?.contact) as
            | { name?: string | null; phone?: string | null; email?: string | null }
            | null
            | undefined;
          const service = (Array.isArray(q.service) ? q.service[0] : q.service) as
            | { name?: string | null }
            | null
            | undefined;

          return (
            <div key={q.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{contact?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{contact?.phone || contact?.email || ''}</p>
                  <p className="text-sm text-gray-500">{service?.name || 'No service'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${q.amount}</p>
                  <p className={`text-sm font-medium ${q.status === 'accepted' ? 'text-green-600' : q.status === 'expired' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {q.status}
                  </p>
                </div>
              </div>
              {q.details !== null && q.details !== undefined && (
                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded">{JSON.stringify(q.details, null, 2)}</pre>
              )}
            </div>
          );
        })}
        {allQuotes.length === 0 && <p className="text-gray-500">No quotes yet.</p>}
      </div>
    </div>
  );
}
