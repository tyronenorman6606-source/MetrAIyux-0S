'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BUSINESS_PACKS } from '@/lib/business-packs';
import { completeOnboarding } from '@/app/actions/onboarding';
import { useRouter } from 'next/navigation';

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [formData, setFormData] = useState({
    // Step 1: Business Identity
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    serviceArea: '',
    // Step 2: Business Pack
    selectedPackId: '',
    // Step 3: Services
    services: [] as { name: string; price: string; duration: string; isEmergency: boolean }[],
    // Step 4: Routing
    ownerPhone: '',
    hours: '',
    // Step 5: Integrations
    stripeKey: '',
    calendarId: '',
  });

  const nextStep = () => setStep((prev) => (prev + 1) as OnboardingStep);
  const prevStep = () => setStep((prev) => (prev - 1) as OnboardingStep);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newServices = [...prev.services];
      newServices[index] = { ...newServices[index], [field]: value };
      return { ...prev, services: newServices };
    });
  };

  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [...prev.services, { name: '', price: '', duration: '', isEmergency: false }],
    }));
  };

  const handleComplete = async () => {
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result.success) {
        router.push('/dashboard');
      } else {
        alert('Error: ' + result.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-auto max-w-2xl bg-card border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center neon-glow">
              <span className="text-background font-bold text-xl">V</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">VANTACORE ONBOARDING</CardTitle>
          <CardDescription>Step {step} of 6: {getStepTitle(step)}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Clear Line Plumbing" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry</label>
                  <Input name="industry" value={formData.industry} onChange={handleInputChange} placeholder="e.g. Home Services" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input name="website" value={formData.website} onChange={handleInputChange} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+1..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Owner Email</label>
                  <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="owner@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St..." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4">
              {BUSINESS_PACKS.map((pack) => (
                <div 
                  key={pack.id}
                  onClick={() => setFormData(prev => ({ ...prev, selectedPackId: pack.id }))}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.selectedPackId === pack.id 
                    ? 'border-primary bg-primary/10 neon-border' 
                    : 'border-border hover:border-primary/50 bg-secondary/50'
                  }`}
                >
                  <h4 className="font-bold text-primary">{pack.name}</h4>
                  <p className="text-sm text-muted-foreground">{pack.category}</p>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Services & Offers</h4>
                <Button variant="outline" size="sm" onClick={addService}>+ Add Service</Button>
              </div>
              {formData.services.map((service, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 p-2 border border-border rounded-md">
                  <Input 
                    placeholder="Service Name" 
                    className="col-span-2" 
                    value={service.name} 
                    onChange={(e) => handleServiceChange(index, 'name', e.target.value)} 
                  />
                  <Input 
                    placeholder="Price" 
                    value={service.price} 
                    onChange={(e) => handleServiceChange(index, 'price', e.target.value)} 
                  />
                  <Input 
                    placeholder="Duration (min)" 
                    value={service.duration} 
                    onChange={(e) => handleServiceChange(index, 'duration', e.target.value)} 
                  />
                </div>
              ))}
              {formData.services.length === 0 && (
                <div className="text-center py-8 text-muted-foreground italic border border-dashed border-border rounded-lg">
                  No services added yet.
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Owner/Alert Phone</label>
                <Input name="ownerPhone" value={formData.ownerPhone} onChange={handleInputChange} placeholder="+1..." />
                <p className="text-xs text-muted-foreground">This number will receive emergency alerts and escalations.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Hours</label>
                <Input name="hours" value={formData.hours} onChange={handleInputChange} placeholder="e.g. Mon-Fri 9-5" />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <p className="text-muted-foreground">Integrate your existing tools to power VantaCore.</p>
              <div className="grid grid-cols-1 gap-4">
                <Button variant="secondary" className="justify-start gap-4">
                  <span className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-xs">S</span>
                  Connect Stripe
                </Button>
                <Button variant="secondary" className="justify-start gap-4">
                  <span className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white font-bold text-xs">G</span>
                  Connect Google Calendar
                </Button>
                <Button variant="secondary" className="justify-start gap-4">
                  <span className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white font-bold text-xs">T</span>
                  Setup Twilio / Phone
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 text-center py-8">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 neon-border">
                <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold">Setup Ready for Launch</h4>
                <p className="text-muted-foreground">All systems are configured. Run a final test to activate your VantaCore Operator.</p>
              </div>
              <Button className="w-full h-12 text-lg" onClick={handleComplete} disabled={isPending}>
                {isPending ? 'LAUNCHING...' : 'LAUNCH TEST'}
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border pt-6">
          <Button variant="ghost" onClick={prevStep} disabled={step === 1 || isPending}>Back</Button>
          {step < 6 && (
            <Button onClick={nextStep}>Next</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function getStepTitle(step: number): string {
  switch (step) {
    case 1: return "Business Identity";
    case 2: return "Business Pack";
    case 3: return "Services & Offers";
    case 4: return "Routing Rules";
    case 5: return "Integrations";
    case 6: return "Launch Test";
    default: return "";
  }
}
