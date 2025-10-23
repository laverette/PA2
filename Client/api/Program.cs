using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Data.Sqlite;
using BCrypt.Net;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Simple JWT Authentication
var secretKey = "YourSuperSecretKeyThatIsLongEnoughAndSecureForJWTTokenGeneration123456789";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Create clean database
var connectionString = "Data Source=freelancemusic.db";
using var connection = new SqliteConnection(connectionString);
connection.Open();

// Create simple, working tables
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT UNIQUE NOT NULL,
        PasswordHash TEXT NOT NULL,
        Role TEXT NOT NULL
    )");

connection.Execute(@"
    CREATE TABLE IF NOT EXISTS TeacherProfiles (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER NOT NULL,
        Name TEXT,
        Bio TEXT,
        DefaultLessonCost DECIMAL(10,2),
        ContactInfo TEXT
    )");

connection.Execute(@"
    CREATE TABLE IF NOT EXISTS AvailabilitySlots (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        TeacherId INTEGER NOT NULL,
        Date TEXT NOT NULL,
        StartTime TEXT NOT NULL,
        EndTime TEXT NOT NULL,
        IsVirtual BOOLEAN NOT NULL,
        Cost DECIMAL(10,2),
        Notes TEXT
    )");

connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Lessons (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        TeacherId INTEGER NOT NULL,
        StudentName TEXT NOT NULL,
        Instrument TEXT NOT NULL,
        LessonDate TEXT NOT NULL,
        StartTime TEXT NOT NULL,
        EndTime TEXT NOT NULL,
        LessonType TEXT NOT NULL,
        Cost DECIMAL(10,2) NOT NULL,
        Status TEXT NOT NULL DEFAULT 'Pending',
        Notes TEXT
    )");

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "API is running", timestamp = DateTime.UtcNow }));

// Debug endpoint to see what data is being sent
app.MapPost("/api/debug-availability", async (HttpContext context) =>
{
    try
    {
        var request = await context.Request.ReadFromJsonAsync<dynamic>();
        return Results.Ok(new { 
            message = "Debug endpoint working", 
            receivedData = request,
            dataType = request?.GetType().Name,
            timestamp = DateTime.UtcNow 
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Debug failed: " + ex.Message });
    }
});

// Simple login
app.MapPost("/api/auth/login", async (LoginRequest request) =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        var user = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT Id, Username, PasswordHash, Role FROM Users WHERE Username = @Username",
            new { Username = request.Username }
        );
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Results.BadRequest(new { message = "Invalid username or password" });
        }
        
        var token = GenerateJwtToken((int)user.Id, user.Username, user.Role);
        return Results.Ok(new { token = token, role = user.Role, userId = user.Id });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Login error: " + ex.Message });
    }
});

// Simple register
app.MapPost("/api/auth/register", async (RegisterRequest request) =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        
        // Check if username exists
        var existingUser = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT Id FROM Users WHERE Username = @Username",
            new { Username = request.Username }
        );
        
        if (existingUser != null)
        {
            return Results.BadRequest(new { message = "Username already exists" });
        }
        
        // Create user
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var userId = await conn.QuerySingleAsync<int>(
            "INSERT INTO Users (Username, PasswordHash, Role) VALUES (@Username, @PasswordHash, @Role); SELECT last_insert_rowid();",
            new { Username = request.Username, PasswordHash = passwordHash, Role = request.Role }
        );
        
        var token = GenerateJwtToken(userId, request.Username, request.Role);
        return Results.Ok(new { token = token, role = request.Role, userId = userId });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Registration error: " + ex.Message });
    }
});

// Teacher profile endpoints
app.MapGet("/api/teachers/my-profile", (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var profile = conn.QueryFirstOrDefault(@"
            SELECT Id, Name, Bio, DefaultLessonCost, ContactInfo 
            FROM TeacherProfiles 
            WHERE UserId = @UserId", new { UserId = userId });

        if (profile == null)
        {
            return Results.Ok(new
            {
                Id = 0,
                Name = "",
                Bio = "",
                DefaultLessonCost = 0.00m,
                ContactInfo = "",
                Instruments = new object[0]
            });
        }

        return Results.Ok(profile);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to load profile: " + ex.Message });
    }
});

app.MapPost("/api/teachers/profile", async (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var form = await context.Request.ReadFormAsync();
        
        var name = form["name"].ToString();
        var bio = form["bio"].ToString();
        var defaultLessonCost = decimal.Parse(form["defaultLessonCost"].ToString());
        var contactInfo = form["contactInfo"].ToString();

        // Check if profile exists
        var existingProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM TeacherProfiles WHERE UserId = @UserId", new { UserId = userId });

        if (existingProfile == null)
        {
            conn.Execute(@"
                INSERT INTO TeacherProfiles (UserId, Name, Bio, DefaultLessonCost, ContactInfo)
                VALUES (@UserId, @Name, @Bio, @DefaultLessonCost, @ContactInfo)",
                new { UserId = userId, Name = name, Bio = bio, DefaultLessonCost = defaultLessonCost, ContactInfo = contactInfo });
        }
        else
        {
            conn.Execute(@"
                UPDATE TeacherProfiles 
                SET Name = @Name, Bio = @Bio, DefaultLessonCost = @DefaultLessonCost, ContactInfo = @ContactInfo
                WHERE UserId = @UserId",
                new { UserId = userId, Name = name, Bio = bio, DefaultLessonCost = defaultLessonCost, ContactInfo = contactInfo });
        }

        return Results.Ok(new { message = "Profile saved successfully" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to save profile: " + ex.Message });
    }
});

// Availability endpoints
app.MapGet("/api/teachers/availability", (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM TeacherProfiles WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.Ok(new object[0]);
        }

        var availability = conn.Query(@"
            SELECT Id, Date, StartTime, EndTime, IsVirtual, Cost, Notes
            FROM AvailabilitySlots 
            WHERE TeacherId = @TeacherId
            ORDER BY Date, StartTime",
            new { TeacherId = teacherProfile.Id });

        return Results.Ok(availability);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to load availability: " + ex.Message });
    }
});

app.MapPost("/api/teachers/availability", async (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM TeacherProfiles WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.BadRequest(new { message = "Teacher profile not found. Please create your profile first." });
        }

        // Try to read as JSON first, fallback to form data
        dynamic request;
        try
        {
            request = await context.Request.ReadFromJsonAsync<dynamic>();
        }
        catch
        {
            var form = await context.Request.ReadFormAsync();
            request = new
            {
                date = form["date"].ToString(),
                startTime = form["startTime"].ToString(),
                endTime = form["endTime"].ToString(),
                isVirtual = form["isVirtual"].ToString(),
                cost = form["cost"].ToString(),
                notes = form["notes"].ToString()
            };
        }
        
        if (request == null)
        {
            return Results.BadRequest(new { message = "No data received" });
        }
        
        // Extract data with safe defaults
        var date = request.date?.ToString() ?? DateTime.Now.ToString("yyyy-MM-dd");
        var startTime = request.startTime?.ToString() ?? "09:00";
        var endTime = request.endTime?.ToString() ?? "10:00";
        var isVirtual = false;
        var cost = 0m;
        var notes = request.notes?.ToString() ?? "";
        
        // Safe parsing
        if (request.isVirtual != null)
        {
            bool.TryParse(request.isVirtual.ToString(), out isVirtual);
        }
        
        if (request.cost != null)
        {
            decimal.TryParse(request.cost.ToString(), out cost);
        }
        
        // Insert into database
        conn.Execute(@"
            INSERT INTO AvailabilitySlots (TeacherId, Date, StartTime, EndTime, IsVirtual, Cost, Notes)
            VALUES (@TeacherId, @Date, @StartTime, @EndTime, @IsVirtual, @Cost, @Notes)",
            new { 
                TeacherId = teacherProfile.Id, 
                Date = date, 
                StartTime = startTime, 
                EndTime = endTime, 
                IsVirtual = isVirtual, 
                Cost = cost, 
                Notes = notes 
            });

        return Results.Ok(new { message = "Availability added successfully" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to add availability: " + ex.Message });
    }
});

// Lessons endpoints
app.MapGet("/api/teachers/my-lessons", (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM TeacherProfiles WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.Ok(new object[0]);
        }

        var lessons = conn.Query(@"
            SELECT Id, StudentName, Instrument, LessonDate, StartTime, EndTime, 
                   LessonType, Cost as TotalCost, Status, Notes
            FROM Lessons 
            WHERE TeacherId = @TeacherId
            ORDER BY LessonDate, StartTime",
            new { TeacherId = teacherProfile.Id });

        var formattedLessons = lessons.Select(lesson => new
        {
            Id = lesson.Id,
            Student = new { Name = lesson.StudentName, ContactInfo = "student@example.com" },
            Instrument = new { Name = lesson.Instrument },
            LessonType = lesson.LessonType,
            TotalCost = lesson.TotalCost,
            Status = lesson.Status,
            AvailabilitySlot = new { Date = lesson.LessonDate, StartTime = lesson.StartTime, EndTime = lesson.EndTime },
            Notes = lesson.Notes
        });

        return Results.Ok(formattedLessons);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to load lessons: " + ex.Message });
    }
});

app.MapPost("/api/teachers/schedule-lesson", async (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM TeacherProfiles WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.BadRequest(new { message = "Teacher profile not found. Please create your profile first." });
        }

        var request = await context.Request.ReadFromJsonAsync<dynamic>();
        if (request == null)
        {
            return Results.BadRequest(new { message = "Invalid request data" });
        }
        
        // Calculate end time
        var startTime = request.lessonTime?.ToString() ?? "";
        var duration = int.TryParse(request.duration?.ToString(), out int durationResult) ? durationResult : 0;
        var timeParts = startTime.Split(':');
        var hours = int.TryParse(timeParts[0], out int hoursResult) ? hoursResult : 0;
        var minutes = int.TryParse(timeParts[1], out int minutesResult) ? minutesResult : 0;
        var startMinutes = hours * 60 + minutes;
        var endMinutes = startMinutes + duration;
        var endHours = Math.Floor(endMinutes / 60.0);
        var endMins = endMinutes % 60;
        var endTime = $"{endHours:D2}:{endMins:D2}";
        
        conn.Execute(@"
            INSERT INTO Lessons (TeacherId, StudentName, Instrument, LessonDate, StartTime, EndTime, 
                                LessonType, Cost, Status, Notes)
            VALUES (@TeacherId, @StudentName, @Instrument, @LessonDate, @StartTime, @EndTime, 
                    @LessonType, @Cost, @Status, @Notes)",
            new { 
                TeacherId = teacherProfile.Id, 
                StudentName = request.studentName?.ToString() ?? "",
                Instrument = request.instrument?.ToString() ?? "",
                LessonDate = request.lessonDate?.ToString() ?? "",
                StartTime = startTime,
                EndTime = endTime,
                LessonType = request.lessonType?.ToString() ?? "",
                Cost = decimal.TryParse(request.cost?.ToString(), out decimal costResult) ? costResult : 0m,
                Status = "Pending",
                Notes = request.notes?.ToString() ?? ""
            });

        return Results.Ok(new { message = "Lesson scheduled successfully" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to schedule lesson: " + ex.Message });
    }
});

// Helper functions
int? GetUserId(HttpContext context)
{
    var userIdClaim = context.User.FindFirst("userId");
    if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
    {
        return null;
    }
    return userId;
}

string GenerateJwtToken(int userId, string username, string role)
{
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    
    var claims = new[]
    {
        new Claim("userId", userId.ToString()),
        new Claim(ClaimTypes.Name, username),
        new Claim(ClaimTypes.Role, role)
    };
    
    var token = new JwtSecurityToken(
        claims: claims,
        expires: DateTime.UtcNow.AddHours(1),
        signingCredentials: credentials
    );
    
    return new JwtSecurityTokenHandler().WriteToken(token);
}

app.Run();

// Request/Response models
public record LoginRequest(string Username, string Password);
public record RegisterRequest(string Username, string Password, string Role);