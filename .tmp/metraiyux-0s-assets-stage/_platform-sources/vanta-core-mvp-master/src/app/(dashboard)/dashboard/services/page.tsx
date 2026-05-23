import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ServicesPage() {
  const services = [
    { name: 'Emergency Repair', price: '$250+', duration: '60 min', status: 'Active' },
    { name: 'General Maintenance', price: '$150', duration: '90 min', status: 'Active' },
    { name: 'Installation Quote', price: 'Free', duration: '30 min', status: 'Active' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Services</h1>
          <p className="text-muted-foreground mt-2">Configure the offers your VantaCore Operator can book.</p>
        </div>
        <Button>+ Create New Service</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.name} className="border-primary/10 bg-card/30 hover:border-primary/30 transition-all group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                {service.name}
              </CardTitle>
              <div className="px-2 py-1 bg-green-500/20 text-green-500 text-[10px] rounded uppercase font-bold border border-green-500/20">
                {service.status}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{service.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{service.duration}</span>
                </div>
                <div className="pt-4 flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1">Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/10 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-xl">Service Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">VantaCore will only book leads within these zip codes or regions.</p>
          <div className="flex gap-2">
            <Input placeholder="Enter zip code..." className="max-w-[200px]" />
            <Button variant="outline">Add Area</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {['10001', '10002', '10003', '10004'].map((zip) => (
              <div key={zip} className="px-3 py-1 bg-secondary rounded-full border border-border flex items-center gap-2 text-sm">
                {zip}
                <button className="text-muted-foreground hover:text-destructive">×</button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
