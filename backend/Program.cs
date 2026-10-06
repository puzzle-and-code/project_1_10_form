var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// --- Swagger/OpenAPI ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "FormBuilderWithAnalytics API",
        Version = "v1",
        Description = "API сервиса форм/опросов. На этом этапе — базовые health-эндпоинты, " +
                      "далее появятся авторизация, создание анкет и заполнение."
    });

    // Подхватываем XML-комментарии (///summary) из кода, чтобы в Swagger
    // были человекочитаемые описания эндпоинтов, а не только сигнатуры.
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Swagger доступен только в Development — в проде не выставляем схему API наружу.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FormBuilderWithAnalytics API v1");
    });
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
