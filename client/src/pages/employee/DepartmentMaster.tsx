import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { authenticatedFetch } from "@/lib/fetchWithLoader";
import { Trash2, Plus } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

export default function DepartmentMaster() {
    // Role-based access control
    const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
    const isAllowed = employeeRole === 'admin' || employeeRole === 'user' || employeeRole === 'superadmin';
    if (!isAllowed) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="max-w-md w-full bg-white shadow rounded p-8">
            <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
            <p className="mb-4">You do not have permission to view this page.</p>
            <Button variant="outline" onClick={() => window.location.href = '/'}>Go to Dashboard</Button>
          </div>
        </div>
      );
    }
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/departments`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load error:", error);
      setDepartments([]);
      toast({ title: "Error", description: "Failed to load departments", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Department name is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedFetch(`${getApiBaseUrl()}/api/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) throw new Error("Failed to add department");
      setNewName("");
      await loadDepartments();
      toast({ title: "Success", description: "Department added successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authenticatedFetch(`${getApiBaseUrl()}/api/departments/${id}`, { method: "DELETE" });
      await loadDepartments();
      toast({ title: "Success", description: "Department deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  if (pageLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Department Master</h2>
        <p className="text-sm text-muted-foreground">Manage departments</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter department name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={loading} className="gap-2">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-right px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2">{dept.name}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(dept.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
