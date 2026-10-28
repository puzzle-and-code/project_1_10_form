using FormBuilderWithAnalytics.src.Application.DTOs;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface IFormsService
    {

       
            Task<Guid> CreateDraftAsync(FormDto dto, Guid ownerId);
            Task PublishFormAsync(Guid formId);
            Task DeleteFormAsync(Guid formId);
            Task<IEnumerable<FormDto>> GetUserFormsAsync(Guid userId);
        

    }
}
