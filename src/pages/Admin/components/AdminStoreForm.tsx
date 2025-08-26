import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Upload, Image } from 'lucide-react';
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `store-${Date.now()}.${fileExt}`;
      const filePath = `store-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      handleInputChange('store_location_photo_url', publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
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

            {/* Ownership Information */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Ownership Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownership_type">Ownership Type</Label>
                  <Select 
                    value={store.ownership_type || 'company_owned'} 
                    onValueChange={(value) => handleInputChange('ownership_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_owned">Company Owned</SelectItem>
                      <SelectItem value="franchisee">Franchise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="opening_date">Opening Date</Label>
                  <Input
                    id="opening_date"
                    type="date"
                    value={store.opening_date || ''}
                    onChange={(e) => handleInputChange('opening_date', e.target.value)}
                  />
                </div>
              </div>

              {store.ownership_type === 'franchisee' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label htmlFor="franchise_agreement_date">Franchise Agreement Date</Label>
                    <Input
                      id="franchise_agreement_date"
                      type="date"
                      value={store.franchise_agreement_date || ''}
                      onChange={(e) => handleInputChange('franchise_agreement_date', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="franchise_fee_amount">Franchise Fee (PHP)</Label>
                    <Input
                      id="franchise_fee_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={store.franchise_fee_amount || ''}
                      onChange={(e) => handleInputChange('franchise_fee_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Location Information */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Location Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location_type">Location Type</Label>
                  <Select 
                    value={store.location_type || ''} 
                    onValueChange={(value) => handleInputChange('location_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inside_cebu">Inside Cebu</SelectItem>
                      <SelectItem value="outside_cebu">Outside Cebu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={store.region || ''}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                    placeholder="e.g., Visayas, Mindanao"
                  />
                </div>
                
                <div>
                  <Label htmlFor="logistics_zone">Logistics Zone</Label>
                  <Input
                    id="logistics_zone"
                    value={store.logistics_zone || ''}
                    onChange={(e) => handleInputChange('logistics_zone', e.target.value)}
                    placeholder="e.g., Zone A, Zone B"
                  />
                </div>
              </div>
            </div>

            {/* Store Photo Upload */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Store Location Photo</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="store_photo">Upload Store Photo</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="store_photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="max-w-sm"
                    />
                    {isUploadingPhoto && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accepted formats: JPG, PNG, GIF. Max size: 5MB
                  </p>
                </div>

                {store.store_location_photo_url && (
                  <div className="mt-4">
                    <Label>Current Store Photo</Label>
                    <div className="mt-2 relative inline-block">
                      <img
                        src={store.store_location_photo_url}
                        alt="Store location"
                        className="w-48 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('store_location_photo_url', '')}
                        className="absolute top-2 right-2"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Owner Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={store.owner_name || ''}
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                    placeholder="Full name of the owner"
                  />
                </div>
                
                <div>
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={store.owner_email || ''}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    placeholder="owner@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="owner_contact_number">Owner Contact Number</Label>
                  <Input
                    id="owner_contact_number"
                    value={store.owner_contact_number || ''}
                    onChange={(e) => handleInputChange('owner_contact_number', e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select 
                    value={store.business_type || ''} 
                    onValueChange={(value) => handleInputChange('business_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                      <SelectItem value="corporation">Corporation</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="owner_address">Owner Address</Label>
                <Textarea
                  id="owner_address"
                  value={store.owner_address || ''}
                  onChange={(e) => handleInputChange('owner_address', e.target.value)}
                  placeholder="Complete address of the owner"
                  rows={3}
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