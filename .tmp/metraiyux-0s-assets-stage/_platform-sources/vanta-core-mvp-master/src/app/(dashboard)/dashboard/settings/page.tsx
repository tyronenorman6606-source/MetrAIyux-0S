import React from 'react';
import { BusinessProfileForm } from './profile-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your business configuration and VantaCore behavior.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Section */}
        <BusinessProfileForm profile={null} />

        {/* Branding Section */}
        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded border border-border bg-[#00f2ff]" />
                  <input type="text" className="flex-1 bg-background border border-border rounded px-3 text-sm" value="#00f2ff" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secondary Color</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded border border-border bg-[#111111]" />
                  <input type="text" className="flex-1 bg-background border border-border rounded px-3 text-sm" value="#111111" readOnly />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <input type="text" className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="https://..." />
            </div>
          </CardContent>
          <div className="p-6 pt-0 flex justify-end">
            <Button variant="outline">Preview Branding</Button>
          </div>
        </Card>

        {/* Business Pack Section */}
        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle>Active Business Pack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border border-primary bg-primary/5 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-primary">Plumbing Services Pack</h4>
                <p className="text-xs text-muted-foreground">Includes: Leak detection, Emergency keywords, Booking defaults</p>
              </div>
              <Button variant="outline" size="sm">Change Pack</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
