import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download } from "lucide-react";
import jsPDF from "jspdf";
import type { PurchaseOrder, Vendor } from "@shared/schema";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  poDate: string;
  poDueDate: string;
  vendorName: string;
  vendorEmail?: string;
  siteName: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  gst: string;
  totalAmount: string;
  invoiceDate: string;
  invoiceDueDate: string;
  status: string;
}

export default function InvoiceGeneration() {
  const topRef = useRef<HTMLDivElement>(null);
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const [gstRate, setGstRate] = useState("18");
  const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceRecord[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [posRes, vendorsRes, sitesRes, invoicesRes] = await Promise.all([
          fetch("/api/purchase-orders?pageSize=10000"),
          fetch("/api/vendors?pageSize=10000"),
          fetch("/api/sites?pageSize=10000"),
          fetch("/api/invoices?pageSize=10000"),
        ]);

        if (!posRes.ok || !vendorsRes.ok || !sitesRes.ok || !invoicesRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const posData = await posRes.json();
        const vendorsData = await vendorsRes.json();
        const sitesData = await sitesRes.json();
        const invoicesData = await invoicesRes.json();

        const pos = posData.data || [];
        const vendorsList = vendorsData.data || [];
        const sites = sitesData.data || [];
        const invoices = invoicesData.data || [];

        setVendors(vendorsList);

        // Convert invoices to InvoiceRecord format
        const invoiceRecords: InvoiceRecord[] = [];
        for (const invoice of invoices) {
          const po = pos.find((p: any) => p.id === invoice.poId);
          const vendor = vendorsList.find(v => v.id === invoice.vendorId);
          const site = sites.find((s: any) => s.id === po?.siteId);
          invoiceRecords.push({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            poNumber: po?.poNumber || "Unknown",
            poDate: po?.poDate || "",
            poDueDate: po?.dueDate || "",
            vendorName: vendor?.name || "Unknown",
            vendorEmail: vendor?.email,
            siteName: site?.hopAB || site?.siteId || "Unknown",
            description: po?.description || "N/A",
            quantity: po?.quantity || 0,
            unitPrice: po?.unitPrice?.toString() || "0",
            amount: invoice.amount,
            gst: invoice.gst,
            totalAmount: invoice.totalAmount,
            invoiceDate: invoice.invoiceDate,
            invoiceDueDate: invoice.dueDate,
            status: invoice.status,
          });
        }
        setAllInvoices(invoiceRecords);

        // Filter out POs that already have invoices
        const posWithInvoices = new Set(invoices.map((inv: any) => inv.poId));
        const filtered = pos.filter((po: any) => !posWithInvoices.has(po.id));
        setAvailablePOs(filtered);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handlePOSelection = (poId: string) => {
    const newSet = new Set(selectedPOs);
    if (newSet.has(poId)) {
      newSet.delete(poId);
    } else {
      newSet.add(poId);
    }
    setSelectedPOs(newSet);
  };

  const downloadInvoicePDF = (invoice: InvoiceRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let yPosition = margin;

    // Colors
    const primaryColor = [0, 51, 102]; // Dark blue
    const lightGray = [245, 245, 245];
    const darkGray = [80, 80, 80];

    // Header Background
    doc.setFillColor(...lightGray);
    doc.rect(0, 0, pageWidth, 25, "F");

    // Company Title
    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.text("INVOICE", margin, 16, { align: "left" });

    // Reset position
    yPosition = 30;

    // Two Column Layout - Invoice Details & Dates
    const col1X = margin;
    const col2X = pageWidth / 2 + 5;

    // Left Column - Invoice Details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("INVOICE DETAILS", col1X, yPosition);
    yPosition += 5;

    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, col1X, yPosition);
    yPosition += 4;
    doc.text(`Invoice Date: ${invoice.invoiceDate}`, col1X, yPosition);
    yPosition += 4;
    doc.text(`Due Date: ${invoice.invoiceDueDate}`, col1X, yPosition);

    // Right Column - PO References
    yPosition = 35;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("PURCHASE ORDER", col2X, yPosition);
    yPosition += 5;

    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text(`PO #: ${invoice.poNumber}`, col2X, yPosition);
    yPosition += 4;
    doc.text(`PO Date: ${invoice.poDate}`, col2X, yPosition);
    yPosition += 4;
    doc.text(`PO Due: ${invoice.poDueDate}`, col2X, yPosition);

    // Separator
    yPosition = 52;
    doc.setDrawColor(0, 51, 102);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Vendor Details Section
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text("BILL TO:", margin, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text(`Vendor: ${invoice.vendorName}`, margin + 2, yPosition);
    yPosition += 4;
    if (invoice.vendorEmail) {
      doc.text(`Email: ${invoice.vendorEmail}`, margin + 2, yPosition);
      yPosition += 4;
    }
    doc.text(`Site: ${invoice.siteName}`, margin + 2, yPosition);
    yPosition += 8;

    // Item Details Section
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text("ITEM DETAILS", margin, yPosition);
    yPosition += 5;

    // Table Headers
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text("Description", margin + 2, yPosition + 1);
    doc.text("Qty", pageWidth / 2 + 10, yPosition + 1);
    doc.text("Unit Rate (₹)", pageWidth / 2 + 30, yPosition + 1);
    doc.text("Amount (₹)", pageWidth - margin - 22, yPosition + 1, { align: "right" });

    yPosition += 8;

    // Item Row
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    
    const descLines = doc.splitTextToSize(invoice.description, 50);
    doc.text(descLines, margin + 2, yPosition);
    
    doc.text(invoice.quantity.toString(), pageWidth / 2 + 10, yPosition);
    doc.text(parseFloat(invoice.unitPrice).toFixed(2), pageWidth / 2 + 30, yPosition);
    doc.text(parseFloat(invoice.unitPrice) * invoice.quantity, pageWidth - margin - 22, yPosition, { align: "right" });

    yPosition += 12;

    // Summary Section
    doc.setDrawColor(0, 51, 102);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // Subtotal
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Subtotal:", pageWidth / 2, yPosition, { align: "right" });
    doc.setTextColor(...darkGray);
    doc.text(`₹${parseFloat(invoice.amount).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: "right" });
    yPosition += 5;

    // GST
    const gstPercent = (parseFloat(invoice.gst) / parseFloat(invoice.amount) * 100).toFixed(1);
    doc.setTextColor(100, 100, 100);
    doc.text(`GST (${gstPercent}%):`, pageWidth / 2, yPosition, { align: "right" });
    doc.setTextColor(...darkGray);
    doc.text(`₹${parseFloat(invoice.gst).toFixed(2)}`, pageWidth - margin - 2, yPosition, { align: "right" });
    yPosition += 5;

    // Total
    doc.setFillColor(...lightGray);
    doc.rect(pageWidth / 2 - 5, yPosition - 3, pageWidth / 2 - margin + 3, 6, "F");
    
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("TOTAL AMOUNT:", pageWidth / 2, yPosition + 1, { align: "right" });
    doc.text(`₹${parseFloat(invoice.totalAmount).toFixed(2)}`, pageWidth - margin - 2, yPosition + 1, { align: "right" });

    // Status Badge
    yPosition += 10;
    doc.setFontSize(8);
    const statusColor = invoice.status === "Draft" ? [255, 193, 7] : [76, 175, 80];
    doc.setFillColor(...statusColor);
    doc.rect(pageWidth / 2 - 5, yPosition - 2, 30, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(`Status: ${invoice.status}`, pageWidth / 2 - 3, yPosition + 0.5, { align: "center" });

    // Footer
    yPosition = pageHeight - 12;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    doc.text("This is an electronically generated document. No signature required.", pageWidth / 2, yPosition + 1, { align: "center" });

    // Save PDF
    doc.save(`${invoice.invoiceNumber}.pdf`);
    toast({ title: "Success", description: "Invoice downloaded successfully" });
  };

  const generateInvoices = async () => {
    if (selectedPOs.size === 0) {
      toast({ title: "Alert", description: "Please select at least one PO", variant: "destructive" });
      return;
    }

    try {
      const selectedPOIds = Array.from(selectedPOs);
      const posData = availablePOs.filter(po => selectedPOIds.includes(po.id));

      const records: InvoiceRecord[] = posData.map((po, index) => {
        const vendor = vendors.find(v => v.id === po.vendorId);
        const poAmount = parseFloat(po.totalAmount.toString());
        const gstAmount = (poAmount * parseFloat(gstRate)) / 100;
        const totalAmount = poAmount + gstAmount;

        return {
          id: "",
          invoiceNumber: `INV-${Date.now()}-${index + 1}`,
          poNumber: po.poNumber,
          vendorName: vendor?.name || "Unknown",
          amount: po.totalAmount.toString(),
          gst: gstAmount.toString(),
          totalAmount: totalAmount.toString(),
          invoiceDate: new Date().toISOString().split('T')[0],
          status: "Draft",
        };
      });

      // Create invoices via API
      const createdInvoices = [];
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const po = posData[i];

        const response = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceNumber: record.invoiceNumber,
            vendorId: po.vendorId,
            poId: po.id,
            invoiceDate: record.invoiceDate,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: po.totalAmount.toString(),
            gst: record.gst,
            totalAmount: record.totalAmount,
            status: "Draft",
          }),
        });

        if (response.ok) {
          const createdInvoice = await response.json();
          createdInvoices.push({ ...record, id: createdInvoice.id });
        }
      }

      setInvoiceRecords(createdInvoices);
      setSelectedPOs(new Set());

      // Update available POs and all invoices
      const updatedAvailable = availablePOs.filter(
        po => !selectedPOIds.includes(po.id)
      );
      setAvailablePOs(updatedAvailable);
      setAllInvoices([...allInvoices, ...createdInvoices]);

      toast({
        title: "Success",
        description: `${createdInvoices.length} Invoice(s) generated successfully`,
      });

      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate invoices";
      toast({ title: "Alert", description: errorMessage, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Generate Invoices</h2>
        <p className="text-muted-foreground">Create invoices for Purchase Orders with automatic GST calculation.</p>
      </div>

      {availablePOs.length === 0 && allInvoices.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No Purchase Orders available for invoice generation.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {availablePOs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Purchase Orders</CardTitle>
                <CardDescription>Select POs to generate invoices ({availablePOs.length} available)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium">GST Rate (%)</label>
                  <Input
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-24 mt-1"
                  />
                </div>

                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {availablePOs.map((po) => {
                    const vendor = vendors.find(v => v.id === po.vendorId);
                    return (
                      <div
                        key={po.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handlePOSelection(po.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPOs.has(po.id)}
                          onChange={() => handlePOSelection(po.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{po.poNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Vendor: {vendor?.name} | Amount: ₹{po.totalAmount}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={generateInvoices} className="mt-4 w-full" disabled={selectedPOs.size === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Invoices ({selectedPOs.size} selected)
                </Button>
              </CardContent>
            </Card>
          )}

          {invoiceRecords.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-700">✓ Just Generated Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {invoiceRecords.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-4 bg-white hover:shadow-md hover:border-blue-400 transition-all">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Number</p>
                          <p className="text-base font-bold text-blue-600">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
                            <p className="text-sm font-semibold">{invoice.poNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-sm font-semibold">{invoice.vendorName}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Amount</p>
                            <p className="text-sm text-gray-700">₹{invoice.amount}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">GST ({gstRate}%)</p>
                            <p className="text-sm text-gray-700">₹{parseFloat(invoice.gst).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Total</p>
                          <p className="text-lg font-bold text-green-600">₹{parseFloat(invoice.totalAmount).toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => downloadInvoicePDF(invoice)}
                          className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                          <Download className="h-4 w-4" /> Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {allInvoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Generated Invoices</CardTitle>
                <CardDescription>Complete list of all invoices ({allInvoices.length} total)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {allInvoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase">Invoice Number</p>
                          <p className="text-base font-bold text-blue-600">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">PO Number</p>
                            <p className="text-sm font-semibold">{invoice.poNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Vendor</p>
                            <p className="text-sm font-semibold">{invoice.vendorName}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Amount</p>
                            <p className="text-sm text-gray-700">₹{invoice.amount}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase">Total</p>
                            <p className="text-sm font-bold text-green-600">₹{parseFloat(invoice.totalAmount).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Status</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${invoice.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {invoice.status}
                          </span>
                        </div>
                        <button
                          onClick={() => downloadInvoicePDF(invoice)}
                          className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                          <Download className="h-4 w-4" /> Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
