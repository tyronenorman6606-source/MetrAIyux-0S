'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContentIdea {
  id: string;
  topic: string;
  type: string;
  draft: string | null;
  status: string;
  qualityScore: number | null;
  sourceType: string | null;
  createdAt: Date;
}

interface ContentListProps {
  initialIdeas: ContentIdea[];
  tenantId: string;
}

const statusColors: Record<string, string> = {
  pending_review: 'text-yellow-500',
  approved: 'text-blue-500',
  published: 'text-green-500',
  rejected: 'text-red-500',
  archived: 'text-gray-500',
};

const typeLabels: Record<string, string> = {
  blog_topic: 'Blog',
  faq: 'FAQ',
  local_service_page: 'Local Page',
  social_post: 'Social',
  sales_script: 'Sales Script',
  newsletter_block: 'Newsletter',
};

export default function ContentList({ initialIdeas, tenantId }: ContentListProps) {
  const [ideas, setIdeas] = useState<ContentIdea[]>(initialIdeas);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const filtered = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter);

  async function handleAction(id: string, action: 'approve' | 'publish' | 'reject') {
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/content/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedByUserId: 'system' }), // In real app, use auth user
      });
      const data = await res.json();
      if (data.success) {
        setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: data.idea.status } : i)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending_review', 'approved', 'published', 'rejected'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="overflow-y-auto max-h-[600px] space-y-3 pr-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No content ideas in this queue.
          </div>
        )}
        {filtered.map((idea) => (
          <Card key={idea.id} className="border-primary/10">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-medium">{idea.topic}</CardTitle>
                    <span className={`text-xs font-medium uppercase ${statusColors[idea.status] || ''}`}>
                      {idea.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {typeLabels[idea.type] || idea.type}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Source: {idea.sourceType || 'autopilot'} · Quality: {idea.qualityScore ?? 0}/10
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {idea.status === 'pending_review' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(idea.id, 'approve')}
                      disabled={loading[idea.id]}
                    >
                      Approve
                    </Button>
                  )}
                  {idea.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAction(idea.id, 'publish')}
                      disabled={loading[idea.id]}
                    >
                      Publish
                    </Button>
                  )}
                  {idea.status === 'pending_review' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(idea.id, 'reject')}
                      disabled={loading[idea.id]}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {idea.draft && (
              <CardContent>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {idea.draft}
                </pre>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
