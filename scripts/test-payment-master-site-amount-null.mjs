import { insertPaymentMasterSchema } from '../shared/schema.js';

const payload = {
  siteId: 'some-site',
  planId: 'plan-1',
  vendorId: 'vendor-1',
  antennaSize: '0.6',
  siteAmount: null,
  vendorAmount: 12345,
};

try {
  const parsed = insertPaymentMasterSchema.parse(payload);
  console.log('Parsed:', parsed);
} catch (err) {
  console.error('Error parsing:', err.errors || err.message);
}
