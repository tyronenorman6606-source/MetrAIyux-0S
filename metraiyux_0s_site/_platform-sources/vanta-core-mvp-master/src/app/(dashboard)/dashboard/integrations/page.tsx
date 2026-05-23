import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function IntegrationsPage() {
  const integrations = [
    { name: 'Twilio', provider: 'Voice/SMS', status: 'Connected', icon: 'T', color: 'bg-red-500' },
    { name: 'Stripe', provider: 'Payments', status: 'Pending', icon: 'S', color: 'bg-blue-500' },
    { name: 'Google Calendar', provider: 'Scheduling', status: 'Connected', icon: 'G', color: 'bg-yellow-500' },
    { name: 'Resend', provider: 'Email', status: 'Disconnected', icon: 'R', color: 'bg-white text-black' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Integrations</h1>
        <p className="text-muted-foreground mt-2">Connect your business infrastructure to VantaCore.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((item) => (
          <Card key={item.name} className="border-primary/10 bg-card/30">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${item.color} flex items-center justify-center font-bold text-xl text-white shadow-lg`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{item.provider}</p>
              </div>
              <div className={`px-2 py-1 text-[10px] rounded uppercase font-bold border ${
                item.status === 'Connected' ? 'bg-green-500/20 text-green-500 border-green-500/20' : 
                item.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' : 
                'bg-red-500/20 text-red-500 border-red-500/20'
              }`}>
                {item.status}
              </div>
            </CardHeader>
            <CardContent className="flex justify-between items-center pt-2">
              <p className="text-xs text-muted-foreground">
                {item.status === 'Connected' ? 'Syncing data automatically.' : 'Click to configure connection.'}
              </p>
              <Button variant={item.status === 'Connected' ? 'outline' : 'primary'} size="sm">
                {item.status === 'Connected' ? 'Manage' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/10 bg-primary/5">
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 font-mono text-xs">
          <div className="p-3 rounded bg-secondary flex justify-between items-center border border-border">
            <span className="text-primary uppercase font-bold">SMS Inbound</span>
            <span>https://vanta-core.com/api/sms/webhook</span>
            <Button variant="ghost" size="sm">Copy</Button>
          </div>
          <div className="p-3 rounded bg-secondary flex justify-between items-center border border-border">
            <span className="text-primary uppercase font-bold">Voice Inbound</span>
            <span>https://vanta-core.com/api/voice/webhook</span>
            <Button variant="ghost" size="sm">Copy</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
