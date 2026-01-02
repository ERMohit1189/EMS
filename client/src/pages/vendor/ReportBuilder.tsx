import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl, apiCall } from "@/lib/api";
import ReportDesigner from "./ReportDesigner";
import {
  FileText,
  Settings,
  Eye,
  Download,
  Printer,
  AlertCircle,
  Copy,
  Trash2,
  Play,
  Check,
  Plus,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface FieldMapping {
  id: string;
  columnName: string;
  displayName: string;
}

interface SectionQuery {
  sectionName: "header" | "billTo" | "serviceInfo" | "footer";
  query: string;
  columns: string[];
  testResults?: any[];
  isValid: boolean;
}

interface ReportElement {
  id: string;
  type:
    | "text"
    | "line"
    | "rectangle"
    | "table"
    | "field"
    | "image"
    | "vline"
    | "border";
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string;
  content?: string;
  fieldName?: string;
  fontSize?: number;
  borderColor?: string;
  bgColor?: string;
  rows?: number;
  cols?: number;
  [key: string]: any;
}

interface Template {
  id: string;
  name: string;
  type: "invoice" | "po";
  queries: SectionQuery[];
  fieldMappings: {
    header: FieldMapping[];
    billTo: FieldMapping[];
    serviceInfo: FieldMapping[];
    footer: FieldMapping[];
  };
  design?: ReportElement[];
  leftMargin?: number;
  rightMargin?: number;
  topMargin?: number;
  bottomMargin?: number;
}

export default function ReportBuilder() {
  const [reportType, setReportType] = useState<"invoice" | "po">("invoice");
  const [mode, setMode] = useState<"setup" | "editor" | "preview" | "design">("setup");
  const [templateName, setTemplateName] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [sectionQueries, setSectionQueries] = useState<SectionQuery[]>([
    { sectionName: "header", query: "", columns: [], isValid: false },
    { sectionName: "billTo", query: "", columns: [], isValid: false },
    { sectionName: "serviceInfo", query: "", columns: [], isValid: false },
    { sectionName: "footer", query: "", columns: [], isValid: false },
  ]);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const vendorId = localStorage.getItem("vendorId");
  const employeeRole = localStorage.getItem("employeeRole");
  const isSuperAdmin = employeeRole?.toLowerCase() === "superadmin";
  const isAuthorized = vendorId || isSuperAdmin;

  useEffect(() => {
    if (isAuthorized) {
      loadSavedTemplates();
    }
  }, [isAuthorized, reportType]);

  const loadSavedTemplates = async () => {
    try {
      const response = await apiCall(`/api/reports/templates?type=${reportType}`);
      if (response.ok) {
        const templates = await response.json();
        const converted: Template[] = templates.map((t: any) => {
          // Parse design and queries - they come from API (DesignJson/QueriesJson)
          let parsedDesign = [];
          let parsedQueries = [];

          // Check API response format and fallback to other formats
          const designData = t.DesignJson || t.designJson || t.Design || t.design;
          const queriesData = t.QueriesJson || t.queriesJson || t.Queries || t.queries;

          if (typeof designData === "string") {
            try {
              parsedDesign = JSON.parse(designData);
            } catch (e) {
              parsedDesign = Array.isArray(designData) ? designData : [];
            }
          } else if (Array.isArray(designData)) {
            parsedDesign = designData;
          } else if (designData && typeof designData === "object") {
            parsedDesign = Array.isArray(designData) ? designData : [];
          }

          if (typeof queriesData === "string") {
            try {
              parsedQueries = JSON.parse(queriesData);
            } catch (e) {
              parsedQueries = Array.isArray(queriesData) ? queriesData : [];
            }
          } else if (Array.isArray(queriesData)) {
            parsedQueries = queriesData;
          } else if (queriesData && typeof queriesData === "object") {
            parsedQueries = Array.isArray(queriesData) ? queriesData : [];
          }

          // Ensure all loaded queries have isValid flag set
          parsedQueries = parsedQueries.map((q: any) => ({
            ...q,
            isValid: q.isValid !== undefined ? q.isValid : true,
          }));

          return {
            id: t.id,
            name: t.name,
            type: t.type,
            queries: parsedQueries,
            fieldMappings: {
              header: [],
              billTo: [],
              serviceInfo: [],
              footer: [],
            },
            design: parsedDesign,
            leftMargin: t.LeftMargin || t.leftMargin || 0,
            rightMargin: t.RightMargin || t.rightMargin || 0,
            topMargin: t.TopMargin || t.topMargin || 0,
            bottomMargin: t.BottomMargin || t.bottomMargin || 0,
          };
        });
        setSavedTemplates(converted);
      }
    } catch (error) {
      console.error("Error loading templates from database:", error);
      // Fallback to localStorage
      const saved = localStorage.getItem(`queryTemplates_${reportType}`);
      if (saved) {
        setSavedTemplates(JSON.parse(saved));
      }
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-900">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You must be logged in as a vendor or admin
              </p>
              <Button onClick={() => setLocation("/login")}>Go to Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const testQuery = async (sectionName: string, query: string) => {
    if (!query.trim()) {
      toast({ title: "Error", description: "Query cannot be empty" });
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/reports/test-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sectionName }),
      });

      if (response.ok) {
        const data = await response.json();
        // Remove duplicate columns
        const uniqueColumns = Array.from(new Set(data.columns || []));

        setSectionQueries((prev) =>
          prev.map((sq) =>
            sq.sectionName === sectionName
              ? {
                  ...sq,
                  columns: uniqueColumns,
                  testResults: data.results,
                  isValid: true,
                }
              : sq
          )
        );

        toast({
          title: "Success",
          description: `Query valid! Found ${uniqueColumns.length} columns`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Query Error",
          description: error.message || "Query validation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing query:", error);
      toast({
        title: "Error",
        description: "Failed to test query",
        variant: "destructive",
      });
    }
  };

  const updateQuery = (sectionName: string, query: string) => {
    setSectionQueries((prev) =>
      prev.map((sq) =>
        sq.sectionName === sectionName
          ? { ...sq, query, isValid: false, columns: [] }
          : sq
      )
    );
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: "Error", description: "Please enter template name" });
      return;
    }

    const validQueries = sectionQueries.filter((sq) => sq.isValid);
    if (validQueries.length === 0) {
      toast({
        title: "Error",
        description: "Please test at least one section query",
      });
      return;
    }

    try {
      const payload = {
        name: templateName,
        type: reportType,
        designJson: JSON.stringify(currentTemplate?.design || []),
        queriesJson: JSON.stringify(validQueries),
      };

      // Check if updating existing template or creating new one
      const isUpdating = currentTemplate && currentTemplate.id;
      const endpoint = isUpdating
        ? `/api/reports/templates/${currentTemplate.id}`
        : `/api/reports/templates/save`;
      const method = isUpdating ? "PUT" : "POST";

      const response = await apiCall(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();

        if (isUpdating) {
          // Update existing template
          const updated = savedTemplates.map(t =>
            t.id === currentTemplate.id
              ? { ...currentTemplate, queries: validQueries, name: templateName }
              : t
          );
          localStorage.setItem(`queryTemplates_${reportType}`, JSON.stringify(updated));
          setSavedTemplates(updated);
          setCurrentTemplate({ ...currentTemplate, queries: validQueries, name: templateName });
          toast({ title: "Success", description: "Template updated successfully!" });
        } else {
          // Create new template
          const newTemplate: Template = {
            id: result.id,
            name: templateName,
            type: reportType as "invoice" | "po",
            queries: validQueries,
            fieldMappings: {
              header: [],
              billTo: [],
              serviceInfo: [],
              footer: [],
            },
            leftMargin: 0,
            rightMargin: 0,
            topMargin: 0,
            bottomMargin: 0,
          };

          const updated = [...savedTemplates, newTemplate];
          localStorage.setItem(`queryTemplates_${reportType}`, JSON.stringify(updated));
          setSavedTemplates(updated);
          toast({ title: "Success", description: "Template saved to database!" });
          setCurrentTemplate(newTemplate);
        }

        setMode("editor");
        setTemplateName("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to save template",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template to database",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const response = await apiCall(`/api/reports/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updated = savedTemplates.filter((t) => t.id !== id);
        localStorage.setItem(`queryTemplates_${reportType}`, JSON.stringify(updated));
        setSavedTemplates(updated);
        toast({ title: "Deleted", description: "Template removed from database" });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to delete template",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const loadTemplate = (template: Template) => {
    setCurrentTemplate(template);
    setTemplateName(template.name);
    setSectionQueries(template.queries);
    setMode("editor");
  };

  const addFieldMapping = (
    section: "header" | "billTo" | "serviceInfo" | "footer",
    columnName: string
  ) => {
    if (!currentTemplate) return;

    const newMapping: FieldMapping = {
      id: Math.random().toString(36).substr(2, 9),
      columnName,
      displayName: columnName,
    };

    setCurrentTemplate((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fieldMappings: {
          ...prev.fieldMappings,
          [section]: [...prev.fieldMappings[section], newMapping],
        },
      };
    });

    toast({
      title: "Added",
      description: `Column ${columnName} added to ${section}`,
    });
  };

  const removeFieldMapping = (
    section: "header" | "billTo" | "serviceInfo" | "footer",
    fieldId: string
  ) => {
    setCurrentTemplate((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fieldMappings: {
          ...prev.fieldMappings,
          [section]: prev.fieldMappings[section].filter((f) => f.id !== fieldId),
        },
      };
    });
  };

  const updateFieldDisplay = (
    section: "header" | "billTo" | "serviceInfo" | "footer",
    fieldId: string,
    displayName: string
  ) => {
    setCurrentTemplate((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fieldMappings: {
          ...prev.fieldMappings,
          [section]: prev.fieldMappings[section].map((f) =>
            f.id === fieldId ? { ...f, displayName } : f
          ),
        },
      };
    });
  };

  const generatePDF = () => {
    if (!currentTemplate) return;

    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(16);
    doc.text(`${reportType.toUpperCase()} Report`, 20, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.text(`Template: ${currentTemplate.name}`, 20, yPosition);
    yPosition += 10;

    // List all mapped fields
    doc.setFontSize(12);
    (doc.setFont as any)(undefined, "bold");

    ["header", "billTo", "serviceInfo", "footer"].forEach((section) => {
      const sectionFields =
        currentTemplate.fieldMappings[
          section as "header" | "billTo" | "serviceInfo" | "footer"
        ];

      if (sectionFields.length > 0) {
        doc.text(
          `${section.charAt(0).toUpperCase() + section.slice(1)} Section:`,
          20,
          yPosition
        );
        yPosition += 8;

        (doc.setFont as any)(undefined, "normal");
        doc.setFontSize(9);

        sectionFields.forEach((field) => {
          doc.text(`  ${field.displayName} (${field.columnName})`, 25, yPosition);
          yPosition += 5;
        });

        yPosition += 3;
      }
    });

    doc.save(
      `${reportType}-report-${new Date().toISOString().split("T")[0]}.pdf`
    );
    toast({ title: "Success", description: "PDF generated" });
  };

  // Show full screen design view without other sections
  if (mode === "design" && currentTemplate) {
    console.log('Entering design mode:', { templateId: currentTemplate.id, templateName: currentTemplate.name, queriesCount: sectionQueries.length, initialDesignLength: currentTemplate.design ? currentTemplate.design.length : 0 });
    return (
      <ReportDesigner
        templateName={currentTemplate.name}
        templateId={currentTemplate.id}
        queryFields={
          sectionQueries
            .filter((sq) => sq.isValid)
            .flatMap((sq) => sq.columns)
        }
        sectionQueries={sectionQueries}
        initialDesign={currentTemplate.design}
        initialMargins={{
          left: currentTemplate.leftMargin || 0,
          right: currentTemplate.rightMargin || 0,
          top: currentTemplate.topMargin || 0,
          bottom: currentTemplate.bottomMargin || 0,
        }}
        onSave={async (design, margins) => {
          if (!currentTemplate) return;

          try {
            console.log("Design elements to save:", design);
            console.log("Design element count:", design.length);
            console.log("Margins to save:", margins);

            // Check fontSize in field elements
            const fieldElements = design.filter((el: any) => el.type === "field");
            console.log("Field elements with fontSize:", fieldElements.map((el: any) => ({
              id: el.id,
              fieldName: el.fieldName,
              fontSize: el.fontSize
            })));

            console.log("Design JSON:", JSON.stringify(design));

            const payload = {
              name: currentTemplate.name,
              type: currentTemplate.type,
              designJson: JSON.stringify(design),
              queriesJson: JSON.stringify(currentTemplate.queries),
              leftMargin: margins.left,
              rightMargin: margins.right,
              topMargin: margins.top,
              bottomMargin: margins.bottom,
            };

            console.log("Complete payload being sent:", payload);
            console.log("designJson in payload:", payload.designJson);

            const response = await apiCall(`/api/reports/templates/${currentTemplate.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            console.log("Save response:", response);

            if (response && response.success !== false) {
              setCurrentTemplate((prev) =>
                prev ? {
                  ...prev,
                  design,
                  leftMargin: margins.left,
                  rightMargin: margins.right,
                  topMargin: margins.top,
                  bottomMargin: margins.bottom,
                } : null
              );
              toast({
                title: "Success",
                description: "Design and margins saved successfully",
              });
            } else {
              throw new Error(response?.message || "Server returned unsuccessful response");
            }
          } catch (error) {
            console.error("Save error:", error);
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to save design",
              variant: "destructive",
            });
          }
        }}
        onClose={() => setMode("editor")}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Query-Based Report Builder
            </h1>
            <p className="text-gray-500">
              Create reports using SQL queries for each section
            </p>
          </div>
        </div>
      </div>

      {/* Report Type Selector & Template Name */}
      <Card className="mb-4">
        <CardContent className="pt-3 pb-3 space-y-3">
          <div className="flex items-start gap-2">
            {/* Report Type Buttons */}
            <div className="flex gap-2 flex-1">
              <Button
                variant={reportType === "invoice" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setReportType("invoice");
                  setMode("setup");
                  setSectionQueries([
                    { sectionName: "header", query: "", columns: [], isValid: false },
                    { sectionName: "billTo", query: "", columns: [], isValid: false },
                    {
                      sectionName: "serviceInfo",
                      query: "",
                      columns: [],
                      isValid: false,
                    },
                    { sectionName: "footer", query: "", columns: [], isValid: false },
                  ]);
                }}
                className="text-sm"
              >
                📄 Invoice
              </Button>
              <Button
                variant={reportType === "po" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setReportType("po");
                  setMode("setup");
                  setSectionQueries([
                    { sectionName: "header", query: "", columns: [], isValid: false },
                    { sectionName: "billTo", query: "", columns: [], isValid: false },
                    {
                      sectionName: "serviceInfo",
                      query: "",
                      columns: [],
                      isValid: false,
                    },
                    { sectionName: "footer", query: "", columns: [], isValid: false },
                  ]);
                }}
                className="text-sm"
              >
                📋 PO
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              {currentTemplate && (
                <Button
                  onClick={() => onSave(currentTemplate.name)}
                  size="sm"
                  className="text-xs gap-1"
                  title="Save Design"
                >
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              )}
              <Button
                onClick={() => setLocation("/login")}
                variant="outline"
                size="sm"
                className="text-xs"
                title="Close"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Template Name Input - Only show in setup/editor mode */}
          {mode !== "design" && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">Template Name</Label>
              <Input
                placeholder="e.g., Professional Invoice Template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                size={32}
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Mode - Query Configuration */}
      {mode === "setup" && (
        <div className="space-y-6">
          {/* Query Configuration for Each Section */}
          {sectionQueries.map((sq) => (
            <Card key={sq.sectionName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {sq.sectionName === "header" && "📋 Header Section Query"}
                    {sq.sectionName === "billTo" && "👥 Bill To / Supplier Query"}
                    {sq.sectionName === "serviceInfo" && "📦 Service Info Query"}
                    {sq.sectionName === "footer" && "✓ Footer Section Query"}
                  </CardTitle>
                  {sq.isValid && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {sq.columns.length} columns
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm">
                    SQL Query (with parameters like @vendorId, @siteId)
                  </Label>
                  <textarea
                    value={sq.query}
                    onChange={(e) => updateQuery(sq.sectionName, e.target.value)}
                    placeholder="SELECT companyName, companyAddress FROM ExportHeaders WHERE vendorId = @vendorId"
                    className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={() => testQuery(sq.sectionName, sq.query)}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Test Query
                </Button>

                {sq.isValid && sq.columns.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-bold text-green-900 mb-3">
                      Available Columns:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sq.columns.map((col) => (
                        <span
                          key={col}
                          className="px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm font-medium"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {sq.testResults && sq.testResults.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-bold text-blue-900 mb-2">
                      Sample Results ({sq.testResults.length} rows):
                    </p>
                    <div className="overflow-x-auto">
                      <pre className="text-xs text-blue-800 bg-white p-2 rounded border">
                        {JSON.stringify(sq.testResults.slice(0, 2), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button onClick={saveTemplate} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Save Template & Go to Editor
            </Button>
          </div>
        </div>
      )}

      {/* Editor Mode - Field Mapping */}
      {mode === "editor" && currentTemplate && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🎨 Configure Field Mappings</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Select columns from your queries and add them to template sections
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {["header", "billTo", "serviceInfo", "footer"].map((section) => {
                const sectionQuery = sectionQueries.find(
                  (sq) => sq.sectionName === section
                );
                if (!sectionQuery?.isValid) return null;

                const sectionFields =
                  currentTemplate.fieldMappings[
                    section as "header" | "billTo" | "serviceInfo" | "footer"
                  ];

                return (
                  <div key={section} className="border-t pt-4">
                    <h3 className="font-bold text-gray-900 mb-3">
                      {section === "header" && "📋 Header Fields"}
                      {section === "billTo" && "👥 Bill To Fields"}
                      {section === "serviceInfo" && "📦 Service Info Fields"}
                      {section === "footer" && "✓ Footer Fields"}
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Available Columns */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Available Columns
                        </p>
                        <div className="space-y-2">
                          {sectionQuery.columns.map((col) => (
                            <Button
                              key={col}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() =>
                                addFieldMapping(
                                  section as
                                    | "header"
                                    | "billTo"
                                    | "serviceInfo"
                                    | "footer",
                                  col
                                )
                              }
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {col}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Selected Fields */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Selected for {section} ({sectionFields.length})
                        </p>
                        <div className="space-y-2">
                          {sectionFields.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                              No fields added yet
                            </p>
                          ) : (
                            sectionFields.map((field) => (
                              <div
                                key={field.id}
                                className="p-3 bg-gray-100 rounded-lg space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-gray-600">
                                    {field.columnName}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      removeFieldMapping(
                                        section as
                                          | "header"
                                          | "billTo"
                                          | "serviceInfo"
                                          | "footer",
                                        field.id
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                                <Input
                                  placeholder="Display name (e.g., Company Name)"
                                  value={field.displayName}
                                  onChange={(e) =>
                                    updateFieldDisplay(
                                      section as
                                        | "header"
                                        | "billTo"
                                        | "serviceInfo"
                                        | "footer",
                                      field.id,
                                      e.target.value
                                    )
                                  }
                                  className="text-xs"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={() => setMode("design")}
              className="flex-1"
            >
              📐 Design Report Layout
            </Button>
            <Button onClick={() => setMode("setup")} variant="outline" className="flex-1">
              Edit Queries
            </Button>
          </div>
        </div>
      )}

      {/* Saved Templates */}
      {mode === "setup" && savedTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📂 Saved Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600">
                      {template.queries.filter((q) => q.isValid).length} sections
                      configured
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        loadTemplate(template);
                        setTimeout(() => setMode("design"), 0);
                      }}
                      className="gap-2"
                    >
                      📐 Design
                    </Button>
                    <Button
                      onClick={() => loadTemplate(template)}
                      variant="outline"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => deleteTemplate(template.id)}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
