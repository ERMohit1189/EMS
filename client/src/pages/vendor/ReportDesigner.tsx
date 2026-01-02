import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/api";
import {
  Type,
  Square,
  Minus,
  Grid3x3,
  Trash2,
  Copy,
  Download,
  Printer,
  Save,
  Undo2,
  Maximize2,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  AlignLeft,
  AlignRight,
  AlignCenter,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Lock,
  Unlock,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportElement {
  id: string;
  type: "text" | "line" | "vline" | "rectangle" | "table" | "field" | "border" | "image" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  // For standard elements
  content?: string;
  fieldName?: string;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  borderColor?: string;
  bgColor?: string;
  borderWidth?: number;
  imageUrl?: string;
  rows?: number;
  cols?: number;
  rotation?: number;
  locked?: boolean;
  headerHeight?: number;
  // Table-related properties
  cellPadding?: number;
  rowHeight?: number;
  columnWidths?: number[];
  columnAlignments?: string[];
  columns?: string[]; // optional explicit column keys for table
  repeat?: string; // section name to repeat rows for
  showHeader?: boolean;
  repeatHeaderOnEveryPage?: boolean;
  headerFontSize?: number;
  headerFontWeight?: string;
  headerBgColor?: string;
  headerFontColor?: string;
  altRowBgColor?: string;
  altRowFontColor?: string;
  // Group support
  children?: string[]; // IDs of child elements when type === 'group'
  parentId?: string; // optional parent group id for child elements
}

interface DesignState {
  elements: ReportElement[];
  selectedId?: string;
  selectedIds: string[];
  history: ReportElement[][];
}

export default function ReportDesigner({
  templateName,
  templateId,
  queryFields,
  sectionQueries,
  onSave,
  onClose,
  initialDesign,
  initialMargins,
}: {
  templateName: string;
  templateId?: string;
  queryFields: string[];
  sectionQueries?: any[];
  onSave: (design: ReportElement[], margins: { left: number; right: number; top: number; bottom: number }) => void;
  onClose: () => void;
  initialDesign?: ReportElement[];
  initialMargins?: { left: number; right: number; top: number; bottom: number };
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [design, setDesign] = useState<DesignState>({
    elements: initialDesign || [],
    selectedIds: [],
    history: [initialDesign || []],
  });

  const [tool, setTool] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [resizing, setResizing] = useState<{ id: string; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [previewRect, setPreviewRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [copiedElement, setCopiedElement] = useState<ReportElement | null>(null);
  const [draggingElement, setDraggingElement] = useState<{ id: string; startX: number; startY: number; elementX: number; elementY: number; initialPositions?: { [id: string]: { x: number; y: number } } } | null>(null);
  const [sampleData, setSampleData] = useState<{ [key: string]: string }>({});
  const [showSampleDataDialog, setShowSampleDataDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"print" | "pdf" | null>(null);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [multiSelectBox, setMultiSelectBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ vertical?: number; horizontal?: number } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(100);
  const [footerHeight, setFooterHeight] = useState(80);
  const [isDraggingHeaderBorder, setIsDraggingHeaderBorder] = useState(false);
  const [isDraggingFooterBorder, setIsDraggingFooterBorder] = useState(false);
  const [leftMargin, setLeftMargin] = useState(initialMargins?.left ?? 0);
  const [rightMargin, setRightMargin] = useState(initialMargins?.right ?? 0);
  const [topMargin, setTopMargin] = useState(initialMargins?.top ?? 0);
  const [bottomMargin, setBottomMargin] = useState(initialMargins?.bottom ?? 0);

  const [toolbarPos, setToolbarPos] = useState(() => {
    const saved = localStorage.getItem('toolbarPos');
    return saved ? JSON.parse(saved) : { x: 20, y: 80 };
  });
  const [toolbarOrientation, setToolbarOrientation] = useState(() => {
    const saved = localStorage.getItem('toolbarOrientation');
    return saved ? saved : 'horizontal';
  });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  // Print settings modal visibility
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  // Default margins for print settings modal
  const DEFAULT_MARGINS = { left: 40, right: 40, top: 40, bottom: 40 };

  // Temp margins state for modal editing
  const [tempMargins, setTempMargins] = useState<{ left: number; right: number; top: number; bottom: number }>(
    initialMargins ?? DEFAULT_MARGINS
  );

  // Export margins (persisted, used for print/export). This is separate from layout margins which trigger reflow.
  const [exportMargins, setExportMargins] = useState<{ left: number; right: number; top: number; bottom: number }>(initialMargins ?? DEFAULT_MARGINS);

  // If initialMargins prop changes (e.g., loaded from DB), sync exportMargins
  useEffect(() => {
    setExportMargins(initialMargins ?? DEFAULT_MARGINS);
  }, [initialMargins]);

  // Page size / orientation state for export and applied viewer
  const [exportPageSize, setExportPageSize] = useState<string>('A4');
  const [exportOrientation, setExportOrientation] = useState<'portrait'|'landscape'>('portrait');
  const [exportAutoFixOverlaps, setExportAutoFixOverlaps] = useState<boolean>(false);

  const [appliedPageSize, setAppliedPageSize] = useState<string>('A4');
  const [appliedOrientation, setAppliedOrientation] = useState<'portrait'|'landscape'>('portrait');

  // Modal temp page settings
  const [tempPageSize, setTempPageSize] = useState<string>(exportPageSize);
  const [tempOrientation, setTempOrientation] = useState<'portrait'|'landscape'>(exportOrientation);
  const [tempAutoFixOverlaps, setTempAutoFixOverlaps] = useState<boolean>(exportAutoFixOverlaps);

  // When opening the modal, populate tempMargins from saved export margins (if present) or defaults
  useEffect(() => {
    if (showPrintSettings) {
      const saved = exportMargins ?? (initialMargins ?? DEFAULT_MARGINS);
      setTempMargins({
        left: saved.left ?? DEFAULT_MARGINS.left,
        right: saved.right ?? DEFAULT_MARGINS.right,
        top: saved.top ?? DEFAULT_MARGINS.top,
        bottom: saved.bottom ?? DEFAULT_MARGINS.bottom,
      });
      // Load temp page settings from saved exports
      setTempPageSize(exportPageSize ?? 'A4');
      setTempOrientation(exportOrientation ?? 'portrait');
      setTempAutoFixOverlaps(exportAutoFixOverlaps ?? false);
    }
  }, [showPrintSettings, templateId, initialMargins, exportMargins, exportPageSize, exportOrientation, exportAutoFixOverlaps]);
  const [toolbarDragStart, setToolbarDragStart] = useState({ x: 0, y: 0 });

  // Refs to allow global undo/redo to be called by handlers defined earlier
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  // DPI used for conversions between px and inches (96 is common)
  const DPI = 96;
  const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);
  const PAGE_DEFINITIONS: Record<string, { wMm: number; hMm: number }> = {
    A3: { wMm: 420, hMm: 297 },
    A4: { wMm: 210, hMm: 297 },
    Letter: { wMm: 216, hMm: 279 },
  };

  const pxToIn = (px: number) => Math.round((px / DPI) * 100) / 100;
  const inToPx = (inch: number) => Math.round(inch * DPI);

  const getPagePx = (pageSizeStr: string, orientationStr: 'portrait'|'landscape') => {
    const def = PAGE_DEFINITIONS[pageSizeStr] ?? PAGE_DEFINITIONS['A4'];
    if (orientationStr === 'portrait') return { w: mmToPx(def.wMm), h: mmToPx(def.hMm) };
    return { w: mmToPx(def.hMm), h: mmToPx(def.wMm) };
  };

  // Helper function to constrain element position within margins
  const constrainElementPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    margins: { left: number; right: number; top: number; bottom: number }
  ) => {
    // Use actual canvas dimensions when available so right/bottom margins are respected correctly
    const canvasWidth = canvasRef.current?.clientWidth ?? getPagePx(appliedPageSize, appliedOrientation).w;
    const canvasHeight = canvasRef.current?.clientHeight ?? getPagePx(appliedPageSize, appliedOrientation).h;

    const maxX = Math.max(margins.left, canvasWidth - margins.right - width);
    const maxY = Math.max(margins.top, canvasHeight - margins.bottom - height);

    const constrainedX = Math.max(margins.left, Math.min(maxX, x));
    const constrainedY = Math.max(margins.top, Math.min(maxY, y));
    return { x: constrainedX, y: constrainedY };
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1; // Shift key for larger movements

      // Check for Ctrl/Cmd key combinations
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo / Redo (global)
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redoRef.current();
        } else {
          undoRef.current();
        }
        return;
      }
      if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redoRef.current();
        return;
      }

      // The following shortcuts require a selection
      if (!design.selectedId) return;
      const selected = design.elements.find((el) => el.id === design.selectedId);
      if (!selected) return;

      switch (e.key) {
        case "Delete":
          e.preventDefault();
          deleteElement(design.selectedId);
          toast({
            title: "Deleted",
            description: "Element removed from design",
          });
          break;
        case "c":
        case "C":
          if (isCtrlOrCmd) {
            e.preventDefault();
            setCopiedElement(selected);
            toast({
              title: "Copied",
              description: "Element copied to clipboard",
            });
          }
          break;
        case "v":
        case "V":
          if (isCtrlOrCmd && copiedElement) {
            e.preventDefault();
            const constrained = constrainElementPosition(
              copiedElement.x + 20,
              copiedElement.y + 20,
              copiedElement.width,
              copiedElement.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            const newElement: ReportElement = {
              ...copiedElement,
              id: `elem-${Date.now()}`,
              x: constrained.x,
              y: constrained.y,
            };
            addElement(newElement);
            toast({
              title: "Pasted",
              description: "Element pasted to canvas",
            });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          {
            const constrained = constrainElementPosition(
              selected.x,
              Math.max(topMargin, selected.y - step),
              selected.width,
              selected.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            updateElement(design.selectedId, { y: constrained.y });
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          {
            const constrained = constrainElementPosition(
              selected.x,
              selected.y + step,
              selected.width,
              selected.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            updateElement(design.selectedId, { y: constrained.y });
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          {
            const constrained = constrainElementPosition(
              Math.max(leftMargin, selected.x - step),
              selected.y,
              selected.width,
              selected.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            updateElement(design.selectedId, { x: constrained.x });
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          {
            const constrained = constrainElementPosition(
              selected.x + step,
              selected.y,
              selected.width,
              selected.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            updateElement(design.selectedId, { x: constrained.x });
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [design.selectedId, design.elements, copiedElement]);

  // Handle paste events to prevent automatic text conversion
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only prevent paste on canvas if it's plain text (not a design element)
      const target = e.target as HTMLElement;

      // Check if pasting on the canvas element itself (not on an input inside it)
      if (target === canvasRef.current || (canvasRef.current?.contains(target) && !target.matches("input, textarea, [contenteditable]"))) {
        // Allow paste only if pasting a design element (handled by Ctrl+V keyboard handler)
        // Prevent browser default paste behavior for plain text on canvas
        const plainText = e.clipboardData?.getData("text/plain");

        // If there's plain text being pasted directly to canvas
        if (plainText) {
          e.preventDefault();
          toast({
            title: "Info",
            description: "Use the Text tool to add text elements to the design",
          });
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [canvasRef]);

  // Save toolbar position to localStorage
  useEffect(() => {
    localStorage.setItem('toolbarPos', JSON.stringify(toolbarPos));
  }, [toolbarPos]);

  // Save toolbar orientation to localStorage
  useEffect(() => {
    localStorage.setItem('toolbarOrientation', toolbarOrientation);
  }, [toolbarOrientation]);

  // Handle toolbar dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingToolbar) return;
      setToolbarPos({
        x: e.clientX - toolbarDragStart.x,
        y: e.clientY - toolbarDragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    if (isDraggingToolbar) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingToolbar, toolbarDragStart]);

  // Adjust elements when margins change
  // Store previous margins in a ref to calculate delta
  const prevMarginsRef = useRef({ left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin });

  // Redo stack: store popped history snapshots for redo
  const redoStackRef = useRef<ReportElement[][]>([]);

  useEffect(() => {
    // Calculate margin changes
    const leftDelta = leftMargin - prevMarginsRef.current.left;
    const rightDelta = rightMargin - prevMarginsRef.current.right;
    const topDelta = topMargin - prevMarginsRef.current.top;
    const bottomDelta = bottomMargin - prevMarginsRef.current.bottom;

    // If any margin changed, adjust element positions and ensure they remain within new margins
    if (leftDelta !== 0 || rightDelta !== 0 || topDelta !== 0 || bottomDelta !== 0) {
      const canvasWidth = canvasRef.current?.clientWidth ?? getPagePx(appliedPageSize, appliedOrientation).w;
      const canvasHeight = canvasRef.current?.clientHeight ?? getPagePx(appliedPageSize, appliedOrientation).h;

      const prevLeft = prevMarginsRef.current.left;
      const prevRight = prevMarginsRef.current.right;
      const prevTop = prevMarginsRef.current.top;
      const prevBottom = prevMarginsRef.current.bottom;

      const oldContentWidth = Math.max(1, canvasWidth - prevLeft - prevRight);
      const newContentWidth = Math.max(1, canvasWidth - leftMargin - rightMargin);
      const oldContentHeight = Math.max(1, canvasHeight - prevTop - prevBottom);
      const newContentHeight = Math.max(1, canvasHeight - topMargin - bottomMargin);

      const changedX = leftDelta !== 0 || rightDelta !== 0;
      const changedY = topDelta !== 0 || bottomDelta !== 0;

      // Map elements: only adjust axes that actually changed
      let updatedElements = design.elements.map((el) => {
        let newX = el.x;
        let newY = el.y;
        let newW = el.width;
        let newH = el.height;

        if (changedX) {
          const relLeft = (el.x - prevLeft) / oldContentWidth;
          const scaleX = newContentWidth / oldContentWidth;

          // Scale width proportionally to horizontal content change
          newW = Math.max(30, Math.round(el.width * scaleX));

          // Map left position proportionally
          newX = leftMargin + relLeft * newContentWidth;

          // Ensure within content area horizontally
          if (newW >= newContentWidth) {
            newW = newContentWidth;
            newX = leftMargin;
          } else if (newX + newW > leftMargin + newContentWidth) {
            newX = leftMargin + newContentWidth - newW;
          }
        }

        if (changedY) {
          const relTop = (el.y - prevTop) / oldContentHeight;
          const scaleY = newContentHeight / oldContentHeight;

          // Scale height proportionally to vertical content change
          newH = Math.max(30, Math.round(el.height * scaleY));

          // Map top position proportionally
          newY = topMargin + relTop * newContentHeight;

          if (newH >= newContentHeight) {
            newH = newContentHeight;
            newY = topMargin;
          } else if (newY + newH > topMargin + newContentHeight) {
            newY = topMargin + newContentHeight - newH;
          }
        }

        // If axis didn't change, just clamp to new margins
        if (!changedX) {
          const c = constrainElementPosition(newX, newY, newW, newH, { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin });
          newX = c.x;
        }
        if (!changedY) {
          const c = constrainElementPosition(newX, newY, newW, newH, { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin });
          newY = c.y;
        }

        return { ...el, x: newX, y: newY, width: newW, height: newH } as ReportElement;
      });

      // Overlap resolution: only along axes that changed
      const GAP = 4;
      const rectsOverlap = (a: ReportElement, b: ReportElement) => {
        return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
      };

      if (changedY) {
        // Existing vertical overlap resolver (nudges down)
        const sorted = [...updatedElements].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
        for (let pass = 0; pass < 3; pass++) {
          let changed = false;
          for (let i = 0; i < sorted.length; i++) {
            const a = sorted[i];
            for (let j = 0; j < i; j++) {
              const b = sorted[j];
              if (rectsOverlap(a, b)) {
                const desiredY = b.y + b.height + GAP;
                const maxY = topMargin + newContentHeight - a.height;
                if (desiredY <= maxY) {
                  a.y = desiredY;
                } else {
                  const upY = b.y - a.height - GAP;
                  const minY = topMargin;
                  if (upY >= minY) {
                    b.y = upY;
                  } else {
                    a.y = Math.min(Math.max(a.y, topMargin), maxY);
                  }
                }
                const clamped = constrainElementPosition(a.x, a.y, a.width, a.height, { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin });
                if (clamped.y !== a.y) a.y = clamped.y;
                changed = true;
              }
            }
          }
          if (!changed) break;
        }
        updatedElements = sorted;
      } else if (changedX) {
        // Horizontal overlap resolver (nudges right)
        const sorted = [...updatedElements].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
        for (let pass = 0; pass < 3; pass++) {
          let changed = false;
          for (let i = 0; i < sorted.length; i++) {
            const a = sorted[i];
            for (let j = 0; j < i; j++) {
              const b = sorted[j];
              // Only consider overlap if vertical ranges intersect (same row)
              const verticalOverlap = !(a.y + a.height <= b.y || b.y + b.height <= a.y);
              if (verticalOverlap && a.x < b.x + b.width && a.x + a.width > b.x) {
                const desiredX = b.x + b.width + GAP;
                const maxX = leftMargin + newContentWidth - a.width;
                if (desiredX <= maxX) {
                  a.x = desiredX;
                } else {
                  const leftX = b.x - a.width - GAP;
                  const minX = leftMargin;
                  if (leftX >= minX) {
                    b.x = leftX;
                  } else {
                    a.x = Math.min(Math.max(a.x, leftMargin), maxX);
                  }
                }
                const clamped = constrainElementPosition(a.x, a.y, a.width, a.height, { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin });
                if (clamped.x !== a.x) a.x = clamped.x;
                changed = true;
              }
            }
          }
          if (!changed) break;
        }
        updatedElements = sorted;
      }

      // Clear redo stack because this is a layout change effected by user action
      redoStackRef.current = [];

      setDesign((prev) => ({
        ...prev,
        elements: updatedElements,
        history: [...prev.history, updatedElements],
      }));
    }

    // Update previous margins for next comparison
    prevMarginsRef.current = { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin };
  }, [leftMargin, rightMargin, topMargin, bottomMargin, design.elements]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Right mouse button - disabled to avoid interference
    // if (e.button === 2) {
    //   e.preventDefault();
    //   setIsMultiSelecting(true);
    //   setStartPos({ x, y });
    //   return;
    // }

    // Determine which elements are under the pointer (topmost elements first)
    const clickedCandidates: ReportElement[] = [];
    for (let i = design.elements.length - 1; i >= 0; i--) {
      const el = design.elements[i];
      const buffer = (el.type === "line" || el.type === "vline") ? 8 : 0;
      if (
        x >= el.x - buffer &&
        x <= el.x + el.width + buffer &&
        y >= el.y - buffer &&
        y <= el.y + el.height + buffer
      ) {
        clickedCandidates.push(el);
      }
    }

    // Choose clicked element with the following preference:
    // 1) unlocked non-group child under pointer (so clicking inside a group picks the child),
    // 2) unlocked element under pointer (may be group),
    // 3) topmost element under pointer (locked or unlocked)
    let clicked: ReportElement | undefined = undefined;
    if (clickedCandidates.length > 0) {
      clicked = clickedCandidates.find((el) => !el.locked && el.type !== 'group')
             || clickedCandidates.find((el) => !el.locked)
             || clickedCandidates[0];
    }

    // If the user is explicitly holding Alt or Shift, prefer selecting the parent group instead
        if (clicked && clicked.parentId && (e.altKey || e.shiftKey)) {
          const parentId = clicked.parentId;
          const parentGroup = design.elements.find((el) => el.id === parentId && el.type === 'group');
          if (parentGroup && !parentGroup.locked) {
            clicked = parentGroup;
          }
        }

    // If no tool is active, handle selection/deselection and dragging
    if (!tool) {
      if (clicked) {
        // Determine new selected IDs
        let newSelectedIds: string[] = [];
        if (e.ctrlKey || e.metaKey) {
          // Multi-selection with Ctrl+Click (or Cmd on Mac)
          const isSelected = design.selectedIds.includes(clicked.id);
          newSelectedIds = isSelected
            ? design.selectedIds.filter((id) => id !== clicked.id)
            : [...design.selectedIds, clicked.id];
          console.log("Multi-select - newSelectedIds:", newSelectedIds);
        } else {
          // Single selection
          newSelectedIds = [clicked.id];
        }

        // Update selection
        setDesign((prev) => ({
          ...prev,
          selectedId: newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : undefined,
          selectedIds: newSelectedIds,
        }));

        // Start dragging (but not if text is in edit mode or element is locked)
        if (e.button === 0 && editingId !== clicked.id && !clicked.locked) { // Left mouse button, not editing text, and not locked
          // Store initial positions of all selected elements for smooth multi-drag
          const initialPositions: { [id: string]: { x: number; y: number } } = {};

          // If clicked is a group, store initial positions for its children
          if (clicked.type === 'group' && clicked.children) {
            clicked.children.forEach((childId) => {
              const child = design.elements.find((el) => el.id === childId);
              if (child && !child.locked) {
                initialPositions[childId] = { x: child.x, y: child.y };
              }
            });
            // Also add group's initial position
            initialPositions[clicked.id] = { x: clicked.x, y: clicked.y };
          } else {
            newSelectedIds.forEach((id) => {
              const el = design.elements.find((e) => e.id === id);
              if (el && !el.locked) {
                initialPositions[id] = { x: el.x, y: el.y };
              }
            });
          }

          setDraggingElement({
            id: clicked.id,
            startX: e.clientX,
            startY: e.clientY,
            elementX: clicked.x,
            elementY: clicked.y,
            initialPositions,
          });
        }
      } else {
        // Clicked on empty space - deselect all
        setDesign((prev) => ({
          ...prev,
          selectedId: undefined,
          selectedIds: [],
        }));
      }
      return;
    }

    if (clicked && tool === "select") {
      setDesign((prev) => ({ ...prev, selectedId: clicked.id }));
      return;
    }

    if (["text", "line", "vline", "rectangle", "table", "field", "border"].includes(tool)) {
      setIsDrawing(true);
      setStartPos({ x, y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Handle header border dragging
    if (isDraggingHeaderBorder && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newHeaderHeight = Math.max(50, Math.min(getPagePx(appliedPageSize, appliedOrientation).h - 200, e.clientY - rect.top));
      setHeaderHeight(newHeaderHeight);
      return;
    }

    // Handle footer border dragging
    if (isDraggingFooterBorder && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newFooterHeight = Math.max(50, Math.min(getPagePx(appliedPageSize, appliedOrientation).h - 200, rect.bottom - e.clientY));
      setFooterHeight(newFooterHeight);
      return;
    }



    if (resizing) {
      handleMouseMove(e);
      return;
    }

    // Handle multi-select box drawing
    if (isMultiSelecting && !tool && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const width = Math.abs(x - startPos.x);
      const height = Math.abs(y - startPos.y);
      const minX = Math.min(startPos.x, x);
      const minY = Math.min(startPos.y, y);

      setMultiSelectBox({ x: minX, y: minY, width, height });
      return;
    }

    // Handle dragging elements
    if (draggingElement && !tool) {
      const deltaX = e.clientX - draggingElement.startX;
      const deltaY = e.clientY - draggingElement.startY;

      const draggingEl = design.elements.find((el) => el.id === draggingElement.id);

      // If dragging a group, move group and its children using stored initialPositions
      if (draggingEl?.type === 'group' && draggingEl.children && draggingElement.initialPositions) {
        // Calculate new group position constrained by margins and canvas
        const constrainedGroup = constrainElementPosition(
          draggingElement.elementX + deltaX,
          draggingElement.elementY + deltaY,
          draggingEl.width,
          draggingEl.height,
          { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
        );

        const newGroupX = constrainedGroup.x;
        const newGroupY = constrainedGroup.y;

        // Move children relative to their initial positions (fall back to current position if initial not available)
        const updatedChildPositions: { [id: string]: { x: number; y: number } } = {};
        draggingEl.children.forEach((childId) => {
          const childEl = design.elements.find((el) => el.id === childId);
          // prefer stored initial position, otherwise use child's current position as fallback
          const storedInit = draggingElement.initialPositions ? draggingElement.initialPositions[childId] : undefined;
          const initPos = storedInit ?? (childEl ? { x: childEl.x, y: childEl.y } : undefined);
          if (initPos && childEl && !childEl.locked) {
            const tentativeX = initPos.x + deltaX;
            const tentativeY = initPos.y + deltaY;
            const constrainedChild = constrainElementPosition(
              tentativeX,
              tentativeY,
              childEl.width,
              childEl.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            updatedChildPositions[childId] = { x: constrainedChild.x, y: constrainedChild.y };
          }
        });

        // Alignment guides based on children
        const guides = calculateAlignmentGuides(Object.keys(updatedChildPositions), updatedChildPositions);
        setAlignmentGuides(guides);

        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) => {
            if (el.id === draggingEl.id) {
              return { ...el, x: newGroupX, y: newGroupY };
            }
            if (updatedChildPositions[el.id]) {
              return { ...el, x: updatedChildPositions[el.id].x, y: updatedChildPositions[el.id].y };
            }
            return el;
          }),
        }));

        return;
      }

      // Existing multi-select move
      const constrained = constrainElementPosition(
        draggingElement.elementX + deltaX,
        draggingElement.elementY + deltaY,
        draggingEl?.width || 50,
        draggingEl?.height || 30,
        { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
      );

      const newX = constrained.x;
      const newY = constrained.y;

      if (design.selectedIds.length > 1 && draggingElement.initialPositions) {
        const currentPositions: { [id: string]: { x: number; y: number } } = {};
        design.selectedIds.forEach((id) => {
          const el = design.elements.find((e) => e.id === id);
          if (el && !el.locked && draggingElement.initialPositions![id]) {
            const constrainedPos = constrainElementPosition(
              draggingElement.initialPositions![id].x + deltaX,
              draggingElement.initialPositions![id].y + deltaY,
              el.width,
              el.height,
              { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
            );
            currentPositions[id] = {
              x: constrainedPos.x,
              y: constrainedPos.y,
            };
          }
        });

        const guides = calculateAlignmentGuides(Object.keys(currentPositions), currentPositions);
        setAlignmentGuides(guides);

        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            currentPositions[el.id]
              ? {
                  ...el,
                  x: currentPositions[el.id].x,
                  y: currentPositions[el.id].y,
                }
              : el
          ),
        }));
      } else {
        const currentPositions = { [draggingElement.id]: { x: newX, y: newY } };
        const guides = calculateAlignmentGuides([draggingElement.id], currentPositions);
        setAlignmentGuides(guides);

        updateElement(draggingElement.id, { x: newX, y: newY });
      }
      return;
    }

    if (!isDrawing || !tool || !canvasRef.current) {
      // Update cursor based on hover position
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && tool === "select") {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hoveredElement = design.elements.find(
          (el) =>
            x >= el.x &&
            x <= el.x + el.width &&
            y >= el.y &&
            y <= el.y + el.height
        );
        if (canvasRef.current) {
          canvasRef.current.style.cursor = hoveredElement ? "pointer" : "default";
        }
      }
      return;
    }

    if (!tool || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);
    const minX = Math.min(startPos.x, x);
    const minY = Math.min(startPos.y, y);

    setPreviewRect({ x: minX, y: minY, width, height });
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldName = e.dataTransfer.getData("fieldName");

    if (!fieldName || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 50; // Center the field
    const y = e.clientY - rect.top - 25;

    // Constrain within margins
    const constrained = constrainElementPosition(
      x,
      y,
      100,
      30,
      { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
    );

    const newElement: ReportElement = {
      id: `elem-${Date.now()}`,
      type: "field",
      x: constrained.x,
      y: constrained.y,
      width: 100,
      height: 30,
      fieldName,
      bgColor: "#dcfce7",
    };

    addElement(newElement);
    toast({
      title: "Field Added",
      description: `Field '${fieldName}' added to canvas`,
    });
  };

  // Column resize support (drag the small handle rendered in header)
  const columnResizeState = useRef<{ elId: string; colIndex: number; startX: number; startWidths: number[] } | null>(null);

  const startColumnResize = (elId: string, colIndex: number, mouseEvent: React.MouseEvent) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    const el = design.elements.find((d) => d.id === elId);
    if (!el) return;
    const cols = el.cols || 2;
    const startWidths = (el as any).columnWidths && (el as any).columnWidths.length ? [...(el as any).columnWidths] : Array.from({ length: cols }).map(() => Math.max(40, Math.floor(el.width / cols)));
    columnResizeState.current = { elId, colIndex, startX: mouseEvent.clientX, startWidths };

    const onMove = (ev: MouseEvent) => {
      const st = columnResizeState.current;
      if (!st) return;
      const delta = Math.round(ev.clientX - st.startX);
      const newWidths = [...st.startWidths];
      newWidths[st.colIndex] = Math.max(30, Math.round(st.startWidths[st.colIndex] + delta));
      // Apply live update
      updateElement(st.elId, { columnWidths: newWidths });
    };

    const onUp = (ev: MouseEvent) => {
      columnResizeState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    // Stop header border dragging
    if (isDraggingHeaderBorder) {
      setIsDraggingHeaderBorder(false);
      return;
    }

    // Stop footer border dragging
    if (isDraggingFooterBorder) {
      setIsDraggingFooterBorder(false);
      return;
    }

    if (resizing) {
      handleMouseUp();
      return;
    }

    // Finish multi-select box
    if (isMultiSelecting && !tool && multiSelectBox) {
      const selectedInBox = design.elements.filter((el) => {
        return (
          el.x < multiSelectBox.x + multiSelectBox.width &&
          el.x + el.width > multiSelectBox.x &&
          el.y < multiSelectBox.y + multiSelectBox.height &&
          el.y + el.height > multiSelectBox.y
        );
      });

      setDesign((prev) => ({
        ...prev,
        selectedId: selectedInBox.length > 0 ? selectedInBox[0].id : undefined,
        selectedIds: selectedInBox.map((el) => el.id),
      }));

      setIsMultiSelecting(false);
      setMultiSelectBox(null);
      return;
    }

    // Finish dragging
    if (draggingElement) {
      setDraggingElement(null);
      setAlignmentGuides(null);
      return;
    }

    if (!isDrawing || !tool || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const deltaX = Math.abs(x - startPos.x);
    const deltaY = Math.abs(y - startPos.y);
    let minX = Math.min(startPos.x, x);
    let minY = Math.min(startPos.y, y);

    let width = deltaX;
    let height = deltaY;

    // For horizontal/vertical lines, constrain to one direction
    if (tool === "line") {
      if (deltaX >= deltaY) {
        // Horizontal line
        height = 1;
        width = Math.max(30, deltaX);
      } else {
        // Vertical line
        width = 1;
        height = Math.max(30, deltaY);
      }
    } else {
      // For other tools, apply minimum size
      width = Math.max(50, deltaX);
      height = Math.max(30, deltaY);
    }

    const finalWidth = tool === "vline" ? 1 : width;
    const finalHeight = tool === "vline" ? height : height;

    // Constrain element position within margins
    const constrained = constrainElementPosition(
      minX,
      minY,
      finalWidth,
      finalHeight,
      { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin }
    );

    const newElement: ReportElement = {
      id: `elem-${Date.now()}`,
      type: (tool as any) || "text",
      x: constrained.x,
      y: constrained.y,
      width: finalWidth,
      height: finalHeight,
      content: tool === "text" ? "Text" : undefined,
      fontSize: 12,
      borderColor: "#000000",
      bgColor: tool === "border" || tool === "line" || tool === "vline" ? "transparent" : "#ffffff",
      borderWidth: (tool === "border" || tool === "line" || tool === "vline") ? 2 : undefined,
      rows: tool === "table" ? 2 : undefined,
      cols: tool === "table" ? 2 : undefined,
      cellPadding: tool === "table" ? 4 : undefined, // default cell padding (px)
      rowHeight: tool === "table" ? undefined : undefined, // optional explicit row height (px)
      headerHeight: tool === "table" ? 28 : undefined, // header row height in px
      // per-column defaults: split element width equally and default left alignment
      columnWidths: tool === "table" ? Array.from({ length: 2 }).map(() => Math.max(40, Math.floor(finalWidth / 2))) : undefined,
      columnAlignments: tool === "table" ? Array.from({ length: 2 }).map(() => "left") : undefined
    };

    addElement(newElement);
    setIsDrawing(false);
    setTool(null);
    setPreviewRect(null);
  };

  const addElement = (element: ReportElement) => {
    // Clear redo stack as this is a new action
    redoStackRef.current = [];
    setDesign((prev) => ({
      ...prev,
      elements: [...prev.elements, element],
      selectedId: element.id,
      history: [...prev.history, [...prev.elements, element]],
    }));
    toast({ title: "Added", description: `${element.type} added to design` });
  };

  const updateElement = (id: string, updates: Partial<ReportElement>) => {
    console.log("updateElement called with:", { id, updates });
    // Clear redo stack on new change
    redoStackRef.current = [];
    setDesign((prev) => {
      const updatedElements = prev.elements.map((el) => (el.id === id ? { ...el, ...updates } : el));
      // Push to history
      const newHistory = [...prev.history, updatedElements];
      return {
        ...prev,
        elements: updatedElements,
        history: newHistory,
      };
    });
  };

  const deleteElement = (id: string) => {
    // Clear redo stack as this is a new action
    redoStackRef.current = [];
    setDesign((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
      selectedId: undefined,
      history: [...prev.history, prev.elements.filter((el) => el.id !== id)],
    }));
  };

  // Calculate alignment guides when dragging
  const calculateAlignmentGuides = (draggingIds: string[], currentPositions: { [id: string]: { x: number; y: number } }) => {
    const SNAP_THRESHOLD = 8; // pixels
    let verticalGuide: number | undefined;
    let horizontalGuide: number | undefined;

    const draggingElements = design.elements.filter((el) => draggingIds.includes(el.id));
    const otherElements = design.elements.filter((el) => !draggingIds.includes(el.id));

    if (draggingElements.length === 0 || otherElements.length === 0) {
      return null;
    }

    // Check horizontal alignment (left, center, right)
    draggingElements.forEach((dragEl) => {
      const currentPos = currentPositions[dragEl.id];
      if (!currentPos) return;

      otherElements.forEach((otherEl) => {
        // Left edge alignment
        if (Math.abs((currentPos.x) - otherEl.x) <= SNAP_THRESHOLD) {
          verticalGuide = otherEl.x;
        }
        // Right edge alignment
        if (Math.abs((currentPos.x + dragEl.width) - (otherEl.x + otherEl.width)) <= SNAP_THRESHOLD) {
          verticalGuide = otherEl.x + otherEl.width;
        }
        // Center alignment
        if (Math.abs((currentPos.x + dragEl.width / 2) - (otherEl.x + otherEl.width / 2)) <= SNAP_THRESHOLD) {
          verticalGuide = otherEl.x + otherEl.width / 2;
        }
      });
    });

    // Check vertical alignment (top, middle, bottom)
    draggingElements.forEach((dragEl) => {
      const currentPos = currentPositions[dragEl.id];
      if (!currentPos) return;

      otherElements.forEach((otherEl) => {
        // Top edge alignment
        if (Math.abs((currentPos.y) - otherEl.y) <= SNAP_THRESHOLD) {
          horizontalGuide = otherEl.y;
        }
        // Bottom edge alignment
        if (Math.abs((currentPos.y + dragEl.height) - (otherEl.y + otherEl.height)) <= SNAP_THRESHOLD) {
          horizontalGuide = otherEl.y + otherEl.height;
        }
        // Middle alignment
        if (Math.abs((currentPos.y + dragEl.height / 2) - (otherEl.y + otherEl.height / 2)) <= SNAP_THRESHOLD) {
          horizontalGuide = otherEl.y + otherEl.height / 2;
        }
      });
    });

    if (verticalGuide !== undefined || horizontalGuide !== undefined) {
      return { vertical: verticalGuide, horizontal: horizontalGuide };
    }
    return null;
  };

  // Alignment functions
  const alignElements = (type: "left" | "right" | "center" | "top" | "bottom" | "middle") => {
    if (design.selectedIds.length < 2) return;

    const selectedElements = design.elements.filter((el) =>
      design.selectedIds.includes(el.id)
    );

    let alignValue: number;

    switch (type) {
      case "left":
        alignValue = Math.min(...selectedElements.map((el) => el.x));
        break;
      case "right":
        alignValue = Math.max(...selectedElements.map((el) => el.x + el.width));
        break;
      case "center":
        const totalWidth =
          Math.max(...selectedElements.map((el) => el.x + el.width)) -
          Math.min(...selectedElements.map((el) => el.x));
        alignValue =
          Math.min(...selectedElements.map((el) => el.x)) +
          (totalWidth - selectedElements[0].width) / 2;
        break;
      case "top":
        alignValue = Math.min(...selectedElements.map((el) => el.y));
        break;
      case "bottom":
        alignValue = Math.max(...selectedElements.map((el) => el.y + el.height));
        break;
      case "middle":
        const totalHeight =
          Math.max(...selectedElements.map((el) => el.y + el.height)) -
          Math.min(...selectedElements.map((el) => el.y));
        alignValue =
          Math.min(...selectedElements.map((el) => el.y)) +
          (totalHeight - selectedElements[0].height) / 2;
        break;
    }

    setDesign((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (!design.selectedIds.includes(el.id)) return el;

        if (type === "left") return { ...el, x: alignValue };
        if (type === "right") return { ...el, x: alignValue - el.width };
        if (type === "center")
          return { ...el, x: alignValue - (el.width / 2) };
        if (type === "top") return { ...el, y: alignValue };
        if (type === "bottom") return { ...el, y: alignValue - el.height };
        if (type === "middle")
          return { ...el, y: alignValue - (el.height / 2) };
        return el;
      }),
    }));
  };

  const undo = () => {
    if (design.history.length > 1) {
      const current = design.history[design.history.length - 1];
      const newHistory = design.history.slice(0, -1);
      // Push current to redo stack
      redoStackRef.current.push(current);
      setDesign((prev) => ({
        ...prev,
        elements: newHistory[newHistory.length - 1],
        history: newHistory,
      }));
    }
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (next) {
      setDesign((prev) => ({
        ...prev,
        elements: next,
        history: [...prev.history, next],
      }));
    }
  };

  // Ensure refs point to the current implementations so handlers defined earlier can call them safely
  undoRef.current = undo;
  redoRef.current = redo;

  const startEditingText = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText || "");
  };

  const finishEditingText = (id: string) => {
    if (editingText.trim()) {
      updateElement(id, { content: editingText });
    }
    setEditingId(null);
    setEditingText("");
  };

  const handleResizeMouseDown = (e: React.MouseEvent, elementId: string, handle: string) => {
    e.stopPropagation();
    setResizing({ id: elementId, handle });
    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!resizing || !canvasRef.current) return;

    const element = design.elements.find((el) => el.id === resizing.id);
    if (!element) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    const updates: any = {};

    // Handle resizing for groups by scaling children accordingly
    if (element.type === 'group') {
      const group = element;
      const originalWidth = group.width;
      const originalHeight = group.height;

      let newWidth = group.width;
      let newHeight = group.height;
      let newX = group.x;
      let newY = group.y;

      if (resizing.handle.includes("e")) {
        newWidth = Math.max(30, group.width + deltaX);
      }
      if (resizing.handle.includes("w")) {
        newX = group.x + deltaX;
        newWidth = Math.max(30, group.width - deltaX);
      }
      if (resizing.handle.includes("s")) {
        newHeight = Math.max(30, group.height + deltaY);
      }
      if (resizing.handle.includes("n")) {
        newY = group.y + deltaY;
        newHeight = Math.max(30, group.height - deltaY);
      }

      const scaleX = newWidth / Math.max(1, originalWidth);
      const scaleY = newHeight / Math.max(1, originalHeight);

      // Update children positions and sizes
      const updatedElements = design.elements.map((el) => {
        if (el.id === group.id) {
          return { ...el, x: newX, y: newY, width: newWidth, height: newHeight };
        }
        if (group.children && group.children.includes(el.id)) {
          // Position relative to group origin
          const relX = el.x - group.x;
          const relY = el.y - group.y;
          const newChildX = newX + relX * scaleX;
          const newChildY = newY + relY * scaleY;
          const newChildW = Math.max(10, Math.round(el.width * scaleX));
          const newChildH = Math.max(10, Math.round(el.height * scaleY));
          // Constrain within margins
          const constrained = constrainElementPosition(newChildX, newChildY, newChildW, newChildH, {
            left: leftMargin,
            right: rightMargin,
            top: topMargin,
            bottom: bottomMargin,
          });
          return { ...el, x: constrained.x, y: constrained.y, width: newChildW, height: newChildH };
        }
        return el;
      });

      // Clear redo stack for this user action
      redoStackRef.current = [];
      setDesign((prev) => ({ ...prev, elements: updatedElements, history: [...prev.history, updatedElements] }));
      setResizeStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (resizing.handle.includes("e")) {
      // Right edge
      updates.width = Math.max(30, element.width + deltaX);
    }
    if (resizing.handle.includes("w")) {
      // Left edge
      updates.x = element.x + deltaX;
      updates.width = Math.max(30, element.width - deltaX);
    }
    if (resizing.handle.includes("s")) {
      // Bottom edge
      updates.height = Math.max(30, element.height + deltaY);
    }
    if (resizing.handle.includes("n")) {
      // Top edge
      updates.y = element.y + deltaY;
      updates.height = Math.max(30, element.height - deltaY);
    }

    updateElement(element.id, updates);
    setResizeStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;

      // Create image element at center of canvas
      const newElement: ReportElement = {
        id: `elem-${Date.now()}`,
        type: "image",
        x: getPagePx(appliedPageSize, appliedOrientation).w / 2 - 75,
        y: getPagePx(appliedPageSize, appliedOrientation).h / 2 - 75,
        width: 150,
        height: 150,
        imageUrl,
      };

      addElement(newElement);
      setTool(null);
      toast({
        title: "Image Added",
        description: "Image placed on canvas. Resize and position as needed.",
      });
    };
    reader.readAsDataURL(file);
  };

  const getQueryParameters = (): string[] => {
    // Extract @ parameters from all section queries
    const parameters = new Set<string>();

    if (!sectionQueries || sectionQueries.length === 0) return [];

    sectionQueries.forEach((section) => {
      if (section.query) {
        // Find all @parameter patterns in the query
        const matches = section.query.match(/@\w+/g) || [];
        console.log("Query parameters found:", matches);
        matches.forEach((match: string) => {
          // Remove the @ symbol to get the parameter name
          parameters.add(match.substring(1));
        });
      }
    });

    const paramArray = Array.from(parameters).sort();
    console.log("Extracted parameters:", paramArray);
    return paramArray;
  };

  const fetchDataFromDatabase = async (parameters: { [key: string]: string }): Promise<{ [key: string]: string }> => {
    try {
      // Execute all queries with the provided parameters
      const results: { [key: string]: string } = {};

      for (const section of sectionQueries || []) {
        if (!section.isValid) continue;

        let query = section.query;
        console.log("Original query:", query);

        // Remove DECLARE statements and replace parameters with values
        // Remove lines starting with "Declare"
        query = query.split('\n').filter((line: string) => !line.trim().toLowerCase().startsWith('declare')).join('\n');

        // Replace parameters in query with quoted values
        Object.keys(parameters).forEach((param) => {
          query = query.replace(new RegExp(`@${param}`, "gi"), `'${parameters[param]}'`);
        });

        console.log("Query after parameter replacement:", query);

        const response = await fetch(
          `${getApiBaseUrl()}/api/reports/test-query`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ query, sectionName: section.sectionName }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`Data from section ${section.sectionName}:`, data);
          console.log(`Data from section ${section.sectionName} - results length:`, data && data.results ? data.results.length : 0);
          // Store full result array under the section name so tables can repeat rows (store empty array when none)
          (results as any)[section.sectionName] = (data && data.results) ? data.results : [];
          // Also merge first row into root results for single-field bindings if exists
          if (data && data.results && data.results.length > 0) {
            Object.assign(results, data.results[0]);
          }
        } else {
          console.error(`Query failed for section ${section.sectionName}:`, response.status);
        }
      }

      console.log("Final merged results:", results);
      return results;
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from database",
        variant: "destructive",
      });
      return {};
    }
  };

  const getCanvasWithData = (dataToUse?: { [key: string]: string }): HTMLDivElement => {
    const canvasClone = canvasRef.current!.cloneNode(true) as HTMLDivElement;
    const dataSource = dataToUse || sampleData;

    // Find all elements and replace field placeholders with actual data
    const allElements = canvasClone.querySelectorAll("[style]");
    allElements.forEach((el) => {
      const elem = el as HTMLElement;
      const fieldText = elem.textContent || "";

      // Match [fieldName] pattern
      const match = fieldText.match(/\[([^\]]+)\]/);
      if (match) {
        const fieldName = match[1];
        // Try exact match first, then case-insensitive match
        let value = dataSource[fieldName];
        if (!value && fieldName) {
          const matchKey = Object.keys(dataSource).find(
            key => key.toLowerCase() === fieldName.toLowerCase()
          );
          if (matchKey) {
            value = dataSource[matchKey];
          }
        }
        // Replace placeholder with actual data or blank if not found
        const displayValue = value && value.toString().trim() ? value : "";
        elem.textContent = displayValue;
      }
    });

    // Remove selection styling (blue background)
    const selectedElements = canvasClone.querySelectorAll('div');
    selectedElements.forEach((el) => {
      const elem = el as HTMLElement;
      if (elem.style.backgroundColor && elem.style.backgroundColor.includes('blue')) {
        elem.style.backgroundColor = "#ffffff";
      }
    });

    return canvasClone;
  };

  const showQueryParametersDialog = (action: "print" | "pdf") => {
    const params = getQueryParameters();
    if (params.length === 0) {
      // No parameters needed, proceed with action
      if (action === "print") {
        printDesign();
      } else {
        exportPDF();
      }
      return;
    }

    // Initialize parameters with empty strings
    const newParams = { ...sampleData };
    params.forEach((param) => {
      if (!newParams[param]) {
        newParams[param] = "";
      }
    });
    setSampleData(newParams);
    setPendingAction(action);
    setShowSampleDataDialog(true);
  };

  const handleQuerySubmit = async () => {
    setShowSampleDataDialog(false);

    // Fetch data from database
    const dbData = await fetchDataFromDatabase(sampleData);
    const mergedData = { ...sampleData, ...dbData };
    setSampleData(mergedData);

    // Proceed with action - pass merged data directly to avoid stale closure
    if (pendingAction === "print") {
      await printDesign(mergedData);
    } else if (pendingAction === "pdf") {
      await exportPDF(mergedData);
    }
  };

  const printDesign = async (dataToUse?: { [key: string]: string }) => {
    if (!canvasRef.current) return;

    try {
      toast({ title: "Printing...", description: "Preparing design for print" });

      // Get canvas with data populated
      const canvasClone = getCanvasWithData(dataToUse);

      // Clean up unsupported CSS colors and classes before rendering
      const allElements = canvasClone.querySelectorAll("*");
      allElements.forEach((el) => {
        const element = el as HTMLElement | SVGElement;

        // Remove all classes to avoid oklch colors from Tailwind
        // SVG elements need special handling since className is read-only
        if (element instanceof SVGElement) {
          element.setAttribute("class", "");
        } else {
          element.className = "";
        }

        // Force safe inline colors
        const currentColor = element.style.color;
        if (!currentColor || currentColor.includes("oklch")) {
          element.style.color = "#000000";
        }

        const currentBg = element.style.backgroundColor;
        if (!currentBg || currentBg.includes("oklch")) {
          element.style.backgroundColor = "transparent";
        }

        const currentBorder = element.style.borderColor;
        if (!currentBorder || currentBorder.includes("oklch")) {
          element.style.borderColor = "#000000";
        }
      });

      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Could not open print window. Check pop-up blockers.",
          variant: "destructive",
        });
        return;
      }

      // Build CSS for all elements - clean styling for print (no borders, no backgrounds)
      // Use export margins (persisted via Save) for printing
      const printLeftMargin = exportMargins?.left ?? 0;
      const printTopMargin = exportMargins?.top ?? 0;
      const printRightMargin = exportMargins?.right ?? 0;
      const printBottomMargin = exportMargins?.bottom ?? 0;
      // Detect whether margins are already applied to element coordinates (Apply & Save)
      const minX = Math.min(...(design.elements.map(e => e.x)));
      const minY = Math.min(...(design.elements.map(e => e.y)));
      const marginsAlreadyAppliedHoriz = minX >= printLeftMargin;
      const marginsAlreadyAppliedVert = minY >= printTopMargin;

      // When margins aren't applied to layout, apply them as padding on the container (to avoid double-offsetting)
      const containerPaddingLeft = marginsAlreadyAppliedHoriz ? 0 : printLeftMargin;
      const containerPaddingTop = marginsAlreadyAppliedVert ? 0 : printTopMargin;
      const containerPaddingRight = marginsAlreadyAppliedHoriz ? 0 : printRightMargin;
      const containerPaddingBottom = marginsAlreadyAppliedVert ? 0 : printBottomMargin;

      // Convert padding to inches for printing CSS
      const padLeftIn = (containerPaddingLeft / DPI).toFixed(3);
      const padRightIn = (containerPaddingRight / DPI).toFixed(3);
      const padTopIn = (containerPaddingTop / DPI).toFixed(3);
      const padBottomIn = (containerPaddingBottom / DPI).toFixed(3);

      let elementStyles = "";
      design.elements.forEach((el) => {
        const elemClass = `elem-${el.id}`;
        // Elements are positioned relative to the content area (do not add margin offsets here)
        const adjustedX = el.x;
        const adjustedY = el.y;
        let cssClass = `.${elemClass} { position: absolute; left: ${adjustedX}px; top: ${adjustedY}px; width: ${el.width}px; height: ${el.height}px; `;
        cssClass += `display: flex; align-items: center; justify-content: flex-start; `;
        cssClass += `border: none; background-color: transparent; transform: rotate(${el.rotation || 0}deg); transform-origin: center; `; // Remove all borders and backgrounds

        if (el.type === "text") {
          cssClass += `font-size: ${el.fontSize || 14}px; color: ${el.fontColor || "#000000"}; font-weight: ${el.fontWeight || "normal"}; font-style: ${el.fontStyle || "normal"}; text-decoration: ${el.textDecoration || "none"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; `;
        }
        if (el.type === "field") {
          cssClass += `font-size: ${el.fontSize || 14}px; color: ${el.fontColor || "#000000"}; font-weight: ${el.fontWeight || "normal"}; font-style: ${el.fontStyle || "normal"}; text-decoration: ${el.textDecoration || "none"}; `;
        }
        if (el.type === "line") {
          cssClass += `border: none; border-top: ${el.borderWidth || 2}px solid ${el.borderColor || "#000000"}; height: 0; `;
        }
        if (el.type === "vline") {
          cssClass += `border: none; border-left: ${el.borderWidth || 2}px solid ${el.borderColor || "#000000"}; width: 0; `;
        }
        if (el.type === "rectangle") {
          cssClass += `border: ${el.borderWidth || 2}px solid ${el.borderColor || "#000000"}; background-color: ${el.bgColor || "#ffffff"}; `;
        }
        if (el.type === "border") {
          cssClass += `border: ${el.borderWidth || 2}px solid ${el.borderColor || "#000000"}; background-color: transparent; `;
        }
        if (el.type === "table") {
          cssClass += `border-collapse: collapse; `;
          // For printing, allow tables to size dynamically and flow across pages
          cssClass += `display: block !important; height: auto !important; overflow: visible !important; `;
        }
        if (el.type === "image") {
          cssClass += `object-fit: cover; `;
        }

        cssClass += "} ";
        elementStyles += cssClass;
      });

      // Get the canvas HTML with proper classes
      const dataSource = dataToUse || sampleData;
      let canvasHTML = "";
      design.elements.forEach((el) => {
        const elemClass = `elem-${el.id}`;
        let content = "";

        if (el.type === "text") {
          content = el.content || "";
        } else if (el.type === "field") {
          // Show actual data value, blank if not found
          const fieldName = el.fieldName || "";
          // Try exact match first, then case-insensitive match
          let value = dataSource[fieldName];
          if (!value && fieldName) {
            // Case-insensitive search
            const matchKey = Object.keys(dataSource).find(
              key => key.toLowerCase() === fieldName.toLowerCase()
            );
            if (matchKey) {
              value = dataSource[matchKey];
            }
          }
          // Show blank if value is null, undefined, or empty string
          content = value && value.toString().trim() ? value : "";
        } else if (el.type === "line" || el.type === "vline") {
          content = "";
        } else if (el.type === "rectangle") {
          content = "";
        } else if (el.type === "border") {
          content = "";
        } else if (el.type === "table") {
          // Render table
          const rows = el.rows || 2;
          const cols = el.cols || 2;
          const cellPadding = el.cellPadding ?? 4;
          // If explicit rowHeight is set, use it; otherwise distribute element height across rows
          const rowHeight = el.rowHeight ?? Math.max(20, Math.floor((el.height || 30) / Math.max(1, rows)));
          // Do not constrain table height to parent wrapper on print — let it grow and break across pages where needed
          let tableHTML = `<table style="width: 100%; border-collapse: collapse;">`;
          if ((el as any).repeat && Array.isArray((dataSource as any)[(el as any).repeat])) {
            const dataRows = (dataSource as any)[(el as any).repeat] as Array<Record<string, any>>;
            // Diagnostic: log repeat data size and pagination info for print
            try {
              console.log('[printDesign][table] id=', el.id, 'repeat=', (el as any).repeat, 'rows=', dataRows.length);
              const pagePx = getPagePx(exportPageSize, exportOrientation);
              const pageHeightPx = pagePx.h - ((exportMargins?.top ?? 0) + (exportMargins?.bottom ?? 0));
              const relativeStart = Math.max(el.y, exportMargins?.top ?? 0) - (exportMargins?.top ?? 0);
              const offsetInPage = relativeStart - Math.floor(relativeStart / pageHeightPx) * pageHeightPx;
              const headerHeightCalc = (el as any).showHeader ? ((el as any).headerHeight ?? ((el as any).headerFontSize ?? 12) + (cellPadding * 2)) : 0;
              const rowHeightCalc = (el as any).rowHeight ?? Math.max(20, Math.floor((el.height || 30) / Math.max(1, el.rows || 2)));
              const remainingOnFirst = pageHeightPx - offsetInPage;
              let firstPageRows = 0;
              if (remainingOnFirst > headerHeightCalc) firstPageRows = Math.floor((remainingOnFirst - headerHeightCalc) / rowHeightCalc);
              const rowsPerFullPage = Math.max(1, Math.floor((pageHeightPx - headerHeightCalc) / rowHeightCalc));
              console.log('[printDesign][table] pagination', { headerHeightCalc, rowHeightCalc, pageHeightPx, offsetInPage, firstPageRows, rowsPerFullPage });

              // Show a toast notification with counts so users immediately see table pagination behavior
              try {
                const name = (el as any).repeat || el.id || 'table';
                if (dataRows.length > 0) {
                  if (firstPageRows < dataRows.length) {
                    toast({ title: `Table '${name}' will span pages`, description: `${dataRows.length} rows; first page shows ${firstPageRows} rows; ${rowsPerFullPage} rows per full page` });
                  } else {
                    toast({ title: `Table '${name}' fits on page`, description: `${dataRows.length} rows fit on current page` });
                  }
                }
              } catch (t) {
                console.warn('printDesign toast failed', t);
              }

            } catch (e) {
              console.warn('printDesign table diagnostics failed', e);
            }

            const columns = (el as any).columns && (el as any).columns.length > 0 ? (el as any).columns : (dataRows.length ? Object.keys(dataRows[0]) : Array.from({ length: cols }).map((_, i) => `col${i}`));
            // Emit <colgroup> when explicit columnWidths present
            const colWidths = (el as any).columnWidths && (el as any).columnWidths.length ? (el as any).columnWidths : [];
            if (colWidths.length > 0) {
              tableHTML += '<colgroup>';
              for (let ci = 0; ci < colWidths.length; ci++) {
                const w = Math.max(0, parseInt(colWidths[ci], 10) || 0);
                if (w > 0) tableHTML += `<col style="width:${w}px" />`;
                else tableHTML += '<col />';
              }
              tableHTML += '</colgroup>';
            }

            // Prepare column alignments
            const colAligns = (el as any).columnAlignments && (el as any).columnAlignments.length ? (el as any).columnAlignments : Array.from({ length: columns.length }).map(() => 'left');

            // optional header (render inside <thead> so browsers can repeat on printed pages)
            if ((el as any).showHeader) {
              const headerStyle = `background:${escapeHtml((el as any).headerBgColor || '#f3f4f6')}; color:${escapeHtml((el as any).headerFontColor || '#111827')}; font-size:${(el as any).headerFontSize || 12}px; font-weight:${escapeHtml((el as any).headerFontWeight || 'bold')};`;
              const headerHeight = (el as any).headerHeight ?? ((el as any).headerFontSize || 12) + (cellPadding * 2);
              const theadDisplay = (el as any).repeatHeaderOnEveryPage ? 'display: table-header-group;' : '';
              tableHTML += `<thead style="${theadDisplay}"><tr style="height: ${headerHeight}px; ${headerStyle}">`;
              for (let c = 0; c < columns.length; c++) {
                const align = colAligns[c] || 'left';
                tableHTML += `<th style="border: 1px solid #ddd; padding: ${cellPadding}px; text-align: ${align};">${escapeHtml(columns[c])}</th>`;
              }
              tableHTML += `</tr></thead>`;
            }
            // data rows (apply alternate row styling if provided)
            dataRows.forEach((dr, ridx) => {
              const isAlt = ridx % 2 === 1;
              const altBg = isAlt ? (el as any).altRowBgColor || '' : '';
              const altColor = isAlt ? (el as any).altRowFontColor || '' : '';
              const rowStyle = `height: ${rowHeight}px; ${altBg ? `background:${escapeHtml(altBg)};` : ''} ${altColor ? `color:${escapeHtml(altColor)};` : ''}`;
              tableHTML += `<tr style="${rowStyle}">`;
              for (let c = 0; c < columns.length; c++) {
                const key = columns[c];
                const val = dr[key] !== undefined && dr[key] !== null ? String(dr[key]) : '';
                const align = colAligns[c] || 'left';
                tableHTML += `<td style="border: 1px solid #ddd; padding: ${cellPadding}px; height: ${rowHeight}px; vertical-align: top; text-align: ${align};">${escapeHtml(val)}</td>`;
              }
              tableHTML += `</tr>`;
            });
          } else {
            // Non-repeat table: use explicit column widths/alignments if provided
            const nonRepeatColWidths = (el as any).columnWidths && (el as any).columnWidths.length ? (el as any).columnWidths : [];
            const nonRepeatColAligns = (el as any).columnAlignments && (el as any).columnAlignments.length ? (el as any).columnAlignments : Array.from({ length: cols }).map(() => 'left');

            if (nonRepeatColWidths.length > 0) {
              tableHTML += '<colgroup>';
              for (let ci = 0; ci < nonRepeatColWidths.length; ci++) {
                const w = Math.max(0, parseInt(nonRepeatColWidths[ci], 10) || 0);
                if (w > 0) tableHTML += `<col style="width:${w}px" />`;
                else tableHTML += '<col />';
              }
              tableHTML += '</colgroup>';
            }

            if ((el as any).showHeader) {
              const headerHeight = (el as any).headerHeight ?? ((el as any).headerFontSize || 12) + (cellPadding * 2);
              const headerStyle = `background:${escapeHtml((el as any).headerBgColor || '#f3f4f6')}; color:${escapeHtml((el as any).headerFontColor || '#111827')}; font-size:${(el as any).headerFontSize || 12}px; font-weight:${escapeHtml((el as any).headerFontWeight || 'bold')};`;
              tableHTML += `<thead><tr style="height: ${headerHeight}px; ${headerStyle}">`;
              for (let c = 0; c < cols; c++) {
                const align = nonRepeatColAligns[c] || 'left';
                tableHTML += `<th style="border: 1px solid #ddd; padding: ${cellPadding}px; text-align: ${align};"></th>`;
              }
              tableHTML += `</tr></thead>`;
            }

            for (let r = 0; r < rows; r++) {
              tableHTML += `<tr style="height: ${rowHeight}px;">`;
              for (let c = 0; c < cols; c++) {
                const align = nonRepeatColAligns[c] || 'left';
                tableHTML += `<td style="border: 1px solid #ddd; padding: ${cellPadding}px; height: ${rowHeight}px; vertical-align: top; text-align: ${align};"></td>`;
              }
              tableHTML += `</tr>`;
            }
          }
          tableHTML += `</table>`;
          content = tableHTML;
        } else if (el.type === "image") {
          content = `<img src="${el.imageUrl || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`;
        }

        canvasHTML += `<div class="${elemClass}">${content}</div>\n`;
      });

      // Helper to escape HTML inside table cells
      function escapeHtml(str: string) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // Write HTML to print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${templateName}</title>
          <style>
            * { box-sizing: border-box; }
            /* Printing helpers: allow table headers to repeat on new pages and avoid breaking rows */
            table { page-break-inside: auto; border-collapse: collapse; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
            }
            @page {
              margin: 0; /* use explicit padding on container instead of page margin to avoid double-offset */
              size: ${getPagePx(exportPageSize, exportOrientation).w / DPI * 25.4}mm ${getPagePx(exportPageSize, exportOrientation).h / DPI * 25.4}mm;
            }
            .canvas-container {
              width: ${getPagePx(exportPageSize, exportOrientation).w / DPI * 25.4}mm;
              height: ${getPagePx(exportPageSize, exportOrientation).h / DPI * 25.4}mm;
              background: white;
              position: relative;
              margin: 0;
              padding: ${padTopIn}in ${padRightIn}in ${padBottomIn}in ${padLeftIn}in;
              page-break-after: always;
              overflow: hidden;
              box-sizing: border-box;
            }
            ${elementStyles}
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .canvas-container {
                page-break-after: always;
                box-shadow: none;
                margin: 0;
                /* Keep container padding during print so element positions remain correct */
                overflow: visible; /* Allow tables to flow across pages instead of being clipped */
              }
            }
          </style>
        </head>
        <body>
          <div class="canvas-container">
            ${canvasHTML}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();

      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        toast({
          title: "Success",
          description: "Print dialog opened",
        });
      }, 500);
    } catch (error) {
      console.error("Error printing:", error);
      toast({
        title: "Error",
        description: "Failed to print design",
        variant: "destructive",
      });
    }
  };

  const exportPDF = async (dataToUse?: { [key: string]: string }) => {
    try {
      toast({ title: "Exporting...", description: "Generating PDF from backend" });

      const baseUrl = getApiBaseUrl();
      // Try to get templateId from props first, then from URL
      const resolvedTemplateId = templateId || new URLSearchParams(window.location.search).get("id");

      if (!resolvedTemplateId) {
        throw new Error("Template ID not found");
      }

      // Call backend API to generate HTML from template
      // Get margins from template (database) instead of component state
      // The backend will use the template's margin values if request margins are 0
      const requestBody = {
        parameters: dataToUse || sampleData,
        designJson: JSON.stringify(design.elements),
        queriesJson: sectionQueries ? JSON.stringify(sectionQueries) : undefined,
        leftMargin: exportMargins?.left ?? 0,
        rightMargin: exportMargins?.right ?? 0,
        topMargin: exportMargins?.top ?? 0,
        bottomMargin: exportMargins?.bottom ?? 0,
        pageSize: exportPageSize,
        orientation: exportOrientation,
        autoFixOverlaps: exportAutoFixOverlaps,
      };

      console.log("Frontend request body:", requestBody);
      console.log("Design elements being sent:", design.elements);
      // Detailed element positions for debug
      design.elements.forEach((e) => console.log(`Element ${e.id}: type=${e.type} x=${e.x} y=${e.y} w=${e.width} h=${e.height} headerHeight=${(e as any).headerHeight} showHeader=${(e as any).showHeader} repeat=${(e as any).repeat}`));
      if (design.elements.length > 0) {
        console.log("First element:", design.elements[0]);
      }

      const response = await fetch(`${baseUrl}/api/reports/templates/export-pdf/${resolvedTemplateId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF from backend");
      }

      const { html, fileName } = await response.json();

      console.log("Backend returned HTML:", html);
      console.log("HTML length:", html?.length);

      // Create temporary element with the backend-generated HTML
      const element = document.createElement("div");
      element.innerHTML = html;
      element.style.position = "absolute";
      element.style.left = "-9999px";
      const pagePx = getPagePx(exportPageSize, exportOrientation);
      element.style.width = `${pagePx.w}px`;
      element.style.background = "white";
      element.style.visibility = "visible";
      document.body.appendChild(element);

      console.log("Element created, innerHTML length:", element.innerHTML.length);
      console.log("Element children count:", element.children.length);

      try {
        // Convert HTML to canvas using html2canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });

        console.log("Canvas created, dimensions:", canvas.width, "x", canvas.height);

        // Create PDF from canvas using jsPDF
        const jsPdfFormat = exportPageSize.toLowerCase();
        const pdf = new jsPDF({
          orientation: exportOrientation,
          unit: "mm",
          format: jsPdfFormat as any,
        });

        const pagePx = getPagePx(exportPageSize, exportOrientation);
        const imgWidth = (pagePx.w / DPI) * 25.4; // width in mm based on selected page
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        pdf.save(fileName || `report_${new Date().toISOString().split("T")[0]}.pdf`);

        toast({
          title: "Success",
          description: "PDF exported successfully",
        });
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
        console.error("Error stack:", pdfError instanceof Error ? pdfError.stack : "");
        toast({
          title: "Error",
          description: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}`,
          variant: "destructive",
        });
      } finally {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      console.error("Error details:", error instanceof Error ? error.message : JSON.stringify(error));
      toast({
        title: "Error",
        description: `Failed to export PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const selected = design.elements.find((el) => el.id === design.selectedId);
  
    try {
    console.log('ReportDesigner render start', { templateName, templateId, sectionQueries: (sectionQueries || []).map(s => s.sectionName), initialDesignLength: initialDesign ? initialDesign.length : 0, elementsCount: design.elements.length });
    return (
      <>
      <div className="flex flex-col h-screen bg-gray-50">
      {/* ============= HEADER SECTION ============= */}
      <div className="flex items-center justify-between px-3 py-1 bg-white border-b gap-2 text-xs">
        <span className="text-gray-500">{templateName} • A4 Size</span>
        <div className="flex gap-1">
          <Button
            onClick={undo}
            variant="ghost"
            size="sm"
            className="h-6 px-1"
            title="Undo"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-gray-300"></div>
          <Button
            onClick={() => {
              console.log("Save button clicked");
              console.log("ALL design.elements:", design.elements);
              console.log("Element types:", design.elements.map((el) => ({ type: el.type, id: el.id })));
              const rectangles = design.elements.filter((el) => el.type === "rectangle");
              const lines = design.elements.filter((el) => el.type === "line" || el.type === "vline");
              const borders = design.elements.filter((el) => el.type === "border");
              console.log("Rectangles:", rectangles.length);
              console.log("Lines/VLines:", lines.length);
              console.log("Borders:", borders.length);
              onSave(design.elements, {
                left: leftMargin,
                right: rightMargin,
                top: topMargin,
                bottom: bottomMargin,
              });
            }}
            variant="ghost"
            size="sm"
            className="h-6 px-2 gap-1"
            title="Save Design"
          >
            <Save className="h-3 w-3" />
            Save
          </Button>

          {/* Group / Ungroup controls */}
          <Button
            onClick={() => {
              // Group selected elements
              if (design.selectedIds.length > 1) {
                const ids = [...design.selectedIds];
                const children = design.elements.filter((el) => ids.includes(el.id));
                if (children.length < 2) return;
                const minX = Math.min(...children.map((c) => c.x));
                const minY = Math.min(...children.map((c) => c.y));
                const maxX = Math.max(...children.map((c) => c.x + c.width));
                const maxY = Math.max(...children.map((c) => c.y + c.height));
                const groupId = `group-${Date.now()}`;
                const groupElement: ReportElement = {
                  id: groupId,
                  type: 'group',
                  x: minX,
                  y: minY,
                  width: Math.max(30, maxX - minX),
                  height: Math.max(30, maxY - minY),
                  children: ids,
                };

                // Clear redo stack as this is a new action
                redoStackRef.current = [];

                // Mark children with parentId
                const updated = design.elements.map((el) =>
                  ids.includes(el.id) ? { ...el, parentId: groupId } : el
                );

                setDesign((prev) => ({
                  ...prev,
                  elements: [...updated, groupElement],
                  selectedId: groupId,
                  selectedIds: [groupId], // select the newly created group so dragging it moves children
                  history: [...prev.history, [...updated, groupElement]],
                }));
              }
            }}
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            title="Group selected elements"
            disabled={design.selectedIds.length <= 1}
          >
            <Copy className="h-3 w-3" />
            Group
          </Button>

          {/* Print settings button opens modal where margins are set and saved */}
          <Button
            onClick={() => setShowPrintSettings(true)}
            variant="outline"
            size="sm"
            className="h-6 px-2"
            title="Print Settings"
          >
            <Printer className="h-3 w-3 mr-1" />
            Print Settings
          </Button>

          {/* Badge showing current export margins */}
          <div
            title={`Export: ${exportPageSize} ${exportOrientation} — Margins L${exportMargins.left}px (${pxToIn(exportMargins.left)}in) R${exportMargins.right}px (${pxToIn(exportMargins.right)}in) T${exportMargins.top}px (${pxToIn(exportMargins.top)}in) B${exportMargins.bottom}px (${pxToIn(exportMargins.bottom)}in)`}
            className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
          >
            M: L{pxToIn(exportMargins.left)}in R{pxToIn(exportMargins.right)}in T{pxToIn(exportMargins.top)}in B{pxToIn(exportMargins.bottom)}in
          </div>

          <Button
            onClick={() => {
              // Ungroup if a group is selected
              if (design.selectedId) {
                const el = design.elements.find((d) => d.id === design.selectedId);
                if (el && el.type === 'group') {
                  const children = el.children || [];
                  // Clear redo stack as this is a new action
                  redoStackRef.current = [];
                  // Remove group element and clear parentId on children
                  const withoutGroup = design.elements.filter((e) => e.id !== el.id).map((e) => {
                    if (children.includes(e.id)) {
                      const { parentId, ...rest } = e as any;
                      return { ...rest } as ReportElement;
                    }
                    return e;
                  });

                  setDesign((prev) => ({
                    ...prev,
                    elements: withoutGroup,
                    selectedId: undefined,
                    selectedIds: children,
                    history: [...prev.history, withoutGroup],
                  }));
                }
              }
            }}
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            title="Ungroup selected group"
            disabled={!design.selectedId || design.elements.find((e) => e.id === design.selectedId)?.type !== 'group'}
          >
            <Trash2 className="h-3 w-3" />
            Ungroup
          </Button> 

          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            title="Close Designer"
          >
            Close
          </Button>

          {/* Print Settings Modal */}
          {showPrintSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white p-4 rounded shadow-lg w-[440px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Print Settings</h3>
                  <div className="text-sm text-gray-500">{tempPageSize} {tempOrientation === 'portrait' ? 'preview' : 'preview (landscape)'}</div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <Label>Page Size</Label>
                    <div>
                      <select className="form-select" value={tempPageSize} onChange={(e) => setTempPageSize(e.target.value)}>
                        {Object.keys(PAGE_DEFINITIONS).map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                    <Label>Orientation</Label>
                    <div>
                      <select className="form-select" value={tempOrientation} onChange={(e) => setTempOrientation(e.target.value as 'portrait'|'landscape')}>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>

                    <Label>Left margin (in)</Label>
                    <div>
                      <input
                        type="range"
                        min={0}
                        step={0.01}
                        max={Math.max(1, getPagePx(tempPageSize, tempOrientation).w) / DPI / 2}
                        value={pxToIn(tempMargins.left)}
                        onChange={(e) => setTempMargins((prev) => ({ ...prev, left: inToPx(parseFloat(e.target.value || '0')) }))}
                      />
                      <Input
                        value={pxToIn(tempMargins.left)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value || '0');
                          setTempMargins((prev) => ({ ...prev, left: inToPx(isNaN(v) ? 0 : v) }));
                        }}
                        type="number"
                        step="0.01"
                        className="mt-1"
                      />
                    </div>
                    <Label>Right margin (in)</Label>
                    <div>
                      <input
                        type="range"
                        min={0}
                        step={0.01}
                        max={Math.max(1, getPagePx(tempPageSize, tempOrientation).w) / DPI / 2}
                        value={pxToIn(tempMargins.right)}
                        onChange={(e) => setTempMargins((prev) => ({ ...prev, right: inToPx(parseFloat(e.target.value || '0')) }))}
                      />
                      <Input
                        value={pxToIn(tempMargins.right)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value || '0');
                          setTempMargins((prev) => ({ ...prev, right: inToPx(isNaN(v) ? 0 : v) }));
                        }}
                        type="number"
                        step="0.01"
                        className="mt-1"
                      />
                    </div>
                    <Label>Top margin (in)</Label>
                    <div>
                      <input
                        type="range"
                        min={0}
                        step={0.01}
                        max={Math.max(1, getPagePx(tempPageSize, tempOrientation).h) / DPI / 2}
                        value={pxToIn(tempMargins.top)}
                        onChange={(e) => setTempMargins((prev) => ({ ...prev, top: inToPx(parseFloat(e.target.value || '0')) }))}
                      />
                      <Input
                        value={pxToIn(tempMargins.top)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value || '0');
                          setTempMargins((prev) => ({ ...prev, top: inToPx(isNaN(v) ? 0 : v) }));
                        }}
                        type="number"
                        step="0.01"
                        className="mt-1"
                      />
                    </div>
                    <Label>Bottom margin (in)</Label>
                    <div>
                      <input
                        type="range"
                        min={0}
                        step={0.01}
                        max={Math.max(1, getPagePx(tempPageSize, tempOrientation).h) / DPI / 2}
                        value={pxToIn(tempMargins.bottom)}
                        onChange={(e) => setTempMargins((prev) => ({ ...prev, bottom: inToPx(parseFloat(e.target.value || '0')) }))}
                      />
                      <Input
                        value={pxToIn(tempMargins.bottom)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value || '0');
                          setTempMargins((prev) => ({ ...prev, bottom: inToPx(isNaN(v) ? 0 : v) }));
                        }}
                        type="number"
                        step="0.01"
                        className="mt-1"
                      />
                    </div>

                    <Label>Auto-fix overlaps on export</Label>
                    <div>
                      <input type="checkbox" checked={tempAutoFixOverlaps} onChange={(e) => setTempAutoFixOverlaps(e.target.checked)} /> <span className="text-xs text-gray-500">(Off by default — enable to let exporter resolve overlapping elements)</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="ghost" onClick={()=>setShowPrintSettings(false)}>Cancel</Button>

                  {/* Save for export/printing only — does NOT reflow elements on canvas */}
                  <Button onClick={() => {
                    setExportMargins(tempMargins);
                    setExportPageSize(tempPageSize);
                    setExportOrientation(tempOrientation);
                    setExportAutoFixOverlaps(tempAutoFixOverlaps);
                    // Persist the export margins to backend (parent expects onSave)
                    onSave(design.elements, { left: tempMargins.left, right: tempMargins.right, top: tempMargins.top, bottom: tempMargins.bottom });
                    toast({ title: 'Saved', description: `Export settings saved (${tempPageSize} ${tempOrientation})` });
                    setShowPrintSettings(false);
                  }}>Save</Button>

                  {/* Apply & Save: apply margins to layout (triggers reposition/reflow) and persist */}
                  <Button onClick={() => {
                    // Apply margins to designer layout (this triggers the reflow useEffect)
                    setLeftMargin(tempMargins.left); setRightMargin(tempMargins.right); setTopMargin(tempMargins.top); setBottomMargin(tempMargins.bottom);
                    setExportMargins(tempMargins);
                    setExportPageSize(tempPageSize);
                    setExportOrientation(tempOrientation);
                    setExportAutoFixOverlaps(tempAutoFixOverlaps);

                    // Apply to on-screen viewer immediately
                    setAppliedPageSize(tempPageSize);
                    setAppliedOrientation(tempOrientation);

                    // Treat as user action and clear redo stack
                    redoStackRef.current = [];
                    // Persist margins (parent persists to backend)
                    onSave(design.elements, { left: tempMargins.left, right: tempMargins.right, top: tempMargins.top, bottom: tempMargins.bottom });
                    toast({ title: 'Saved', description: `Print settings applied and saved (${tempPageSize} ${tempOrientation})` });
                    setShowPrintSettings(false);
                  }}>
                    Apply & Save
                  </Button>
                </div>
              </div>
            </div>
          )} 
        </div>
      </div>

      {/* ============= TOOLBAR SECTION ============= */}
      <div
        className={`fixed flex gap-1 bg-white p-2 rounded-lg border shadow-lg items-center z-50 cursor-grab active:cursor-grabbing ${toolbarOrientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}`}
        style={{
          left: `${toolbarPos.x}px`,
          top: `${toolbarPos.y}px`,
          width: 'fit-content'
        }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setIsDraggingToolbar(true);
          setToolbarDragStart({ x: e.clientX - toolbarPos.x, y: e.clientY - toolbarPos.y });
        }}
      >
          {/* Toggle Orientation Button */}
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={() => setToolbarOrientation(toolbarOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
            title={toolbarOrientation === 'horizontal' ? 'Switch to Vertical' : 'Switch to Horizontal'}
          >
            {toolbarOrientation === 'horizontal' ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
          <div className={toolbarOrientation === 'horizontal' ? 'w-px h-4 bg-gray-300' : 'h-px w-4 bg-gray-300'}></div>
          <Button
            variant={tool === "text" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rectangle" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "line" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "vline" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("vline")}
            title="Vertical Line"
          >
            <Minus className="h-4 w-4 rotate-90" />
          </Button>
          <Button
            variant={tool === "table" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("table")}
            title="Table"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "border" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("border")}
            title="Border"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "field" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => setTool("field")}
            title="Field"
          >
            📌
          </Button>
          <Button
            variant={tool === "image" ? "default" : "outline"}
            size="sm"
            className="p-1 h-auto"
            onClick={() => {
              setTool("image");
              const fileInput = document.getElementById("imageInput") as HTMLInputElement;
              if (fileInput) fileInput.click();
            }}
            title="Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            id="imageInput"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

          {/* Divider */}
          <div className="h-6 border-l border-gray-300" />

          {/* Font Color */}
          {selected?.type === "text" || selected?.type === "field" ? (
            <>
              <input
                type="color"
                value={selected.fontColor || "#000000"}
                onChange={(e) =>
                  updateElement(selected.id, {
                    fontColor: e.target.value,
                  })
                }
                className="w-8 h-8 cursor-pointer border rounded"
                title="Font Color"
              />

              {/* Font Weight */}
              <select
                value={selected.fontWeight || "normal"}
                onChange={(e) =>
                  updateElement(selected.id, {
                    fontWeight: e.target.value,
                  })
                }
                className="text-xs px-2 py-1 border rounded w-16 h-8"
                title="Font Weight"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="800">800</option>
              </select>

              {/* Underline Toggle */}
              <Button
                variant={selected.textDecoration === "underline" ? "default" : "outline"}
                size="sm"
                className="p-1 h-auto"
                onClick={() =>
                  updateElement(selected.id, {
                    textDecoration: selected.textDecoration === "underline" ? "none" : "underline",
                  })
                }
                title="Underline"
              >
                <u className="text-sm font-semibold">U</u>
              </Button>

              {/* Italic Toggle */}
              <Button
                variant={selected.fontStyle === "italic" ? "default" : "outline"}
                size="sm"
                className="p-1 h-auto"
                onClick={() =>
                  updateElement(selected.id, {
                    fontStyle: selected.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                title="Italic"
              >
                <i className="text-sm font-semibold">I</i>
              </Button>
            </>
          ) : null}

          {/* Divider for Orientation */}
          {selected && (
            <>
              <div className="h-6 border-l border-gray-300" />

              {/* Rotate Left Button */}
              <Button
                variant="outline"
                size="sm"
                className="p-1 h-auto"
                onClick={() =>
                  updateElement(selected.id, {
                    rotation: ((selected.rotation || 0) - 90 + 360) % 360,
                  })
                }
                title="Rotate Left (90°)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              {/* Rotation Input */}
              <Input
                type="number"
                min="0"
                max="360"
                step="1"
                value={selected.rotation || 0}
                onChange={(e) =>
                  updateElement(selected.id, {
                    rotation: parseInt(e.target.value) % 360,
                  })
                }
                className="w-16 h-8 text-xs px-2"
                title="Rotation (degrees)"
              />

              {/* Rotate Right Button */}
              <Button
                variant="outline"
                size="sm"
                className="p-1 h-auto"
                onClick={() =>
                  updateElement(selected.id, {
                    rotation: ((selected.rotation || 0) + 90) % 360,
                  })
                }
                title="Rotate Right (90°)"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Alignment Tools - Show when multiple elements selected */}
          {selected && design.selectedIds.length > 1 && (
            <>
              <div className="h-6 border-l border-gray-300" />

              {/* Horizontal Alignment */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => alignElements("left")}
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => alignElements("center")}
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => alignElements("right")}
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Vertical Alignment */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => alignElements("top")}
                  title="Align Top"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => alignElements("middle")}
                  title="Align Middle"
                >
                  <span className="text-sm font-bold">=</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => alignElements("bottom")}
                  title="Align Bottom"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
      </div>

      {/* ============= BODY SECTION ============= */}
      <div className="flex flex-col flex-1 overflow-hidden p-2">
        {/* Left Panel and Canvas */}
        <div className="flex gap-2 flex-1 overflow-hidden">
          {/* ===== SIDEBAR SECTION ===== */}
          <div className="w-72 space-y-2 overflow-y-auto border-r bg-white p-2">
            {/* Available Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {queryFields.map((field) => (
                  <Button
                    key={field}
                    variant="outline"
                    className="w-full justify-start text-xs cursor-move"
                    onClick={() => {
                      setTool("field");
                      toast({
                        title: "Field Mode",
                        description: "Draw a box to place the field or drag field directly",
                      });
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "copy";
                      e.dataTransfer.setData("fieldName", field);
                    }}
                  >
                    📌 {field}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Element Properties */}
            {selected && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Properties</CardTitle>
                    <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                      Press Delete to remove
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Position X</Label>
                    <Input
                      type="number"
                      value={selected.x}
                      onChange={(e) =>
                        updateElement(selected.id, { x: parseInt(e.target.value) })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Position Y</Label>
                    <Input
                      type="number"
                      value={selected.y}
                      onChange={(e) =>
                        updateElement(selected.id, { y: parseInt(e.target.value) })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={selected.width}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          width: parseInt(e.target.value),
                        })
                      }
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={selected.height}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          height: parseInt(e.target.value),
                        })
                      }
                      className="text-xs"
                    />
                  </div>

                  {selected.type === "text" && (
                    <>
                      <div>
                        <Label className="text-xs">Content</Label>
                        <Input
                          value={selected.content || ""}
                          onChange={(e) =>
                            updateElement(selected.id, { content: e.target.value })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          min="8"
                          max="72"
                          value={selected.fontSize || 12}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              fontSize: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Font Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.fontColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                fontColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.fontColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                fontColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Font Weight</Label>
                        <select
                          value={selected.fontWeight || "normal"}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              fontWeight: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extra Bold (800)</option>
                          <option value="900">Black (900)</option>
                          <option value="lighter">Lighter</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Text Decoration</Label>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.textDecoration === "underline"}
                              onChange={(e) =>
                                updateElement(selected.id, {
                                  textDecoration: e.target.checked ? "underline" : "none",
                                })
                              }
                              className="text-xs"
                            />
                            <span className="text-xs">Underline</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {selected.type === "field" && (
                    <>
                      <div>
                        <Label className="text-xs">Field Name</Label>
                        <select
                          value={selected.fieldName || ""}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              fieldName: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                        >
                          <option>Select field</option>
                          {queryFields.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Font Size (px)</Label>
                        <Input
                          type="number"
                          min="8"
                          max="72"
                          value={selected.fontSize || 12}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              fontSize: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Font Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.fontColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                fontColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.fontColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                fontColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Font Weight</Label>
                        <select
                          value={selected.fontWeight || "normal"}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              fontWeight: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extra Bold (800)</option>
                          <option value="900">Black (900)</option>
                          <option value="lighter">Lighter</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.bgColor || "#dcfce7"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                bgColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.bgColor || "#dcfce7"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                bgColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(selected.type === "line" || selected.type === "vline") && (
                    <>
                      <div>
                        <Label className="text-xs">Line Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.borderColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.borderColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Line Width (px)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={selected.borderWidth || 2}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              borderWidth: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    </>
                  )}

                  {selected.type === "table" && (
                    <>
                      <div>
                        <Label className="text-xs">Rows</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={selected.rows || 2}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              rows: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Columns</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={selected.cols || 2}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              cols: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cell Padding (px)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={selected.cellPadding ?? 4}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              cellPadding: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Row Height (px) — optional</Label>
                        <Input
                          type="number"
                          min={0}
                          max={2000}
                          value={selected.rowHeight ?? Math.floor((selected.height || 30) / (selected.rows || 1))}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              rowHeight: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">You can also resize the table box to change overall cell width/height.</p>
                      </div>

                      <div>
                        <Label className="text-xs">Repeat Over (section)</Label>
                        <select
                          value={(selected as any).repeat || ''}
                          onChange={(e) => updateElement(selected.id, { repeat: e.target.value || undefined })}
                          className="w-full px-2 py-1 text-xs border rounded"
                        >
                          <option value="">(none)</option>
                          {(sectionQueries || []).map((sq) => (
                            <option key={sq.sectionName} value={sq.sectionName}>{sq.sectionName}</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Choose a section whose query returns rows to repeat table rows for each result.</p>
                      </div>

                      <div>
                        <Label className="text-xs">Columns (comma-separated) — optional</Label>
                        <Input
                          type="text"
                          value={(selected as any).columns ? (selected as any).columns.join(',') : ''}
                          onChange={(e) => updateElement(selected.id, { columns: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Optional list of column keys to show (in order). If empty, keys from the first row are used.</p>
                      </div>

                      <div>
                        <Label className="text-xs">Show Header</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(selected as any).showHeader === true}
                            onChange={(e) => updateElement(selected.id, { showHeader: e.target.checked ? true : undefined })}
                          />
                          <span className="text-xs">Render a header row with column names</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Repeat Header on Every Page</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(selected as any).repeatHeaderOnEveryPage === true}
                            onChange={(e) => updateElement(selected.id, { repeatHeaderOnEveryPage: e.target.checked ? true : undefined })}
                          />
                          <span className="text-xs">When printing, repeat header on each printed page (HTML print)</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Header Height (px)</Label>
                        <Input type="number" value={(selected as any).headerHeight || 28} onChange={(e) => updateElement(selected.id, { headerHeight: parseInt(e.target.value) })} className="text-xs" />
                        <p className="text-xs text-muted-foreground mt-1">Set header row height in pixels for design & export.</p>
                      </div>

                      <div>
                        <Label className="text-xs">Header Design</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="color" value={(selected as any).headerBgColor || '#f3f4f6'} onChange={(e) => updateElement(selected.id, { headerBgColor: e.target.value })} className="w-12 h-8 text-xs" />
                          <Input type="color" value={(selected as any).headerFontColor || '#111827'} onChange={(e) => updateElement(selected.id, { headerFontColor: e.target.value })} className="w-12 h-8 text-xs" />
                          <Input type="number" value={(selected as any).headerFontSize || 12} onChange={(e) => updateElement(selected.id, { headerFontSize: parseInt(e.target.value) })} className="text-xs" />
                          <select value={(selected as any).headerFontWeight || 'bold'} onChange={(e) => updateElement(selected.id, { headerFontWeight: e.target.value })} className="text-xs">
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="600">600</option>
                            <option value="700">700</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Alternate Row Design</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="color" value={(selected as any).altRowBgColor || '#ffffff'} onChange={(e) => updateElement(selected.id, { altRowBgColor: e.target.value })} className="w-12 h-8 text-xs" />
                          <Input type="color" value={(selected as any).altRowFontColor || '#000000'} onChange={(e) => updateElement(selected.id, { altRowFontColor: e.target.value })} className="w-12 h-8 text-xs" />
                        </div>
                      </div>
                    </>
                  )}

                  {selected.type === "rectangle" && (
                    <>
                      <div>
                        <Label className="text-xs">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.bgColor || "#ffffff"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                bgColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.bgColor || "#ffffff"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                bgColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.borderColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.borderColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Border Width (px)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={selected.borderWidth || 2}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              borderWidth: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    </>
                  )}

                  {selected.type === "border" && (
                    <>
                      <div>
                        <Label className="text-xs">Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={selected.borderColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="w-12 h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={selected.borderColor || "#000000"}
                            onChange={(e) =>
                              updateElement(selected.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Border Width (px)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={selected.borderWidth || 2}
                          onChange={(e) =>
                            updateElement(selected.id, {
                              borderWidth: parseInt(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    </>
                  )}

                  {selected.type === "image" && (
                    <div>
                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          const fileInput = document.getElementById(
                            "imageReplaceInput"
                          ) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.dataset.elementId = selected.id;
                            fileInput.click();
                          }
                        }}
                      >
                        <ImageIcon className="h-3 w-3 mr-2" />
                        Replace Image
                      </Button>
                      <input
                        id="imageReplaceInput"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const imageUrl = event.target?.result as string;
                            const elementId = (
                              e.target as HTMLInputElement
                            ).dataset.elementId;
                            if (elementId) {
                              updateElement(elementId, { imageUrl });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant={selected.locked ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() =>
                        updateElement(selected.id, {
                          locked: !selected.locked,
                        })
                      }
                    >
                      {selected.locked ? (
                        <>
                          <Lock className="h-3 w-3 mr-2" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3 mr-2" />
                          Unlocked
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 text-xs"
                      onClick={() => deleteElement(selected.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export */}
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Button onClick={() => showQueryParametersDialog("pdf")} className="w-full text-xs">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={() => showQueryParametersDialog("print")} variant="outline" className="w-full text-xs">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Design
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ===== CANVAS SECTION ===== */}
          <div className="flex-1 overflow-auto flex items-start justify-center bg-gray-100 rounded-lg">
          <div
            ref={canvasRef}
            className="relative bg-white border-2 border-gray-300 flex-shrink-0 shadow-lg"
            style={{
              width: `${getPagePx(appliedPageSize, appliedOrientation).w}px`,
              height: `${getPagePx(appliedPageSize, appliedOrientation).h}px`,
              cursor: tool ? "crosshair" : "default",
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
                {/* Grid Background */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(0deg, #999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Section Separators and Labels */}
                {/* HEADER Area Label and Separator */}
                <div className="absolute top-2 left-4 pointer-events-none">
                  <div className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">HEADER ({headerHeight}px)</div>
                </div>
                <div
                  className="absolute cursor-ns-resize hover:bg-blue-400"
                  style={{
                    top: `${headerHeight}px`,
                    left: '0',
                    right: '0',
                    height: '4px',
                    backgroundColor: '#93c5fd',
                    opacity: 0.7,
                    transform: 'translateY(-2px)'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingHeaderBorder(true);
                  }}
                ></div>

                {/* BODY Area Label */}
                <div className="absolute pointer-events-none" style={{ top: `${headerHeight + 50}px`, left: '4px' }}>
                  <div className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">BODY AREA</div>
                </div>

                {/* FOOTER Area Label and Separator */}
                <div className="absolute pointer-events-none" style={{ bottom: `${footerHeight + 10}px`, left: '4px' }}>
                  <div className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">FOOTER ({footerHeight}px)</div>
                </div>
                <div
                  className="absolute cursor-ns-resize hover:bg-orange-400"
                  style={{
                    bottom: `${footerHeight}px`,
                    left: '0',
                    right: '0',
                    height: '4px',
                    backgroundColor: '#fed7aa',
                    opacity: 0.7,
                    transform: 'translateY(2px)'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingFooterBorder(true);
                  }}
                ></div>





                {/* Preview Rectangle - Show while drawing */}
                {previewRect && (
                  <div
                    className="absolute border-2 border-dashed border-blue-400 bg-blue-100 opacity-50 pointer-events-none"
                    style={{
                      left: `${previewRect.x}px`,
                      top: `${previewRect.y}px`,
                      width: `${previewRect.width}px`,
                      height: `${previewRect.height}px`,
                    }}
                  >
                    <div className="text-xs text-blue-600 p-1 font-semibold">
                      {Math.round(previewRect.width)} x {Math.round(previewRect.height)}px
                    </div>
                  </div>
                )}

                {/* Multi-Select Box */}
                {multiSelectBox && (
                  <div
                    className="absolute border-2 border-dashed border-blue-400 bg-blue-100 opacity-30 pointer-events-none"
                    style={{
                      left: `${multiSelectBox.x}px`,
                      top: `${multiSelectBox.y}px`,
                      width: `${multiSelectBox.width}px`,
                      height: `${multiSelectBox.height}px`,
                    }}
                  />
                )}

                {/* Multi-select bounding box for selected elements */}
                {design.selectedIds.length > 1 && (() => {
                  const selectedEls = design.elements.filter(el => design.selectedIds.includes(el.id));
                  if (selectedEls.length === 0) return null;
                  const minX = Math.min(...selectedEls.map(e => e.x));
                  const minY = Math.min(...selectedEls.map(e => e.y));
                  const maxX = Math.max(...selectedEls.map(e => e.x + e.width));
                  const maxY = Math.max(...selectedEls.map(e => e.y + e.height));
                  return (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${minX}px`,
                        top: `${minY}px`,
                        width: `${maxX - minX}px`,
                        height: `${maxY - minY}px`,
                        border: '2px dashed #3b82f6',
                        background: 'rgba(59,130,246,0.03)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ position: 'absolute', left: 4, top: -20 }} className="text-xs text-blue-600 bg-white px-2 rounded">{selectedEls.length} selected</div>
                    </div>
                  );
                })()}

                {/* Alignment Guides */}
                {alignmentGuides && (
                  <>
                    {alignmentGuides.vertical !== undefined && (
                      <div
                        className="absolute bg-blue-500 opacity-60 pointer-events-none"
                        style={{
                          left: `${alignmentGuides.vertical}px`,
                          top: "0",
                          width: "1px",
                          height: "100%",
                        }}
                      />
                    )}
                    {alignmentGuides.horizontal !== undefined && (
                      <div
                        className="absolute bg-blue-500 opacity-60 pointer-events-none"
                        style={{
                          left: "0",
                          top: `${alignmentGuides.horizontal}px`,
                          width: "100%",
                          height: "1px",
                        }}
                      />
                    )}
                  </>
                )}

                {/* Print Settings preview overlay (shows while modal is open) */}
                {showPrintSettings && canvasRef.current && (
                  <>
                    {/* Shaded outside margins */}
                    <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: `${tempMargins.left}px`, height: "100%", background: "rgba(0,0,0,0.04)" }} />
                    <div className="absolute pointer-events-none" style={{ right: 0, top: 0, width: `${tempMargins.right}px`, height: "100%", background: "rgba(0,0,0,0.04)" }} />
                    <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: `${tempMargins.top}px`, background: "rgba(0,0,0,0.04)" }} />
                    <div className="absolute pointer-events-none" style={{ left: 0, bottom: 0, width: "100%", height: `${tempMargins.bottom}px`, background: "rgba(0,0,0,0.04)" }} />

                    {/* Content area outline */}
                    <div className="absolute pointer-events-none" style={{
                      left: `${tempMargins.left}px`,
                      top: `${tempMargins.top}px`,
                      width: `${(canvasRef.current?.clientWidth || getPagePx(appliedPageSize, appliedOrientation).w) - tempMargins.left - tempMargins.right}px`,
                      height: `${(canvasRef.current?.clientHeight || getPagePx(appliedPageSize, appliedOrientation).h) - tempMargins.top - tempMargins.bottom}px`,
                      border: '2px dashed #f97316',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ position: 'absolute', left: 6, top: -20 }} className={`text-xs px-2 rounded ${JSON.stringify(tempMargins) !== JSON.stringify(exportMargins) ? 'text-blue-600 bg-white' : 'text-gray-600 bg-white'}`}>
                        {JSON.stringify(tempMargins) !== JSON.stringify(exportMargins) ? 'Preview — export-only (Save)' : 'Preview — saved export margins'}
                      </div>
                      <div style={{ position: 'absolute', right: 6, top: -20 }} className="text-xs text-orange-600 bg-white px-2 rounded">Apply & Save will apply to layout</div>
                    </div>
                  </>
                )}

                {/* Elements */}
                {design.elements.map((el) => {
                  const isSelected = design.selectedIds.includes(el.id);
                  return (
                  <div
                    key={el.id}
                    className={`absolute cursor-move ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      padding: "0px",
                      border:
                        el.type === "rectangle"
                          ? `${el.borderWidth || 2}px solid ${el.borderColor || "#000000"}`
                          : el.type === "line" || el.type === "vline" || el.type === "border" || el.type === "image" || el.type === "text" || el.type === "field"
                          ? "none"
                          : isSelected
                          ? "2px solid #3b82f6"
                          : "2px solid #d1d5db",
                      backgroundColor:
                        el.type === "rectangle"
                          ? el.bgColor || "#ffffff"
                          : "transparent",
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : "rotate(0deg)",
                      transformOrigin: "center",
                      transition: "transform 0.1s ease-out",
                    }}
                  >
                    {el.type === "text" && (
                      editingId === el.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => finishEditingText(el.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              finishEditingText(el.id);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                            e.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="h-full w-full border-none outline-none"
                          style={{
                            fontSize: `${el.fontSize}px`,
                            fontWeight: el.fontWeight || "normal",
                            fontStyle: el.fontStyle || "normal",
                            textDecoration: el.textDecoration || "none",
                            cursor: "text",
                            userSelect: "text",
                            caretColor: "#3b82f6",
                            padding: "0",
                            margin: "0",
                            boxSizing: "border-box",
                            lineHeight: "1",
                            verticalAlign: "top",
                            color: el.fontColor || "#000000",
                          }}
                        />
                      ) : (
                        <div
                          className="h-full w-full overflow-hidden cursor-move"
                          style={{
                            fontSize: `${el.fontSize}px`,
                            color: el.fontColor || "#000000",
                            fontWeight: el.fontWeight || "normal",
                            fontStyle: el.fontStyle || "normal",
                            textDecoration: el.textDecoration || "none",
                            display: "flex",
                            alignItems: "center",
                            padding: "0",
                            margin: "0",
                            lineHeight: "1",
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startEditingText(el.id, el.content || "");
                          }}
                        >
                          {el.content}
                        </div>
                      )
                    )}
                    {el.type === "field" && (
                      <div
                        style={{
                          padding: "0",
                          margin: "0",
                          whiteSpace: "nowrap",
                          lineHeight: "1",
                          fontSize: el.fontSize ? `${el.fontSize}px` : "12px",
                          fontWeight: "bold",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          height: "100%",
                          width: "100%",
                        }}
                      >
                        [{el.fieldName}]
                      </div>
                    )}
                    {el.type === "line" && (
                      <div
                        className="absolute"
                        style={{
                          width: el.width > el.height ? `${el.width}px` : `${el.borderWidth || 2}px`,
                          height: el.height > el.width ? `${el.height}px` : `${el.borderWidth || 2}px`,
                          backgroundColor: el.borderColor || "#000000",
                          opacity: 0.8,
                        }}
                      />
                    )}
                    {el.type === "vline" && (
                      <div
                        className="absolute"
                        style={{
                          width: `${el.borderWidth || 2}px`,
                          height: `${el.height}px`,
                          backgroundColor: el.borderColor || "#000000",
                          opacity: 0.8,
                        }}
                      />
                    )}
                    {el.type === "rectangle" && (
                      <div className="h-full w-full" />
                    )}
                    {el.type === "border" && (
                      <div
                        className="h-full w-full"
                        style={{
                          border: `${el.borderWidth || 2}px solid ${el.borderColor || "#000000"}`,
                          backgroundColor: "transparent",
                        }}
                      />
                    )}
                    {el.type === "table" && (
                      <div className="h-full w-full">
                        <table className="w-full h-full border-collapse">
                          <tbody>
                            {Array(el.rows || 2)
                              .fill(0)
                              .map((_, r) => (
                                <tr key={r}>
                                  {Array(el.cols || 2)
                                    .fill(0)
                                    .map((_, c) => (
                                      <td
                                        key={c}
                                        className="border border-gray-400 p-1"
                                      />
                                    ))}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {el.type === "image" && (
                      <img
                        src={el.imageUrl}
                        alt="Embedded"
                        className="h-full w-full object-cover"
                      />
                    )}

                    {/* Selection overlay (visible for any selected element) */}
                    {isSelected && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          border: '2px solid #3b82f6',
                          boxSizing: 'border-box',
                          borderRadius: '2px',
                        }}
                      />
                    )}

                    {/* Group overlay */}
                    {el.type === 'group' && (
                      <div className="h-full w-full flex items-center justify-center pointer-events-none">
                        <div className="text-xs text-gray-600 px-1 py-0.5 bg-white/70 rounded">Group ({el.children?.length || 0})</div>
                      </div>
                    )}

                    {/* Lock Indicator - Show for locked elements */}
                    {el.locked && (
                      <div
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 pointer-events-none"
                        title="Element is locked"
                      >
                        <Lock className="h-3 w-3" />
                      </div>
                    )}

                    {/* Resize Handles - Only show for selected elements that are not locked */}
                    {design.selectedId === el.id && !el.locked && (
                      <>
                        {/* Corner handles */}
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "nw")
                          }
                          className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-blue-500 cursor-nwse-resize rounded-full"
                        />
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "ne")
                          }
                          className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 cursor-nesw-resize rounded-full"
                        />
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "sw")
                          }
                          className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-500 cursor-nesw-resize rounded-full"
                        />
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "se")
                          }
                          className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-blue-500 cursor-nwse-resize rounded-full"
                        />
                        {/* Edge handles */}
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "n")
                          }
                          className="absolute -top-1 left-1/2 w-1.5 h-1.5 bg-blue-400 cursor-ns-resize rounded-full transform -translate-x-1/2"
                        />
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "s")
                          }
                          className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 bg-blue-400 cursor-ns-resize rounded-full transform -translate-x-1/2"
                        />
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "w")
                          }
                          className="absolute top-1/2 -left-1 w-1.5 h-1.5 bg-blue-400 cursor-ew-resize rounded-full transform -translate-y-1/2"
                        />
                        <div
                          onMouseDown={(e) =>
                            handleResizeMouseDown(e, el.id, "e")
                          }
                          className="absolute top-1/2 -right-1 w-1.5 h-1.5 bg-blue-400 cursor-ew-resize rounded-full transform -translate-y-1/2"
                        />
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* ============= FOOTER SECTION ============= */}
        {showSampleDataDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Enter Query Parameters</CardTitle>
              <p className="text-xs text-gray-600 mt-2">
                Provide values for @ parameters to fetch data from database
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {getQueryParameters().length === 0 ? (
                <p className="text-gray-600">No parameters found in queries</p>
              ) : (
                <>
                  {getQueryParameters().map((param) => (
                    <div key={param}>
                      <Label className="text-sm font-medium">@{param}</Label>
                      <Input
                        type="text"
                        placeholder={`Enter value for @${param}`}
                        value={sampleData[param] || ""}
                        onChange={(e) =>
                          setSampleData((prev) => ({
                            ...prev,
                            [param]: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                  ))}
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleQuerySubmit}
                  className="flex-1"
                >
                  {pendingAction === "print" ? "Print" : "Export PDF"}
                </Button>
                <Button
                  onClick={() => setShowSampleDataDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </>
  );
} catch (err) {
  console.error("ReportDesigner render error:", err);
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Error rendering Report Designer</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-red-600">{String(err && (err as any).stack ? (err as any).stack : String(err))}</pre>
        </CardContent>
      </Card>
    </div>
  );
} 
}