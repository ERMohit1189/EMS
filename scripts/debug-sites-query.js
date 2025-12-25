import { db } from '../server/db';
import { sites, paymentMasters } from '../shared/schema';

async function run() {
  try {
    const page = 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const paginatedSites = await db
      .select({
        id: sites.id,
        siteId: sites.id,
        planId: sites.planId,
        vendorId: sites.vendorId,
        circle: sites.circle,
        state: sites.state,
        maxAntSize: sites.maxAntSize,
        softAtStatus: sites.softAtStatus,
        phyAtStatus: sites.phyAtStatus,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
        vendorAmount: paymentMasters.vendorAmount,
        siteAmount: paymentMasters.siteAmount,
      })
      .from(sites)
      .leftJoin(
        paymentMasters,
        (and) => and(
          sites.id.eq(paymentMasters.siteId),
          sites.planId.eq(paymentMasters.planId),
          sites.vendorId.eq(paymentMasters.vendorId),
          sites.maxAntSize.eq(paymentMasters.antennaSize)
        )
      )
      .where(undefined)
      .limit(pageSize)
      .offset(offset);

    console.log('paginatedSites length:', Array.isArray(paginatedSites) ? paginatedSites.length : 'not array');
    console.log('first 10 rows:');
    for (let i = 0; i < Math.min(10, paginatedSites.length); i++) {
      const s = paginatedSites[i];
      console.log(i, s === null, typeof s, Object.keys(s || {}).slice(0, 10));
    }
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    process.exit(0);
  }
}

run();
