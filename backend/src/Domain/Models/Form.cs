namespace FormBuilderWithAnalytics.src.Domain.Models
{
    public class Form
    {
       public int Id { get; set; }
        public int Owner_id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public DateTime Created_at { get; set; }
        public DateTime Updated_at { get; set; }
        public DateTime Published_at { get; set; }
        public DateTime Closed_at { get; set; }
        public DateTime Deleted_at { get; set; }

    }
}
