'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export function BusinessProfileForm({ profile }: { profile: any }) {
  const [formData, setFormData] = useState(profile || {
    name: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="border-primary/10 bg-card/30">
      <CardHeader>
        <CardTitle>Business Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Name</label>
            <Input name="name" value={formData.name} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <Input name="industry" value={formData.industry} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <Input name="website" value={formData.website} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input name="phone" value={formData.phone} onChange={handleChange} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <Input name="address" value={formData.address} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Description</label>
          <textarea
            name="description"
            className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="ml-auto">Save Profile</Button>
      </CardFooter>
    </Card>
  );
}
