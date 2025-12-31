namespace VendorRegistrationBackend.Models
{
    public class ReportTemplate
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "invoice" or "po"
        public string DesignJson { get; set; } = string.Empty; // JSON array of design elements
        public string QueriesJson { get; set; } = string.Empty; // JSON array of section queries
        public int? VendorId { get; set; } // NULL for admin templates
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Margin settings (in pixels) - using custom converters to handle float/string values
        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int LeftMargin { get; set; } = 0;

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int RightMargin { get; set; } = 0;

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int TopMargin { get; set; } = 0;

        [System.Text.Json.Serialization.JsonConverter(typeof(IntJsonConverter))]
        public int BottomMargin { get; set; } = 0;
    }

    // Custom converter to handle string to int conversion for margins
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
}
