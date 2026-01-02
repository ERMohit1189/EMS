using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using VendorRegistrationBackend.Data;

namespace VendorRegistrationBackend.Services
{
    public class ReportPdfService
    {
        private readonly AppDbContext _context;
        private readonly IReportsService _reportsService;

        public ReportPdfService(AppDbContext context, IReportsService reportsService)
        {
            _context = context;
            _reportsService = reportsService;
        }

        /// <summary>
        /// Generates HTML from a report template with populated data
        /// This HTML can be converted to PDF on the frontend or using a service
        /// </summary>
        public async Task<string> GenerateHtmlFromTemplateAsync(string templateId, Dictionary<string, object> parameters, string? designJson = null, string? queriesJson = null, int leftMargin = 0, int rightMargin = 0, int topMargin = 0, int bottomMargin = 0, string pageSize = "A4", string orientation = "portrait", bool autoFixOverlaps = false)
        {
            // Fetch template (allow missing template for ad-hoc exports)
            var template = _context.ReportTemplates.FirstOrDefault(t => t.Id == templateId);
            if (template == null)
            {
                Console.WriteLine($"[ReportPdfService] Template '{templateId}' not found - proceeding with provided design/queries");
            }

            // Use provided design/queries or fetch from template
            var designJsonToUse = designJson ?? template.DesignJson;
            var queriesJsonToUse = queriesJson ?? template.QueriesJson;

            Console.WriteLine($"[ReportPdfService] Generating HTML for template: {templateId}");
            Console.WriteLine($"[ReportPdfService] Design JSON length: {designJsonToUse?.Length ?? 0}");
            Console.WriteLine($"[ReportPdfService] Queries JSON length: {queriesJsonToUse?.Length ?? 0}");
            Console.WriteLine($"[ReportPdfService] Parameters count: {parameters?.Count ?? 0}");

            if (!string.IsNullOrWhiteSpace(designJsonToUse) && designJsonToUse.Length > 0)
            {
                Console.WriteLine($"[ReportPdfService] Design JSON preview: {designJsonToUse.Substring(0, Math.Min(200, designJsonToUse.Length))}");
            }

            // Parse design JSON with case-insensitive property matching
            var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var designElements = JsonSerializer.Deserialize<List<DesignElement>>(designJsonToUse ?? "[]", jsonOptions)
                ?? new List<DesignElement>();

            Console.WriteLine($"[ReportPdfService] Parsed {designElements.Count} design elements");
            if (designElements.Count > 0)
            {
                Console.WriteLine($"[ReportPdfService] First element - Type: '{designElements[0].Type}', X: {designElements[0].X}, Y: {designElements[0].Y}, Width: {designElements[0].Width}, Height: {designElements[0].Height}");
            }

            // Convert object parameters to strings for SQL execution
            var stringParameters = parameters?.ToDictionary(x => x.Key, x => x.Value?.ToString() ?? "")
                ?? new Dictionary<string, string>();

            // Parse queries and execute them to get data
            var queryData = await ExecuteTemplateQueriesAsync(queriesJsonToUse ?? "[]", stringParameters);

            // Merge parameters with query results
            var mergedData = new Dictionary<string, string>(stringParameters);
            foreach (var kvp in queryData)
            {
                if (!mergedData.ContainsKey(kvp.Key))
                    mergedData[kvp.Key] = kvp.Value?.ToString() ?? "";
            }

            // Generate HTML (pass through page size, orientation and auto-fix flag)
            var html = GenerateHtml(designElements, mergedData, queryData, template?.Name ?? templateId, leftMargin, rightMargin, topMargin, bottomMargin, pageSize, orientation, autoFixOverlaps);
            Console.WriteLine($"[ReportPdfService] Generated HTML length: {html.Length}");
            Console.WriteLine($"[ReportPdfService] HTML preview (first 500 chars): {html.Substring(0, Math.Min(500, html.Length))}");
            return html;
        }

        private async Task<Dictionary<string, object>> ExecuteTemplateQueriesAsync(string queriesJson, Dictionary<string, string> parameters)
        {
            var result = new Dictionary<string, object>();

            try
            {
                var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var queries = JsonSerializer.Deserialize<List<TemplateQuery>>(queriesJson, jsonOptions) ?? new List<TemplateQuery>();
                Console.WriteLine($"[ReportPdfService] Parsed {queries.Count} queries: {string.Join(",", queries.Select(q => q.SectionName ?? q.Name ?? "(unnamed)"))}");

                foreach (var query in queries)
                {
                    // Support both Sql and Query property names
                    var sqlText = query.Sql ?? query.Query;

                    if (string.IsNullOrWhiteSpace(sqlText))
                        continue;

                    try
                    {
                        // Short-circuit: if TestResults present on the query, use them as the result set (useful for tests)
                        if (query.TestResults != null && query.TestResults.Count > 0)
                        {
                            var rows = new List<Dictionary<string, object>>();
                            foreach (var item in query.TestResults)
                            {
                                try
                                {
                                    if (item is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Object)
                                    {
                                        var dict = new Dictionary<string, object>();
                                        foreach (var prop in je.EnumerateObject())
                                        {
                                            dict[prop.Name] = prop.Value.ValueKind switch
                                            {
                                                System.Text.Json.JsonValueKind.String => prop.Value.GetString() ?? "",
                                                System.Text.Json.JsonValueKind.Number => prop.Value.GetDouble(),
                                                System.Text.Json.JsonValueKind.True => true,
                                                System.Text.Json.JsonValueKind.False => false,
                                                System.Text.Json.JsonValueKind.Null => "",
                                                _ => prop.Value.ToString() ?? ""
                                            };
                                        }
                                        rows.Add(dict);
                                    }
                                    else if (item is Dictionary<string, object> dictObj)
                                    {
                                        rows.Add(new Dictionary<string, object>(dictObj));
                                    }
                                    else
                                    {
                                        // best-effort: attempt to serialize then parse
                                        var s = System.Text.Json.JsonSerializer.Serialize(item);
                                        var je2 = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(s);
                                        if (je2.ValueKind == System.Text.Json.JsonValueKind.Object)
                                        {
                                            var dict = new Dictionary<string, object>();
                                            foreach (var prop in je2.EnumerateObject())
                                            {
                                                dict[prop.Name] = prop.Value.ToString() ?? "";
                                            }
                                            rows.Add(dict);
                                        }
                                    }
                                }
                                catch (Exception ex2)
                                {
                                    Console.WriteLine($"[ReportPdfService] Error parsing TestResults item: {ex2.Message}");
                                }
                            }

                            Console.WriteLine($"[ReportPdfService] Using TestResults for query '{query.SectionName}' - {rows.Count} rows");

                            if (!string.IsNullOrWhiteSpace(query.SectionName))
                            {
                                result[query.SectionName] = rows;
                            }
                            else if (rows.Count > 0)
                            {
                                var first = rows[0];
                                foreach (var kv in first)
                                {
                                    result[kv.Key] = kv.Value ?? "";
                                }
                            }

                            // skip DB execution for this query
                            continue;
                        }

                        // Replace parameters in SQL
                        var sql = sqlText;
                        foreach (var param in parameters)
                        {
                            sql = sql.Replace($"@{param.Key}", $"'{param.Value}'", StringComparison.OrdinalIgnoreCase);
                        }

                        // Execute raw SQL query
                        var connection = _context.Database.GetDbConnection();
                        await connection.OpenAsync();

                        using (var command = connection.CreateCommand())
                        {
                            command.CommandText = sql;
                            using (var reader = await command.ExecuteReaderAsync())
                            {
                                var rows = new List<Dictionary<string, object>>();
                                while (await reader.ReadAsync())
                                {
                                    var row = new Dictionary<string, object>();
                                    for (int i = 0; i < reader.FieldCount; i++)
                                    {
                                        var fieldName = reader.GetName(i);
                                        var value = reader.GetValue(i) ?? "";
                                        row[fieldName] = value;
                                    }
                                    rows.Add(row);
                                }

                                // If a SectionName is provided, store the full result set under that key
                                if (!string.IsNullOrWhiteSpace(query.SectionName))
                                {
                                    result[query.SectionName] = rows;
                                }
                                else if (rows.Count > 0)
                                {
                                    // If no section name, merge first row columns into root dictionary (backward compatibility)
                                    var first = rows[0];
                                    foreach (var kv in first)
                                    {
                                        result[kv.Key] = kv.Value ?? "";
                                    }
                                }
                            }
                        }

                        await connection.CloseAsync();
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue with other queries
                        Console.WriteLine($"Error executing query: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing queries: {ex.Message}");
            }

            return result;
        }

        private string GenerateHtml(List<DesignElement> elements, Dictionary<string, string> data, Dictionary<string, object> queryData, string templateName, int leftMargin = 0, int rightMargin = 0, int topMargin = 0, int bottomMargin = 0, string pageSize = "A4", string orientation = "portrait", bool autoFixOverlaps = false)
        {
            var html = new System.Text.StringBuilder();

            html.AppendLine("<!DOCTYPE html>");
            html.AppendLine("<html lang=\"en\">");
            html.AppendLine("<head>");
            html.AppendLine("  <meta charset=\"UTF-8\">");
            html.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
            html.AppendLine($"  <title>{System.Net.WebUtility.HtmlEncode(templateName)}</title>");
            html.AppendLine("  <style>");
            html.AppendLine("    * { box-sizing: border-box; }");
            html.AppendLine("    html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }");
            html.AppendLine("    @page { margin: 0.5in; size: A4; }");
            html.AppendLine($"    .page {{ width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; position: relative; page-break-after: always; box-sizing: border-box; }}");
            html.AppendLine("    .element { position: absolute; }");
            html.AppendLine("    .element-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }");
            html.AppendLine("    .element-field { font-weight: bold; }");
            html.AppendLine("    .element-line { border: none; }");
            html.AppendLine("    .element-rectangle { border-collapse: collapse; }");
            html.AppendLine("    /* Table printing helpers: allow table headers to repeat on new pages and avoid breaking rows */");
            html.AppendLine("    table { page-break-inside: auto; border-collapse: collapse; }");
            html.AppendLine("    tr    { page-break-inside: avoid; page-break-after: auto; }");
            html.AppendLine("    thead { display: table-header-group; }");
            html.AppendLine("    tfoot { display: table-footer-group; }");
            html.AppendLine("    .element-table { border-collapse: collapse; width: 100%; height: 100%; }");
            html.AppendLine("    .element-table td { border: 1px solid #ddd; padding: 4px; }");
            html.AppendLine("    .element-image { width: 100%; height: 100%; object-fit: cover; }");
            html.AppendLine("  </style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("  <div class=\"page\">");

            // Detect whether margins have already been applied to saved element coordinates
            // If saved element X/Y are already offset by the same margin, avoid adding it again
            int minX = elements.Any() ? elements.Min(e => e.X) : 0;
            int minY = elements.Any() ? elements.Min(e => e.Y) : 0;
            bool marginsAlreadyAppliedHoriz = minX >= leftMargin;
            bool marginsAlreadyAppliedVert = minY >= topMargin;
            int effectiveLeft = marginsAlreadyAppliedHoriz ? 0 : leftMargin;
            int effectiveTop = marginsAlreadyAppliedVert ? 0 : topMargin;

            Console.WriteLine($"[ReportPdfService] marginsAlreadyAppliedHoriz={marginsAlreadyAppliedHoriz}, marginsAlreadyAppliedVert={marginsAlreadyAppliedVert}, effectiveLeft={effectiveLeft}, effectiveTop={effectiveTop}");

            // Determine page dimensions from pageSize + orientation (mm -> px using 96 DPI)
            (double pageWidthMm, double pageHeightMm) = pageSize switch
            {
                "A3" => (420.0, 297.0),
                "A4" => (210.0, 297.0),
                "Letter" => (216.0, 279.0),
                _ => (210.0, 297.0) // default A4
            };

            if (orientation?.ToLower() == "landscape")
            {
                var tmp = pageWidthMm; pageWidthMm = pageHeightMm; pageHeightMm = tmp;
            }

            int PAGE_WIDTH_PX = (int)Math.Round(pageWidthMm / 25.4 * 96.0);
            int PAGE_HEIGHT_PX = (int)Math.Round(pageHeightMm / 25.4 * 96.0);

            Console.WriteLine($"[ReportPdfService] page size: {pageSize} {orientation} => {PAGE_WIDTH_PX}px x {PAGE_HEIGHT_PX}px");

            // If margins are not already applied to element coordinates, show them as page padding
            int paddingLeft = marginsAlreadyAppliedHoriz ? 0 : leftMargin;
            int paddingRight = marginsAlreadyAppliedHoriz ? 0 : rightMargin;
            int paddingTop = marginsAlreadyAppliedVert ? 0 : topMargin;
            int paddingBottom = marginsAlreadyAppliedVert ? 0 : bottomMargin;

            int contentLeft = paddingLeft;
            int contentRightFinal = PAGE_WIDTH_PX - paddingRight;
            int contentTop = paddingTop;
            int contentBottomFinal = PAGE_HEIGHT_PX - paddingBottom;

            Console.WriteLine($"[ReportPdfService] content area L={contentLeft} R={contentRightFinal} T={contentTop} B={contentBottomFinal}");

            // Clone elements and apply clamping
            var adjustedElements = new List<DesignElement>();
            foreach (var el in elements)
            {
                var copy = new DesignElement
                {
                    Id = el.Id,
                    Type = el.Type,
                    X = el.X,
                    Y = el.Y,
                    Width = el.Width,
                    Height = el.Height,
                    Content = el.Content,
                    FieldName = el.FieldName,
                    FontSize = el.FontSize,
                    FontColor = el.FontColor,
                    FontWeight = el.FontWeight,
                    FontStyle = el.FontStyle,
                    TextDecoration = el.TextDecoration,
                    BorderColor = el.BorderColor,
                    BgColor = el.BgColor,
                    BorderWidth = el.BorderWidth,
                    ImageUrl = el.ImageUrl,
                    Rows = el.Rows,
                    Cols = el.Cols,
                    Rotation = el.Rotation,
                    Locked = el.Locked
                };

                // Horizontal clamping
                int maxRight = contentRightFinal;
                int originalX = copy.X;
                int originalW = copy.Width;
                if (copy.X < contentLeft) copy.X = contentLeft;
                if (copy.X + copy.Width > maxRight)
                {
                    int available = maxRight - contentLeft;
                    if (available <= 30)
                    {
                        // If nothing fits, clamp position and reduce width to minimum
                        copy.X = contentLeft;
                        copy.Width = Math.Max(30, available);
                    }
                    else if (copy.Width > available)
                    {
                        copy.Width = available;
                        copy.X = contentLeft;
                    }
                    else
                    {
                        copy.X = Math.Max(contentLeft, maxRight - copy.Width);
                    }
                }
                if (copy.X != originalX || copy.Width != originalW)
                {
                    Console.WriteLine($"[ReportPdfService] Adjusted element '{copy.Id}' horizontally: X {originalX} -> {copy.X}, W {originalW} -> {copy.Width}");
                }

                // Vertical clamping
                int maxBottom = contentBottomFinal;
                int originalY = copy.Y;
                int originalH = copy.Height;
                if (copy.Y < effectiveTop) copy.Y = effectiveTop;
                if (copy.Y + copy.Height > maxBottom)
                {
                    int availableV = maxBottom - effectiveTop;
                    if (availableV <= 30)
                    {
                        copy.Y = effectiveTop;
                        copy.Height = Math.Max(30, availableV);
                    }
                    else if (copy.Height > availableV)
                    {
                        copy.Height = availableV;
                        copy.Y = effectiveTop;
                    }
                    else
                    {
                        copy.Y = Math.Max(effectiveTop, maxBottom - copy.Height);
                    }
                }
                if (copy.Y != originalY || copy.Height != originalH)
                {
                    Console.WriteLine($"[ReportPdfService] Adjusted element '{copy.Id}' vertically: Y {originalY} -> {copy.Y}, H {originalH} -> {copy.Height}");
                }

                adjustedElements.Add(copy);
            }

            // Resolve remaining overlaps with multiple passes (horizontal and vertical)
            // Only run overlap fixes when autoFixOverlaps is true (Option1: default FALSE -> no fixes)
            if (autoFixOverlaps)
            {
                const int GAP = 4;
                bool RectsOverlap(DesignElement a, DesignElement b)
                {
                    return !(a.X + a.Width <= b.X || b.X + b.Width <= a.X || a.Y + a.Height <= b.Y || b.Y + b.Height <= a.Y);
                }

                // Horizontal resolution (same row)
                for (int pass = 0; pass < 4; pass++)
                {
                    bool changed = false;
                    var sorted = adjustedElements.OrderBy(e => e.X).ThenBy(e => e.Y).ToList();
                    for (int i = 0; i < sorted.Count; i++)
                    {
                        var a = sorted[i];
                        for (int j = 0; j < i; j++)
                        {
                            var b = sorted[j];
                            // Only consider if vertical ranges intersect (same row)
                            var verticalOverlap = !(a.Y + a.Height <= b.Y || b.Y + b.Height <= a.Y);
                            if (verticalOverlap && a.X < b.X + b.Width && a.X + a.Width > b.X)
                            {
                                var desiredX = b.X + b.Width + GAP;
                                var maxX = contentRightFinal - a.Width;
                                if (desiredX <= maxX)
                                {
                                    if (a.X != desiredX) { a.X = desiredX; changed = true; }
                                }
                                else
                                {
                                    var leftX = b.X - a.Width - GAP;
                                    var minBoundaryX = contentLeft;
                                    if (leftX >= minBoundaryX)
                                    {
                                        if (b.X != leftX) { b.X = leftX; changed = true; }
                                    }
                                    else
                                    {
                                        var newAx = Math.Min(Math.Max(a.X, contentLeft), maxX);
                                        if (a.X != newAx) { a.X = newAx; changed = true; }
                                    }
                                }
                            }
                        }
                    }
                    if (!changed) break;
                    adjustedElements = sorted;
                }

                // Vertical resolution (same column)
                for (int pass = 0; pass < 4; pass++)
                {
                    bool changed = false;
                    var sorted = adjustedElements.OrderBy(e => e.Y).ThenBy(e => e.X).ToList();
                    for (int i = 0; i < sorted.Count; i++)
                    {
                        var a = sorted[i];
                        for (int j = 0; j < i; j++)
                        {
                            var b = sorted[j];
                            if (RectsOverlap(a, b))
                            {
                                var desiredY = b.Y + b.Height + GAP;
                                var maxY = contentBottomFinal - a.Height;
                                if (desiredY <= maxY)
                                {
                                    if (a.Y != desiredY) { a.Y = desiredY; changed = true; }
                                }
                                else
                                {
                                    var upY = b.Y - a.Height - GAP;
                                    var minBoundaryY = contentTop;
                                    if (upY >= minBoundaryY)
                                    {
                                        if (b.Y != upY) { b.Y = upY; changed = true; }
                                    }
                                    else
                                    {
                                        var newAy = Math.Min(Math.Max(a.Y, contentTop), maxY);
                                        if (a.Y != newAy) { a.Y = newAy; changed = true; }
                                    }
                                }
                            }
                        }
                    }
                    if (!changed) break;
                    adjustedElements = sorted;
                }
            }

            // Add page padding via inline CSS so elements' positions are relative to the content area
            double leftIn = Math.Round((double)paddingLeft / 96.0, 3);
            double rightIn = Math.Round((double)paddingRight / 96.0, 3);
            double topIn = Math.Round((double)paddingTop / 96.0, 3);
            double bottomIn = Math.Round((double)paddingBottom / 96.0, 3);

            html.AppendLine($"  <style> .page {{ padding: {topIn}in {rightIn}in {bottomIn}in {leftIn}in; }} </style>");

            // Pagination: split oversized repeat-tables into page-sized fragments and shift subsequent elements down
            var fragments = new List<(DesignElement el, int startRow, int maxRows)>();
            double pageHeightContent = contentBottomFinal - contentTop; // available vertical space per page

            // Work on a copy so we can modify positions for later elements when an element expands
            for (int i = 0; i < adjustedElements.Count; i++)
            {
                var el = adjustedElements[i];
                Console.WriteLine($"[ReportPdfService] Processing element #{i} '{el.Id}' type='{el.Type}' X={el.X} Y={el.Y} W={el.Width} H={el.Height}");

                // Only split repeat tables that have data
                if (el.Type == "table" && !string.IsNullOrWhiteSpace(el.Repeat) && queryData != null && queryData.TryGetValue(el.Repeat, out var raw) && raw is List<Dictionary<string, object>> rowsData && rowsData.Count > 0)
                {
                    int totalRows = rowsData.Count;
                    var cellPadding = el.CellPadding ?? 4;
                    var headerHeight = el.ShowHeader == true ? (el.HeaderHeight ?? (el.HeaderFontSize ?? 12) + (cellPadding * 2)) : 0;
                    var rowHeight = el.RowHeight ?? Math.Max(20, (el.Height > 0 ? el.Height / Math.Max(1, el.Rows ?? 2) : 20));

                    // Compute pagination relative to the full page top (include header area)
                    // relativeStart is the element Y measured from the top of the content area
                    double relativeStart = Math.Max(el.Y, contentTop) - contentTop;
                    int pageIndex = Math.Max(0, (int)Math.Floor(relativeStart / pageHeightContent));
                    // offset inside the page's content area
                    double offsetInPage = relativeStart - pageIndex * pageHeightContent;

                    // rows that fit on the first page starting from offsetInPage
                    double remainingOnFirst = pageHeightContent - offsetInPage;
                    int firstPageRows = 0;
                    if (remainingOnFirst > headerHeight)
                        firstPageRows = (int)Math.Floor((remainingOnFirst - headerHeight) / (double)rowHeight);
                    if (firstPageRows < 0) firstPageRows = 0;

                    int rowsPerFullPage = (int)Math.Floor((pageHeightContent - headerHeight) / (double)rowHeight);
                    if (rowsPerFullPage <= 0) rowsPerFullPage = 1;

                    if (firstPageRows >= totalRows)
                    {
                        // fits on current element height/page
                        Console.WriteLine($"[ReportPdfService][Pagination] Table '{el.Id}' fits on this page with {firstPageRows} rows.");
                        fragments.Add((el, 0, totalRows));
                    }
                    else
                    {
                        // Build fragments
                        int start = 0;
                        // first fragment uses firstPageRows if any available, otherwise we'll place rows starting on next page
                        if (firstPageRows > 0)
                        {
                            // clone element for first fragment and shrink height to actually-used height
                            var firstFrag = CloneElement(el);
                            firstFrag.Height = headerHeight + (firstPageRows * (int)rowHeight);
                            Console.WriteLine($"[ReportPdfService][Pagination] Table '{el.Id}' first fragment rows=0..{firstPageRows-1} height={firstFrag.Height}");
                            fragments.Add((firstFrag, 0, firstPageRows));
                            start += firstPageRows;
                        }

                        // subsequent pages
                        int fragIndex = 0;
                        while (start < totalRows)
                        {
                            int take = Math.Min(rowsPerFullPage, totalRows - start);
                            var frag = CloneElement(el);
                            // Place fragment on subsequent page(s) at top content area
                            fragIndex++;
                            int fragPage = pageIndex + fragIndex;
                            frag.Y = (int)(contentTop + fragPage * pageHeightContent + 0); // top of content area on this page
                            frag.Height = headerHeight + (int)(take * rowHeight);
                            Console.WriteLine($"[ReportPdfService][Pagination] Table '{el.Id}' fragment start={start} take={take} page={fragPage} Y={frag.Y} H={frag.Height}");
                            fragments.Add((frag, start, take));
                            start += take;
                        }

                        // Shift later elements down by the number of extra pages introduced
                        int extraPages = Math.Max(0, fragments.Count - 1 - (firstPageRows > 0 ? 0 : 0));
                        if (firstPageRows == 0 && fragments.Count > 0)
                        {
                            // all fragments start on next pages, so extra pages = fragments.Count
                            extraPages = fragments.Count;
                        }
                        else
                        {
                            extraPages = Math.Max(0, fragments.Count - 1);
                        }

                        if (extraPages > 0)
                        {
                            double shiftBy = extraPages * pageHeightContent;
                            Console.WriteLine($"[ReportPdfService][Pagination] Table '{el.Id}' introduced {extraPages} extra pages. Shifting subsequent elements by {shiftBy} px.");
                            for (int j = i + 1; j < adjustedElements.Count; j++)
                            {
                                var prevY = adjustedElements[j].Y;
                                adjustedElements[j].Y = (int)(adjustedElements[j].Y + shiftBy);
                                Console.WriteLine($"[ReportPdfService][Pagination] Element '{adjustedElements[j].Id}' moved Y: {prevY} -> {adjustedElements[j].Y}");
                            }
                        }
                    }
                }
                else
                {
                    fragments.Add((el, 0, int.MaxValue));
                }
            }

            // Group fragments by page index and render each page separately
            int maxPage = 0;
            foreach (var f in fragments)
            {
                var pageIdx = Math.Max(0, (int)Math.Floor((f.el.Y - contentTop) / pageHeightContent));
                if (pageIdx > maxPage) maxPage = pageIdx;
            }

            for (int p = 0; p <= maxPage; p++)
            {
                html.AppendLine("  <div class=\"page\">" );
                // Render fragments that belong to this page
                foreach (var f in fragments.Where(ff => Math.Max(0, (int)Math.Floor((ff.el.Y - contentTop) / pageHeightContent)) == p))
                {
                    var el = f.el;
                    var startRow = f.startRow;
                    var maxRows = f.maxRows;
                    // Build style adjusted for this page (subtract page offset so top is relative to page)
                    int pageOffset = p * (int)pageHeightContent;
                    string style = BuildElementStyle(el, 0, -pageOffset);
                    string content = RenderElementContent(el, data, queryData, startRow, maxRows == int.MaxValue ? int.MaxValue : maxRows);
                    html.AppendLine($"    <div class=\"element element-{el.Type}\" style=\"{style}\">" );
                    html.AppendLine($"      {content}");
                    html.AppendLine("    </div>");
                }
                html.AppendLine("  </div>");
            }
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

        private string RenderElementContent(DesignElement element, Dictionary<string, string> data, Dictionary<string, object> queryData, int startRow = 0, int maxRows = int.MaxValue)
        {
            return element.Type switch
            {
                "text" => System.Net.WebUtility.HtmlEncode(element.Content ?? ""),
                "field" => GetFieldValue(element.FieldName, data),
                "line" => "",
                "vline" => "",
                "rectangle" => "",
                "border" => "",
                "table" => RenderTable(element, queryData, startRow, maxRows),
                "image" => $"<img src=\"{System.Net.WebUtility.HtmlEncode(element.ImageUrl ?? "")}\" class=\"element-image\" />",
                _ => ""
            };
        }

        private string GetFieldValue(string? fieldName, Dictionary<string, string> data)
        {
            if (string.IsNullOrWhiteSpace(fieldName))
                return "";

            // Try exact match first
            if (data.TryGetValue(fieldName, out var value))
                return System.Net.WebUtility.HtmlEncode(value ?? "");

            // Try case-insensitive match
            var matchKey = data.Keys.FirstOrDefault(k => k.Equals(fieldName, StringComparison.OrdinalIgnoreCase));
            if (matchKey != null)
                return System.Net.WebUtility.HtmlEncode(data[matchKey] ?? "");

            return ""; // Return blank if not found
        }

        private string RenderTable(DesignElement element, Dictionary<string, object> queryData, int startRow = 0, int maxRows = int.MaxValue)
        {
            var rows = element.Rows ?? 2;
            var cols = element.Cols ?? 2;
            var cellPadding = element.CellPadding ?? 4;
            var rowHeight = element.RowHeight ?? Math.Max(20, (element.Height > 0 ? element.Height / Math.Max(1, rows) : 20));

            var table = "<table class=\"element-table\" style=\"width:100%;border-collapse:collapse;\">";

            // Resolve column list: prefer configured Columns, fall back to first data row keys, or generic col0..colN
            List<string> columns = null;
            List<Dictionary<string, object>> dataRows = null;
            if (!string.IsNullOrWhiteSpace(element.Repeat) && queryData != null && queryData.TryGetValue(element.Repeat, out var rawRows) && rawRows is List<Dictionary<string, object>> drs)
            {
                dataRows = drs;
            }

            if (element.Columns != null && element.Columns.Count > 0)
            {
                columns = element.Columns;
            }
            else if (dataRows != null && dataRows.Count > 0)
            {
                columns = dataRows[0].Keys.ToList();
            }
            else
            {
                columns = Enumerable.Range(0, cols).Select(i => $"col{i}").ToList();
            }

            // Render header if requested (render even when no data rows so header is visible)
// Emit <colgroup> if explicit column widths are provided so browsers respect them (helps PDF/print accuracy)
                if (element.ColumnWidths != null && element.ColumnWidths.Count > 0)
                {
                    table += "<colgroup>";
                    for (int ci = 0; ci < element.ColumnWidths.Count; ci++)
                    {
                        var w = Math.Max(0, element.ColumnWidths[ci]);
                        if (w > 0)
                            table += $"<col style=\"width:{w}px;\" />";
                        else
                            table += "<col />";
                    }
                    table += "</colgroup>";
                }

                // Prepare column alignments (default to left)
                var colAligns = (element.ColumnAlignments != null && element.ColumnAlignments.Count > 0)
                    ? element.ColumnAlignments
                    : Enumerable.Range(0, columns.Count).Select(_ => "left").ToList();

                if (element.ShowHeader == true)
                {
                    var headerBg = System.Net.WebUtility.HtmlEncode(element.HeaderBgColor ?? "#f3f4f6");
                    var headerColor = System.Net.WebUtility.HtmlEncode(element.HeaderFontColor ?? "#111827");
                    var headerFontSize = element.HeaderFontSize ?? 12;
                    var headerFontWeight = System.Net.WebUtility.HtmlEncode(element.HeaderFontWeight ?? "bold");
                    var theadDisplay = element.RepeatHeaderOnEveryPage == true ? "display: table-header-group;" : "";
                    var headerStyle = $"background:{headerBg}; color:{headerColor}; font-size:{headerFontSize}px; font-weight:{headerFontWeight};";
                    var headerHeightPx = element.HeaderHeight ?? (element.HeaderFontSize ?? 12) + (cellPadding * 2);
                    table += $"<thead style=\"{theadDisplay}\"><tr style=\"height: {headerHeightPx}px; {headerStyle}\">";
                    for (int ci = 0; ci < columns.Count; ci++)
                    {
                        var align = ci < colAligns.Count ? System.Net.WebUtility.HtmlEncode(colAligns[ci]) : "left";
                        table += $"<th style=\"border:1px solid #ddd;padding:{cellPadding}px;text-align:{align};\">{System.Net.WebUtility.HtmlEncode(columns[ci])}</th>";
                }
                table += "</tr></thead>";
            }

            // Render data rows if available (respect startRow/maxRows), otherwise render placeholder empty rows
            if (dataRows != null && dataRows.Count > 0)
            {
                Console.WriteLine($"[ReportPdfService][RenderTable] element='{element.Id}' rendering rows {startRow}..{(maxRows==int.MaxValue?"end":(startRow+maxRows-1).ToString())}");
                var totalRows = dataRows.Count;
                int endRow = Math.Min(totalRows, startRow + maxRows);
                for (int ridx = startRow; ridx < endRow; ridx++)
                {
                    var dr = dataRows[ridx];
                    var isAlt = ridx % 2 == 1;
                    var altBg = isAlt && !string.IsNullOrWhiteSpace(element.AltRowBgColor) ? System.Net.WebUtility.HtmlEncode(element.AltRowBgColor) : string.Empty;
                    var altColor = isAlt && !string.IsNullOrWhiteSpace(element.AltRowFontColor) ? System.Net.WebUtility.HtmlEncode(element.AltRowFontColor) : string.Empty;
                    var rowStyle = $"height:{rowHeight}px; {(string.IsNullOrEmpty(altBg) ? "" : $"background:{altBg};")} {(string.IsNullOrEmpty(altColor) ? "" : $"color:{altColor};")}";
                    table += $"<tr style=\"{rowStyle}\">";
                    for (int ci = 0; ci < columns.Count; ci++)
                    {
                        var key = columns[ci];
                        var val = dr.ContainsKey(key) && dr[key] != null ? dr[key].ToString() : string.Empty;
                        var align = ci < colAligns.Count ? System.Net.WebUtility.HtmlEncode(colAligns[ci]) : "left";
                        table += $"<td style=\"border:1px solid #ddd;padding:{cellPadding}px;vertical-align:top;height:{rowHeight}px;text-align:{align};\">{System.Net.WebUtility.HtmlEncode(val)}</td>";
                    }
                    table += "</tr>";
                }
            }
            else
            {
                for (int r = 0; r < rows; r++)
                {
                    table += $"<tr style=\"height:{rowHeight}px;\">";
                    for (int c = 0; c < columns.Count; c++)
                    {
                        table += $"<td style=\"border:1px solid #ddd;padding:{cellPadding}px;height:{rowHeight}px;vertical-align:top;\"></td>";
                    }
                    table += "</tr>";
                }
            }

            table += "</table>";
            return table;
        }

        private string BuildElementStyle(DesignElement element, int leftMargin = 0, int topMargin = 0)
        {
            // Adjust element position by margins
            var adjustedX = element.X + leftMargin;
            var adjustedY = element.Y + topMargin;
            var style = $"left: {adjustedX}px; top: {adjustedY}px; width: {element.Width}px; height: {element.Height}px; ";

            // Add type-specific styles
            if (element.Type == "text" || element.Type == "field")
            {
                style += $"font-size: {element.FontSize ?? 14}px; ";
                style += $"color: {element.FontColor ?? "#000000"}; ";
                style += $"font-weight: {element.FontWeight ?? "normal"}; ";
                style += "display: flex; align-items: center; ";
            }

            if (element.Type == "rectangle")
            {
                style += $"border: {element.BorderWidth ?? 2}px solid {element.BorderColor ?? "#000000"}; ";
                style += $"background-color: {element.BgColor ?? "#ffffff"}; ";
            }

            if (element.Type == "border")
            {
                style += $"border: {element.BorderWidth ?? 2}px solid {element.BorderColor ?? "#000000"}; ";
                style += "background-color: transparent; ";
            }

            if (element.Type == "line")
            {
                style += "border: none; ";
                style += $"border-top: {element.BorderWidth ?? 2}px solid {element.BorderColor ?? "#000000"}; ";
                style += "height: 0; ";
            }

            if (element.Type == "vline")
            {
                style += "border: none; ";
                style += $"border-left: {element.BorderWidth ?? 2}px solid {element.BorderColor ?? "#000000"}; ";
                style += "width: 0; ";
            }

            if (element.Rotation.HasValue && element.Rotation > 0)
            {
                style += $"transform: rotate({element.Rotation}deg); transform-origin: center; ";
            }

            return style;
        }

        // Clone a design element (shallow copy)
        private DesignElement CloneElement(DesignElement src)
        {
            return new DesignElement
            {
                Id = src.Id,
                Type = src.Type,
                X = src.X,
                Y = src.Y,
                Width = src.Width,
                Height = src.Height,
                Content = src.Content,
                FieldName = src.FieldName,
                FontSize = src.FontSize,
                FontColor = src.FontColor,
                FontWeight = src.FontWeight,
                FontStyle = src.FontStyle,
                TextDecoration = src.TextDecoration,
                BorderColor = src.BorderColor,
                BgColor = src.BgColor,
                BorderWidth = src.BorderWidth,
                ImageUrl = src.ImageUrl,
                Rows = src.Rows,
                Cols = src.Cols,
                Repeat = src.Repeat,
                Columns = src.Columns == null ? null : new List<string>(src.Columns),
                ShowHeader = src.ShowHeader,
                RepeatHeaderOnEveryPage = src.RepeatHeaderOnEveryPage,
                HeaderBgColor = src.HeaderBgColor,
                HeaderFontSize = src.HeaderFontSize,
                HeaderFontColor = src.HeaderFontColor,
                HeaderFontWeight = src.HeaderFontWeight,
                AltRowBgColor = src.AltRowBgColor,
                AltRowFontColor = src.AltRowFontColor,
                CellPadding = src.CellPadding,
                RowHeight = src.RowHeight,
                // Column layout metadata
                ColumnWidths = src.ColumnWidths == null ? null : new List<int>(src.ColumnWidths),
                ColumnAlignments = src.ColumnAlignments == null ? null : new List<string>(src.ColumnAlignments),
                Rotation = src.Rotation,
                Locked = src.Locked
            };
        }
    }

    // DTOs
    public class DesignElement
    {
        public string Id { get; set; } = "";
        public string Type { get; set; } = "";

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int X { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int Y { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int Width { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int Height { get; set; }

        public string? Content { get; set; }
        public string? FieldName { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? FontSize { get; set; }

        public string? FontColor { get; set; }
        public string? FontWeight { get; set; }
        public string? FontStyle { get; set; }
        public string? TextDecoration { get; set; }
        public string? BorderColor { get; set; }
        public string? BgColor { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? BorderWidth { get; set; }

        public string? ImageUrl { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? Rows { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? Cols { get; set; }

        // New table-related properties
        public string? Repeat { get; set; }
        public List<string>? Columns { get; set; }
        public bool? ShowHeader { get; set; }
        public bool? RepeatHeaderOnEveryPage { get; set; }
        public string? HeaderBgColor { get; set; }
        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? HeaderFontSize { get; set; }
        public string? HeaderFontColor { get; set; }
        public string? HeaderFontWeight { get; set; }
        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? HeaderHeight { get; set; }
        public string? AltRowBgColor { get; set; }
        public string? AltRowFontColor { get; set; }
        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? CellPadding { get; set; }
        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? RowHeight { get; set; }

        // Per-column layout: widths (px) and alignments ("left"|"center"|"right")
        public List<int>? ColumnWidths { get; set; }
        public List<string>? ColumnAlignments { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(IntNullableJsonConverter))]
        public int? Rotation { get; set; }

        public bool Locked { get; set; }
    }

    // Custom converter to handle string to int conversion
    public class IntJsonConverter : System.Text.Json.Serialization.JsonConverter<int>
    {
        public override int Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
        {
            try
            {
                switch (reader.TokenType)
                {
                    case System.Text.Json.JsonTokenType.Number:
                        // Try to get as double first, then convert to int
                        if (reader.TryGetDouble(out var doubleValue))
                        {
                            return (int)doubleValue;
                        }
                        else if (reader.TryGetInt32(out var intValue))
                        {
                            return intValue;
                        }
                        return 0;
                    case System.Text.Json.JsonTokenType.String:
                        var stringValue = reader.GetString();
                        if (double.TryParse(stringValue, out var parsedDouble))
                        {
                            return (int)parsedDouble;
                        }
                        if (int.TryParse(stringValue, out var parsedInt))
                        {
                            return parsedInt;
                        }
                        return 0;
                    case System.Text.Json.JsonTokenType.Null:
                        return 0;
                    default:
                        return 0;
                }
            }
            catch
            {
                return 0;
            }
        }

        public override void Write(System.Text.Json.Utf8JsonWriter writer, int value, System.Text.Json.JsonSerializerOptions options)
        {
            writer.WriteNumberValue(value);
        }
    }

    public class IntNullableJsonConverter : System.Text.Json.Serialization.JsonConverter<int?>
    {
        public override int? Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
        {
            try
            {
                switch (reader.TokenType)
                {
                    case System.Text.Json.JsonTokenType.Number:
                        // Try to get as double first, then convert to int
                        if (reader.TryGetDouble(out var doubleValue))
                        {
                            return (int)doubleValue;
                        }
                        else if (reader.TryGetInt32(out var intValue))
                        {
                            return intValue;
                        }
                        return null;
                    case System.Text.Json.JsonTokenType.String:
                        var stringValue = reader.GetString();
                        if (double.TryParse(stringValue, out var parsedDouble))
                        {
                            return (int)parsedDouble;
                        }
                        if (int.TryParse(stringValue, out var parsedInt))
                        {
                            return parsedInt;
                        }
                        return null;
                    case System.Text.Json.JsonTokenType.Null:
                        return null;
                    default:
                        return null;
                }
            }
            catch
            {
                return null;
            }
        }

        public override void Write(System.Text.Json.Utf8JsonWriter writer, int? value, System.Text.Json.JsonSerializerOptions options)
        {
            if (value.HasValue)
                writer.WriteNumberValue(value.Value);
            else
                writer.WriteNullValue();
        }
    }

    public class TemplateQuery
    {
        public string? Name { get; set; }
        public string? Sql { get; set; }
        public string? SectionName { get; set; }
        public string? Query { get; set; }
        public List<string>? Columns { get; set; }
        public List<object>? TestResults { get; set; }
        public bool IsValid { get; set; }
    }
}
