using FormBuilderWithAnalytics.src.Application.DTOs;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface ICreationFormsService
    {
      
            Task<int> CreateDraftAsync(FormDto formDto, int ownerId);
            Task PublishFormAsync(int formId);
            Task DeleteFormAsync(int formId);
        
    }
}
