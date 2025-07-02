import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store } from '@/types';

export default function AdminStoreForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  const [store, setStore] = useState<Partial<Store>>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    tin: '',
    business_name: '',
    is_active: true
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadStore();
    }
  }, [id, isEditing]);

  const loadStore = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setStore(data as Partial<Store>);
    } catch (error) {
      console.error('Error loading store:', error);
      toast.error('Failed to load store');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('stores')
          .update(store)
          .eq('id', id);
        
        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        const { error } = await supabase
          .from('stores')
          .insert([store as any]);
        
        if (error) throw error;
        toast.success('Store created successfully');
      }
      
      navigate('/admin/stores');
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error('Failed to save store');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Store, value: any) => {
    setStore(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && isEditing) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/admin/stores')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stores
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Edit Store' : 'Create New Store'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  value={store.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={store.business_name || ''}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={store.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={store.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="tin">TIN</Label>
                <Input
                  id="tin"
                  value={store.tin || ''}
                  onChange={(e) => handleInputChange('tin', e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={store.is_active || false}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={store.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={store.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={store.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={store.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/admin/stores')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Store'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}