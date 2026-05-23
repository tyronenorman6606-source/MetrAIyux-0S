import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { db } from '@/db';
import { contentIdeas, tenants } from '@/db/schema/schema';
import { desc, eq } from 'drizzle-orm';
import ContentList from '@/components/dashboard/content-list';
import { getContentStats } from '@/lib/content';

export default async function ContentEnginePage() {
  // For MVP, we'll use the first tenant. In a real app, this would come from auth/context.
  const tenant = await db.query.tenants.findFirst();
  
  if (!tenant) {
    return <div>No tenant found. Please onboard first.</div>;
  }

  const ideas = await db.query.contentIdeas.findMany({
    where: eq(contentIdeas.tenantId, tenant.id),
    orderBy: [desc(contentIdeas.createdAt)],
  });

  const stats = await getContentStats(tenant.id);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary uppercase font-mono tracking-widest">Content + Growth Engine</h1>
          <p className="text-muted-foreground">Autonomous content generation from customer interactions.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
           <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Growth Status</div>
           <div className="text-xl font-bold text-primary font-mono tracking-tighter">OPTIMIZING</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Total Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Avg quality {stats.avgQuality}/10</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byStatus.pending_review}</div>
            <div className="text-xs text-muted-foreground mt-1">Awaiting approval</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byStatus.approved}</div>
            <div className="text-xs text-muted-foreground mt-1">Ready to publish</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byStatus.published}</div>
            <div className="text-xs text-muted-foreground mt-1">Live content</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Blog Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byType.blog_topic}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Sales Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byType.sales_script}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Newsletter Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.byType.newsletter_block}</div>
          </CardContent>
        </Card>
      </div>

      <ContentList initialIdeas={ideas} tenantId={tenant.id} />
    </div>
  );
}
