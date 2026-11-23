using FormBuilderWithAnalytics.src.Application.DTOs;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface IQuestionsService
    {
        /// <summary>
        /// Добавляет вопрос в конец списка неудалённых вопросов своей формы.
        /// </summary>
        Task<AddQuestionResult> AddQuestionAsync(Guid formId, Guid ownerId, CreateQuestionDto dto);

        /// <summary>
        /// Сохраняет новый порядок неудалённых вопросов своей формы:
        /// sort_order становится 1..n в порядке переданных id.
        /// </summary>
        Task<ReorderQuestionsResult> ReorderQuestionsAsync(Guid formId, Guid ownerId, ReorderQuestionsDto dto);
    }
}
