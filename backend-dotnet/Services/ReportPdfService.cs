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
        public async Task<string> GenerateHtmlFromTemplateAsync(string templateId, Dictionary<string, object> parameters, string? designJson = null, string? queriesJson = null, int leftMargin = 0, int rightMargin = 0, int topMargin = 0, int bottomMargin = 0)
        {
            // Fetch template
            var template = _context.ReportTemplates.FirstOrDefault(t => t.Id == templateId);
            if (template == null)
                throw new Exception("Template not found");

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

            // Generate HTML
            var html = GenerateHtml(designElements, mergedData, template.Name, leftMargin, rightMargin, topMargin, bottomMargin);
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

                foreach (var query in queries)
                {
                    // Support both Sql and Query property names
                    var sqlText = query.Sql ?? query.Query;

                    if (string.IsNullOrWhiteSpace(sqlText))
                        continue;

                    try
                    {
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
                                if (await reader.ReadAsync())
                                {
                                    // Get all columns from first row
                                    for (int i = 0; i < reader.FieldCount; i++)
                                    {
                                        var fieldName = reader.GetName(i);
                                        var value = reader.GetValue(i);
                                        result[fieldName] = value ?? "";
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

        private string GenerateHtml(List<DesignElement> elements, Dictionary<string, string> data, string templateName, int leftMargin = 0, int rightMargin = 0, int topMargin = 0, int bottomMargin = 0)
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
            html.AppendLine("    .element-table { border-collapse: collapse; width: 100%; height: 100%; }");
            html.AppendLine("    .element-table td { border: 1px solid #ddd; padding: 4px; }");
            html.AppendLine("    .element-image { width: 100%; height: 100%; object-fit: cover; }");
            html.AppendLine("  </style>");
            html.AppendLine("</head>");
            html.AppendLine("<body>");
            html.AppendLine("  <div class=\"page\">");

            // Render elements
            foreach (var el in elements)
            {
                string content = RenderElementContent(el, data);
                string style = BuildElementStyle(el, leftMargin, topMargin);

                html.AppendLine($"    <div class=\"element element-{el.Type}\" style=\"{style}\">");
                html.AppendLine($"      {content}");
                html.AppendLine("    </div>");
            }

            html.AppendLine("  </div>");
            html.AppendLine("</body>");
            html.AppendLine("</html>");

            return html.ToString();
        }

        private string RenderElementContent(DesignElement element, Dictionary<string, string> data)
        {
            return element.Type switch
            {
                "text" => System.Net.WebUtility.HtmlEncode(element.Content ?? ""),
                "field" => GetFieldValue(element.FieldName, data),
                "line" => "",
                "vline" => "",
                "rectangle" => "",
                "border" => "",
                "table" => RenderTable(element),
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

        private string RenderTable(DesignElement element)
        {
            var rows = element.Rows ?? 2;
            var cols = element.Cols ?? 2;
            var table = "<table class=\"element-table\">";

            for (int r = 0; r < rows; r++)
            {
                table += "<tr>";
                for (int c = 0; c < cols; c++)
                {
                    table += "<td></td>";
                }
                table += "</tr>";
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
