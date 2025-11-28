import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import { Trash2, Plus } from "lucide-react";

interface Designation {
  id: string;
  name: string;
}

export default function DesignationMaster() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/designations`);
      const data = await response.json();
      setDesignations(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load designations", variant: "destructive" });
    } finally {
      setPageLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Designation name is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/designations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) throw new Error("Failed to add designation");
      setNewName("");
      await loadDesignations();
      toast({ title: "Success", description: "Designation added successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${getApiBaseUrl()}/api/designations/${id}`, { method: "DELETE" });
      await loadDesignations();
      toast({ title: "Success", description: "Designation deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  if (pageLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Designation Master</h2>
        <p className="text-sm text-muted-foreground">Manage designations</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter designation name"
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
            {designations.map((desig) => (
              <tr key={desig.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2">{desig.name}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(desig.id)}
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
