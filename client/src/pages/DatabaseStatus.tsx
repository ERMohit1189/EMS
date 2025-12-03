import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/Loader";
import { getApiBaseUrl } from "@/lib/api";

interface DatabaseInfo {
  tables: Array<{
    name: string;
    rowCount: number;
  }>;
  totalRows: number;
  connectionStatus: string;
  lastUpdated: string;
}

export default function DatabaseStatus() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatabaseInfo = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/database-status`);

        if (!response.ok) {
          throw new Error(`Failed to fetch database status: ${response.statusText}`);
        }

        const data = await response.json();
        setDbInfo(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setDbInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseInfo();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDatabaseInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Database Status</h1>
        <p className="text-gray-600">
          Connected to Neon Cloud Database (AWS us-east-2)
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-96">
          <Loader />
        </div>
      )}

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-4">
              Make sure your backend server is running on port 8888
            </p>
          </CardContent>
        </Card>
      )}

      {dbInfo && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-semibold">{dbInfo.connectionStatus}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{dbInfo.tables.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{dbInfo.totalRows}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Table Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-semibold">Table Name</th>
                      <th className="text-right py-2 px-4 font-semibold">Records</th>
                      <th className="text-center py-2 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbInfo.tables.map((table, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono">{table.name}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant="outline">{table.rowCount}</Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge className="bg-green-500">
                            {table.rowCount > 0 ? "Active" : "Empty"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 text-xs text-gray-500 text-right">
            Last updated: {new Date(dbInfo.lastUpdated).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
