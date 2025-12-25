import { storage } from '../storage';

(async () => {
  try {
    const vendor = await storage.createVendor({
      name: 'debug vendor',
      email: 'debug+vendor@example.com',
      mobile: '9999999999',
      address: 'debug address',
      city: 'DebugCity',
      state: 'DebugState',
      password: 'hashed',
      country: 'India',
      category: 'Individual',
      status: 'Pending',
      role: 'Vendor',
    } as any);
    console.log('Vendor created:', vendor);
  } catch (err: any) {
    console.error('Create vendor failed:', err);
  }
})();