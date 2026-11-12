using FormBuilderWithAnalytics.src.Application.DTOs;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface ICreationFormsService
    {

        Task<Guid> CreateDraftAsync(FormDto formDto, Guid ownerId);
        Task PublishFormAsync(Guid formId);
        Task DeleteFormAsync(Guid formId);

    }
}
