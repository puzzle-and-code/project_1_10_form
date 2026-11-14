using FormBuilderWithAnalytics.src.Application.DTOs;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface IQuestionsService
    {
        /// <summary>
        /// Добавляет вопрос в конец списка неудалённых вопросов своей формы.
        /// </summary>
        Task<AddQuestionResult> AddQuestionAsync(Guid formId, Guid ownerId, CreateQuestionDto dto);
    }
}
