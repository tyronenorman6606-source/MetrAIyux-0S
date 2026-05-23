import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { db } from '@/db';
import { reviewRequests, jobs, contacts } from '@/db/schema/schema';
import { desc } from 'drizzle-orm';

export default async function ReviewsPage() {
  const reviews = await db.query.reviewRequests.findMany({
    with: {
      contact: true,
      job: true,
    },
    orderBy: [desc(reviewRequests.createdAt)],
    limit: 20,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary uppercase font-mono tracking-widest">Review Engine</h1>
        <p className="text-muted-foreground">Automated reputation and sentiment management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Requests Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reviews.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">4.8</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Sentiment Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">POSITIVE</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 bg-card/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase font-mono tracking-widest">Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.map((rev) => {
              const contact = (Array.isArray(rev.contact) ? rev.contact[0] : rev.contact) as
                | { name?: string | null }
                | null
                | undefined;

              return (
                <div key={rev.id} className="p-4 rounded-lg bg-secondary/20 border border-primary/5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{contact?.name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">Job #{rev.jobId.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= (rev.rating || 0) ? "text-yellow-500" : "text-muted-foreground"}>★</span>
                      ))}
                    </div>
                    <p className="text-[10px] uppercase font-mono mt-1 text-muted-foreground">{rev.status}</p>
                  </div>
                </div>
              );
            })}
            {reviews.length === 0 && (
              <div className="text-center py-12 text-muted-foreground italic">
                No review requests found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
