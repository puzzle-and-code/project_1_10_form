using System.ComponentModel.DataAnnotations;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    /// <summary>
    /// Тело запроса PATCH /api/forms/{id}. Оба поля необязательны —
    /// обновляется только то, что реально передано в JSON; поле,
    /// отсутствующее в теле запроса, в базе не меняется.
    ///
    /// Упрощение: раз поле не пришло и раз оно пришло как null — для
    /// этого простого случая не различаем (оба трактуются как
    /// "не обновлять"). Если позже понадобится явно затирать описание
    /// в null, можно будет перейти на JsonPatch или обёртку Optional&lt;T&gt;.
    /// </summary>
    public class UpdateFormDto
    {
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Название должно быть от 1 до 200 символов")]
        public string? Title { get; set; }

        [StringLength(2000, ErrorMessage = "Описание не должно превышать 2000 символов")]
        public string? Description { get; set; }
    }
}
