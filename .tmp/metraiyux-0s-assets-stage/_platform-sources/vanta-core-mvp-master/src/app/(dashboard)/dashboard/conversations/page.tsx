import React from 'react';
import { db } from '@/db';
import { conversations, contacts } from '@/db/schema/schema';
import { eq, desc } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';

export default async function ConversationsPage() {
  const tenantId = '00000000-0000-0000-0000-000000000000'; // Placeholder

  const allConversations = await db.query.conversations.findMany({
    where: eq(conversations.tenantId, tenantId),
    with: {
      contact: true,
    },
    orderBy: [desc(conversations.lastMessageAt)],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Conversations</h1>
        <p className="text-muted-foreground mt-2">Real-time interaction log between VANTA13 and your customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-primary/10 bg-card/30 overflow-hidden">
          <div className="bg-secondary/30 p-4 border-b border-border">
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:neon-border outline-none"
            />
          </div>
          <div className="divide-y divide-border h-[600px] overflow-y-auto">
            {allConversations.map((conv) => {
              const contact = Array.isArray(conv.contact) ? conv.contact[0] : conv.contact;
              const label = contact?.name || contact?.phone || contact?.email || 'Unknown contact';

              return (
                <div key={conv.id} className="p-4 hover:bg-primary/5 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm">{label}</p>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      Channel: {conv.channel.toUpperCase()}
                    </p>
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_5px_var(--primary)]" />
                  </div>
                </div>
              );
            })}
            {allConversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm italic">
                No active conversations.
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 border-primary/10 bg-card/30 flex flex-col h-[656px]">
          <div className="p-6 border-b border-border bg-secondary/20 flex justify-between items-center">
            <div>
              <h3 className="font-bold">Conversation Details</h3>
              <p className="text-xs text-muted-foreground italic">Select a contact to view transcript</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-primary/10 text-primary text-[10px] rounded border border-primary/20 font-bold uppercase">Take Over</button>
              <button className="px-3 py-1 bg-secondary text-[10px] rounded border border-border font-bold uppercase text-muted-foreground">Close</button>
            </div>
          </div>
          <div className="flex-1 p-6 flex items-center justify-center text-muted-foreground italic bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px]">
            Select a conversation from the list to view the AI interaction ledger.
          </div>
          <div className="p-4 border-t border-border bg-secondary/10">
            <div className="flex gap-2">
              <input 
                disabled
                placeholder="Type a message to take over from AI..." 
                className="flex-1 bg-background/50 border border-border rounded px-4 py-2 text-sm italic cursor-not-allowed"
              />
              <button disabled className="px-4 py-2 bg-primary/50 text-background rounded font-bold text-sm cursor-not-allowed uppercase">Send</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
