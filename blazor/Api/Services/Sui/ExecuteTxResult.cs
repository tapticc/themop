namespace Api.Services.Sui
{
    public class ExecuteTxResult
    {
        public object? Transaction { get; set; }   // return raw gRPC response
    }
}
