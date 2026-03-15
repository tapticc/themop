namespace Client.Services
{
    public class TxResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public object? Data { get; set; }
    }
}
