import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/mockData';
import { Users, Building2, HardHat, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { vendors, sites, employees } = useStore();
  const [pendingPOCount, setPendingPOCount] = useState(0);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [allSites, setAllSites] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Purchase Orders
        const posResponse = await fetch(`${getApiBaseUrl()}/api/purchase-orders?pageSize=10000`);
        const posData = await posResponse.json();
        const pos = posData.data || [];
        setPurchaseOrders(pos);
        const pending = pos.filter((po: any) => po.status === 'Pending').length;
        setPendingPOCount(pending);

        // Fetch Invoices
        const invResponse = await fetch(`${getApiBaseUrl()}/api/invoices?pageSize=10000`);
        const invData = await invResponse.json();
        const invs = invData.data || [];
        setInvoices(invs);

        // Fetch All Sites
        const sitesResponse = await fetch(`${getApiBaseUrl()}/api/sites?pageSize=10000`);
        const sitesData = await sitesResponse.json();
        setAllSites(sitesData.data || []);

        // Fetch All Vendors
        const vendorsResponse = await fetch(`${getApiBaseUrl()}/api/vendors?pageSize=10000`);
        const vendorsData = await vendorsResponse.json();
        setAllVendors(vendorsData.data || []);

        // Fetch All Employees
        const empResponse = await fetch(`${getApiBaseUrl()}/api/employees?pageSize=10000`);
        const empData = await empResponse.json();
        setAllEmployees(empData.data || []);

        // Generate monthly data from POs
        const monthlyMap: { [key: string]: { installations: number; revenue: number } } = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        pos.forEach((po: any) => {
          const monthIndex = new Date(po.createdAt || new Date()).getMonth();
          const monthName = months[monthIndex];
          if (!monthlyMap[monthName]) {
            monthlyMap[monthName] = { installations: 0, revenue: 0 };
          }
          monthlyMap[monthName].installations += 1;
          monthlyMap[monthName].revenue += (po.totalAmount || 0) / 1000; // Convert to K
        });

        invs.forEach((inv: any) => {
          const monthIndex = new Date(inv.createdAt || new Date()).getMonth();
          const monthName = months[monthIndex];
          if (!monthlyMap[monthName]) {
            monthlyMap[monthName] = { installations: 0, revenue: 0 };
          }
          monthlyMap[monthName].revenue += (inv.totalAmount || 0) / 1000; // Convert to K
        });

        const chartData = months.slice(0, 6).map(month => ({
          month,
          installations: monthlyMap[month]?.installations || 0,
          revenue: parseFloat((monthlyMap[month]?.revenue || 0).toFixed(2)),
        }));
        setMonthlyData(chartData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setPendingPOCount(0);
        setPurchaseOrders([]);
        setInvoices([]);
      }
    };
    fetchData();
  }, []);

  const activeSites = allSites.length > 0 ? allSites.filter(s => s.status === 'Active').length : sites.filter(s => s.status === 'Active').length;
  const totalSites = allSites.length > 0 ? allSites.length : sites.length;
  const operationalPercentage = totalSites > 0 ? Math.round((activeSites / totalSites) * 100) : 0;

  const stats = [
    {
      title: 'Total Vendors',
      value: allVendors.length > 0 ? allVendors.length : vendors.length,
      description: `${allVendors.filter(v => v.status === 'Approved').length || vendors.filter(v => v.status === 'Approved').length} approved`,
      icon: Users,
      color: 'text-blue-500',
      href: '/vendor/list',
    },
    {
      title: 'Active Sites',
      value: activeSites,
      description: `${operationalPercentage}% operational`,
      icon: Building2,
      color: 'text-emerald-500',
      href: '/vendor/sites',
    },
    {
      title: 'Total Employees',
      value: allEmployees.length > 0 ? allEmployees.length : employees.length,
      description: 'Field & Office Staff',
      icon: HardHat,
      color: 'text-orange-500',
      href: '/employee/list',
    },
    {
      title: 'Pending POs',
      value: pendingPOCount,
      description: `${purchaseOrders.length} total`,
      icon: DollarSign,
      color: 'text-purple-500',
      href: '/vendor/po',
    },
  ];

  // Chart data - All Dynamic
  const siteData = allSites.length > 0 ? allSites : sites;
  const vendorData = allVendors.length > 0 ? allVendors : vendors;

  const siteStatusData = [
    { name: 'Active', value: siteData.filter(s => s.status === 'Active').length, fill: '#10b981' },
    { name: 'Pending', value: siteData.filter(s => s.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Inactive', value: siteData.filter(s => s.status === 'Inactive').length, fill: '#ef4444' },
  ];

  const vendorStatusData = [
    { name: 'Approved', value: vendorData.filter(v => v.status === 'Approved').length, fill: '#3b82f6' },
    { name: 'Pending', value: vendorData.filter(v => v.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Rejected', value: vendorData.filter(v => v.status === 'Rejected').length, fill: '#ef4444' },
  ];

  const regionData = siteData.reduce((acc: any[], site) => {
    const location = site.district || site.circle || 'Unknown';
    const existing = acc.find(r => r.name === location);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: location, count: 1 });
    }
    return acc;
  }, []);

  const poStatusData = [
    { name: 'Draft', value: purchaseOrders.filter(po => po.status === 'Draft').length, fill: '#6366f1' },
    { name: 'Pending', value: purchaseOrders.filter(po => po.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Approved', value: purchaseOrders.filter(po => po.status === 'Approved').length, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h2>
            <p className="text-blue-100">Overview of your enterprise operations.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/vendor/register" className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors">
              Add Vendor
            </Link>
            <Link href="/employee/register" className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors">
              Add Employee
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-xl hover:border-primary cursor-pointer transition-all duration-300 h-full border-l-4 border-l-transparent hover:border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.color} bg-opacity-10`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Performance Trend - Full Width */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Monthly Performance Trend</CardTitle>
              <CardDescription>Site installations and revenue trajectory</CardDescription>
            </div>
            <div className="text-xs font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-full">6 Months</div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line yAxisId="left" type="monotone" dataKey="installations" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} activeDot={{ r: 7 }} name="Installations" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} activeDot={{ r: 7 }} name="Revenue (₹K)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Analytics Grid - 3 Columns */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-t-lg">
            <CardTitle className="text-base">Site Status</CardTitle>
            <CardDescription className="text-xs">Distribution by status</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={siteStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {siteStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
            <CardTitle className="text-base">Vendor Status</CardTitle>
            <CardDescription className="text-xs">Distribution by status</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={vendorStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vendorStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
            <CardTitle className="text-base">PO Status</CardTitle>
            <CardDescription className="text-xs">Purchase order breakdown</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={poStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {poStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Activity & Approvals */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sites by District */}
        <Card className="shadow-md md:col-span-2">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-t-lg">
            <CardTitle className="text-base">Sites by District</CardTitle>
            <CardDescription className="text-xs">Geographic distribution across districts</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={regionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity & Approvals Row */}
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-t-lg">
            <CardTitle className="text-base">Recent Site Activity</CardTitle>
            <CardDescription className="text-xs">Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(allSites.length > 0 ? allSites : sites).slice(0, 5).map((site) => (
                <div key={site.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${site.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none truncate">Site {site.siteId || site.planId}</p>
                      <p className="text-xs text-muted-foreground truncate">{site.circle || site.district} • {site.state}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${site.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {site.status}
                  </span>
                </div>
              ))}
              {(allSites.length > 0 ? allSites : sites).length === 0 && (
                 <div className="text-center py-4 text-muted-foreground text-sm">No sites registered.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-rose-100 rounded-t-lg">
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <CardDescription className="text-xs">Vendors awaiting verification</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-3 max-h-64 overflow-y-auto">
              {(allVendors.length > 0 ? allVendors : vendors).filter(v => v.status === 'Pending').slice(0, 5).map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                   <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                        {vendor.name.substring(0,2).toUpperCase()}
                     </div>
                     <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{vendor.category || 'Individual'}</p>
                     </div>
                   </div>
                   <Link href="/vendor/list" className="text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1 flex-shrink-0 font-medium">
                      Review <ArrowUpRight className="h-3 w-3" />
                   </Link>
                </div>
              ))}
               {(allVendors.length > 0 ? allVendors : vendors).filter(v => v.status === 'Pending').length === 0 && (
                 <div className="text-center py-4 text-muted-foreground text-sm">No pending vendors.</div>
              )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
