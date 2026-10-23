using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FormBuilderWithAnalytics.src.Api.Controllers
{
     [ApiController]
        [Route("api/[controller]")]
        public class CreationFormsController : ControllerBase
        {
            private readonly ICreationFormsService _formsService;

            public CreationFormsController(ICreationFormsService formsService)
            {
                _formsService = formsService;
            }

            // POST: api/CreationForms/draft
            [HttpPost("draft")]
            public async Task<IActionResult> CreateDraft([FromBody] FormDto formDto, [FromQuery] int ownerId)
            {
                try
                {
                    var formId = await _formsService.CreateDraftAsync(formDto, ownerId);
                    return Ok(new { Message = "Черновик успешно создан", FormId = formId });
                }
                catch (Exception ex)
                {
                    return BadRequest(new { Error = ex.Message });
                }
            }
        }
}
