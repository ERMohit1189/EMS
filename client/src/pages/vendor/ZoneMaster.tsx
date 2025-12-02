import { getApiBaseUrl } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";

import { SkeletonLoader } from "@/components/SkeletonLoader";
import type { Zone } from "@shared/schema";

export default function ZoneMaster() {
  const topRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [newZone, setNewZone] = useState({ name: "", shortName: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, []);

  const focusNameInput = () => {
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (!loading) {
      focusNameInput();
    }
  }, [loading]);

  const fetchZones = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/zones?pageSize=10000`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setZones(result.data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load zones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newZone.name.trim() || !newZone.shortName.trim()) {
      toast({ title: "Error", description: "Both fields are required", variant: "destructive" });
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const url = editing ? `${baseUrl}${getApiBaseUrl()}/api/zones/${editing.id}` : `${baseUrl}${getApiBaseUrl()}/api/zones`;
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newZone),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }

      toast({
        title: "Success",
        description: editing ? "Zone updated successfully" : "Zone created successfully",
      });

      setNewZone({ name: "", shortName: "" });
      setEditing(null);
      await fetchZones();

      topRef.current?.scrollIntoView({ behavior: "smooth" });
      focusNameInput();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleEdit = (zone: Zone) => {
    setEditing(zone);
    setNewZone({ name: zone.name, shortName: zone.shortName });
    topRef.current?.scrollIntoView({ behavior: "smooth" });
    focusNameInput();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/zones/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");

      toast({ title: "Success", description: "Zone deleted successfully" });
      fetchZones();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete zone", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setNewZone({ name: "", shortName: "" });
    setEditing(null);
    focusNameInput();
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Zone Master</h2>
        <p className="text-muted-foreground">Manage zones with short names</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Zone" : "Add New Zone"}</CardTitle>
          <CardDescription>Create or update zone information with short code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Zone Name</label>
            <Input
              ref={nameInputRef}
              placeholder="e.g., Uttar Pradesh East"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              data-testid="input-zone-name"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Short Name</label>
            <Input
              placeholder="e.g., UPE"
              value={newZone.shortName}
              onChange={(e) => setNewZone({ ...newZone, shortName: e.target.value.toUpperCase() })}
              data-testid="input-zone-short-name"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} data-testid="button-save-zone">
              {editing ? "Update Zone" : "Create Zone"}
            </Button>
            {editing && (
              <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">All Zones</h3>
        {zones.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No zones created yet. Add one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {zones.map((zone) => (
              <Card key={zone.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold" data-testid={`text-zone-name-${zone.id}`}>
                        {zone.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-zone-short-${zone.id}`}>
                        Short Name: <span className="font-mono font-bold">{zone.shortName}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(zone)}
                        data-testid={`button-edit-zone-${zone.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(zone.id)}
                        data-testid={`button-delete-zone-${zone.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
