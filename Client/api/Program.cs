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

// Create clean database for localhost development
var connectionString = "Data Source=freelancemusic.db";
using var connection = new SqliteConnection(connectionString);
connection.Open();

// Create simple, working tables (EMAIL-BASED AUTHENTICATION)
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Email TEXT UNIQUE NOT NULL,
        PasswordHash TEXT NOT NULL,
        Role TEXT NOT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

// Create admin user if it doesn't exist
var adminExists = connection.QuerySingleOrDefault<int>("SELECT COUNT(*) FROM Users WHERE Email = 'admin@freelancemusic.com'");
if (adminExists == 0)
{
    var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
    connection.Execute("INSERT INTO Users (Email, PasswordHash, Role) VALUES ('admin@freelancemusic.com', @PasswordHash, 'Admin')", 
        new { PasswordHash = adminPasswordHash });
    Console.WriteLine("Admin user created: admin@freelancemusic.com/admin123");
}

// COMPREHENSIVE DATABASE SCHEMA - Supports ALL Functionalities

// Teachers table - Teacher profiles and data (Name, Email required)
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Teachers (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER NOT NULL,
        Name TEXT NOT NULL,
        Email TEXT NOT NULL,
        HourlyRate DECIMAL(10,2),
        Description TEXT,
        Instruments TEXT,
        PhotoUrl TEXT,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    )");

// Students table - Student profiles and data (Name, Email required)
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Students (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER NOT NULL,
        Name TEXT NOT NULL,
        Email TEXT NOT NULL,
        Instrument TEXT,
        Level TEXT,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    )");

// Instruments table - Available instruments for teaching
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Instruments (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL UNIQUE,
        Category TEXT,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

// TeacherInstruments - Many-to-many: Teachers teach multiple instruments
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS TeacherInstruments (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        TeacherId INTEGER NOT NULL,
        InstrumentId INTEGER NOT NULL,
        ProficiencyLevel TEXT DEFAULT 'Intermediate',
        YearsExperience INTEGER DEFAULT 0,
        FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE,
        FOREIGN KEY (InstrumentId) REFERENCES Instruments(Id) ON DELETE CASCADE,
        UNIQUE(TeacherId, InstrumentId)
    )");

// AvailabilitySlots - When teachers are available for lessons
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS AvailabilitySlots (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        TeacherId INTEGER NOT NULL,
        Date TEXT NOT NULL,
        StartTime TEXT NOT NULL,
        EndTime TEXT NOT NULL,
        IsAvailable BOOLEAN DEFAULT 1,
        IsVirtual BOOLEAN DEFAULT 0,
        Cost DECIMAL(10,2),
        Notes TEXT,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE
    )");

// Lessons - Booked lessons between teachers and students
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Lessons (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        TeacherId INTEGER NOT NULL,
        StudentId INTEGER,
        StudentName TEXT NOT NULL,
        Instrument TEXT NOT NULL,
        LessonDate TEXT NOT NULL,
        StartTime TEXT NOT NULL,
        EndTime TEXT NOT NULL,
        LessonType TEXT NOT NULL,
        TotalCost DECIMAL(10,2) NOT NULL,
        Status TEXT DEFAULT 'Pending',
        Notes TEXT,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE,
        FOREIGN KEY (StudentId) REFERENCES Students(Id) ON DELETE SET NULL
    )");

// Payments - Payment records for revenue tracking
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS Payments (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        LessonId INTEGER NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        PaymentMethod TEXT NOT NULL,
        PaymentStatus TEXT DEFAULT 'Pending',
        TransactionId TEXT,
        ProcessedAt DATETIME,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (LessonId) REFERENCES Lessons(Id) ON DELETE CASCADE
    )");

// ReferralSources - For admin dashboard referral tracking
connection.Execute(@"
    CREATE TABLE IF NOT EXISTS ReferralSources (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        SourceName TEXT NOT NULL,
        UserId INTEGER,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL
    )");

// Insert default instruments
connection.Execute(@"
    INSERT OR IGNORE INTO Instruments (Name, Category) VALUES 
    ('Piano', 'Keyboard'),
    ('Guitar', 'String'),
    ('Violin', 'String'),
    ('Drums', 'Percussion'),
    ('Voice/Singing', 'Vocal')
");

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "API is running", timestamp = DateTime.UtcNow }));

// Get teacher's lessons
app.MapGet("/api/teachers/my-lessons", (HttpContext context) =>
{
    try
    {
        Console.WriteLine("DEBUG: My lessons endpoint called");
        var userId = GetUserId(context);
        Console.WriteLine($"DEBUG: User ID from token: {userId}");
        if (userId == null) 
        {
            Console.WriteLine("DEBUG: No user ID found, returning unauthorized");
            return Results.Unauthorized();
        }

        using var conn = new SqliteConnection(connectionString);
        
        // Get teacher profile
        var teacher = conn.QueryFirstOrDefault("SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        if (teacher == null) return Results.NotFound(new { message = "Teacher profile not found" });

        // Get lessons for this teacher
        var lessons = conn.Query(@"
            SELECT 
                Id,
                StudentName,
                Instrument,
                LessonDate,
                StartTime,
                EndTime,
                LessonType,
                TotalCost,
                Status,
                Notes
            FROM Lessons 
            WHERE TeacherId = @TeacherId
            ORDER BY LessonDate DESC, StartTime DESC
        ", new { TeacherId = teacher.Id }).ToList();

        return Results.Ok(lessons);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error loading teacher lessons: {ex.Message}");
        return Results.BadRequest(new { message = "Failed to load lessons: " + ex.Message });
    }
});

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
            "SELECT Id, Email, PasswordHash, Role FROM Users WHERE Email = @Email",
            new { Email = request.Email }
        );
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Results.BadRequest(new { message = "Invalid email or password" });
        }
        
        var token = GenerateJwtToken((int)(long)user.Id, user.Email, user.Role);
        return Results.Ok(new { token = token, role = user.Role, userId = (int)(long)user.Id });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Login error: " + ex.Message });
    }
});

// Register with profile creation
app.MapPost("/api/auth/register", async (RegisterRequest request) =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        
        // Check if email exists
        var existingUser = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT Id FROM Users WHERE Email = @Email",
            new { Email = request.Email }
        );
        
        if (existingUser != null)
        {
            return Results.BadRequest(new { message = "Email already exists" });
        }
        
        // Create user
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var userId = await conn.QuerySingleAsync<int>(
            "INSERT INTO Users (Email, PasswordHash, Role) VALUES (@Email, @PasswordHash, @Role); SELECT last_insert_rowid();",
            new { Email = request.Email, PasswordHash = passwordHash, Role = request.Role }
        );
        
        // Create profile based on role
        if (request.Role == "Teacher")
        {
            await conn.ExecuteAsync(@"
                INSERT INTO Teachers (UserId, Name, Email, HourlyRate, Description, Instruments) 
                VALUES (@UserId, @Name, @Email, @HourlyRate, @Description, @Instruments)",
                new { 
                    UserId = userId, 
                    Name = request.Name, 
                    Email = request.Email,
                    HourlyRate = string.IsNullOrEmpty(request.HourlyRate) ? (decimal?)null : decimal.Parse(request.HourlyRate),
                    Description = request.Description,
                    Instruments = request.Instruments
                });
        }
        else if (request.Role == "Student")
        {
            await conn.ExecuteAsync(@"
                INSERT INTO Students (UserId, Name, Email, Instrument, Level) 
                VALUES (@UserId, @Name, @Email, @Instrument, @Level)",
                new { 
                    UserId = userId, 
                    Name = request.Name, 
                    Email = request.Email,
                    Instrument = request.Instrument,
                    Level = request.Level
                });
        }
        
        var token = GenerateJwtToken(userId, request.Email, request.Role);
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
        Console.WriteLine("DEBUG: My profile endpoint called");
        var userId = GetUserId(context);
        Console.WriteLine($"DEBUG: User ID: {userId}");
        
        if (userId == null) 
        {
            Console.WriteLine("DEBUG: User ID is null, returning unauthorized");
            return Results.Unauthorized();
        }

        using var conn = new SqliteConnection(connectionString);
        var profile = conn.QueryFirstOrDefault(@"
            SELECT Id, Name, Email, HourlyRate, Description, Instruments 
            FROM Teachers 
            WHERE UserId = @UserId", new { UserId = userId });

        Console.WriteLine($"DEBUG: Profile found: {profile != null}");
        if (profile != null)
        {
            Console.WriteLine($"DEBUG: Profile data - Name: {profile.Name}, Email: {profile.Email}, HourlyRate: {profile.HourlyRate}");
        }

        if (profile == null)
        {
            Console.WriteLine("DEBUG: No profile found, returning empty profile");
            return Results.Ok(new
            {
                Id = 0,
                Name = "",
                Email = "",
                HourlyRate = 0.00m,
                Description = "",
                Instruments = ""
            });
        }

        Console.WriteLine("DEBUG: Returning profile data");
        return Results.Ok(new
        {
            Id = profile.Id,
            Name = profile.Name,
            Email = profile.Email,
            HourlyRate = profile.HourlyRate ?? 0.00m,
            Description = profile.Description ?? "",
            Instruments = profile.Instruments ?? ""
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DEBUG: Exception in my-profile endpoint: {ex.Message}");
        Console.WriteLine($"DEBUG: Stack trace: {ex.StackTrace}");
        return Results.BadRequest(new { message = "Failed to load profile: " + ex.Message });
    }
});

app.MapPost("/api/teachers/profile", async (HttpContext context) =>
{
    try
    {
        Console.WriteLine("DEBUG: Teacher profile endpoint called");
        var userId = GetUserId(context);
        Console.WriteLine($"DEBUG: User ID from token: {userId}");
        if (userId == null) 
        {
            Console.WriteLine("DEBUG: No user ID found, returning unauthorized");
            return Results.Unauthorized();
        }

        using var conn = new SqliteConnection(connectionString);
        
        // Read JSON data
        var request = await context.Request.ReadFromJsonAsync<dynamic>();
        
        var name = request?.GetProperty("name").GetString();
        var email = request?.GetProperty("email").GetString();
        var hourlyRate = request?.GetProperty("hourlyRate").GetDecimal();
        var description = request?.GetProperty("description").GetString();
        var instruments = request?.GetProperty("instruments").GetString();

        // Check if profile exists
        var existingProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });

        int teacherId;
        if (existingProfile == null)
        {
            conn.Execute(@"
                INSERT INTO Teachers (UserId, Name, Email, HourlyRate, Description, Instruments)
                VALUES (@UserId, @Name, @Email, @HourlyRate, @Description, @Instruments)",
                new { UserId = userId, Name = name, Email = email, HourlyRate = hourlyRate, Description = description, Instruments = instruments });
            
            teacherId = conn.QuerySingle<int>("SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        }
        else
        {
            conn.Execute(@"
                UPDATE Teachers 
                SET Name = @Name, Email = @Email, HourlyRate = @HourlyRate, Description = @Description, Instruments = @Instruments
                WHERE UserId = @UserId",
                new { UserId = userId, Name = name, Email = email, HourlyRate = hourlyRate, Description = description, Instruments = instruments });
            
            teacherId = existingProfile.Id;
        }

        return Results.Ok(new { message = "Profile updated successfully" });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error updating teacher profile: {ex.Message}");
        return Results.BadRequest(new { message = "Failed to update profile: " + ex.Message });
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
            SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        
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
        if (userId == null) 
        {
            Console.WriteLine("DEBUG: No user ID found in token");
            return Results.Unauthorized();
        }

        Console.WriteLine($"DEBUG: User ID: {userId}");

        using var conn = new SqliteConnection(connectionString);
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            Console.WriteLine($"DEBUG: No teacher profile found for user {userId}");
            return Results.BadRequest(new { message = "Teacher profile not found. Please create your profile first." });
        }

        Console.WriteLine($"DEBUG: Teacher profile ID: {teacherProfile.Id}");

        // Try to read as JSON first, fallback to form data
        AvailabilityRequest request;
        try
        {
            request = await context.Request.ReadFromJsonAsync<AvailabilityRequest>();
            Console.WriteLine($"DEBUG: Received JSON data: Date={request?.Date}, StartTime={request?.StartTime}, EndTime={request?.EndTime}, IsVirtual={request?.IsVirtual}, Cost={request?.Cost}, Notes={request?.Notes}");
        }
        catch (Exception jsonEx)
        {
            Console.WriteLine($"DEBUG: JSON parsing failed: {jsonEx.Message}");
            var form = await context.Request.ReadFormAsync();
            request = new AvailabilityRequest(
                Date: form["date"].ToString(),
                StartTime: form["startTime"].ToString(),
                EndTime: form["endTime"].ToString(),
                IsVirtual: bool.TryParse(form["isVirtual"].ToString(), out bool isVirtualForm) ? isVirtualForm : false,
                Cost: decimal.TryParse(form["cost"].ToString(), out decimal costForm) ? costForm : 0m,
                Notes: form["notes"].ToString()
            );
            Console.WriteLine($"DEBUG: Received form data: Date={request.Date}, StartTime={request.StartTime}, EndTime={request.EndTime}, IsVirtual={request.IsVirtual}, Cost={request.Cost}, Notes={request.Notes}");
        }
        
        if (request == null)
        {
            Console.WriteLine("DEBUG: No request data received");
            return Results.BadRequest(new { message = "No data received" });
        }
        
        // Extract data with safe defaults
        var date = request.Date ?? DateTime.Now.ToString("yyyy-MM-dd");
        var startTime = request.StartTime ?? "09:00";
        var endTime = request.EndTime ?? "10:00";
        var isVirtual = request.IsVirtual;
        var cost = request.Cost;
        var notes = request.Notes ?? "";
        
        Console.WriteLine($"DEBUG: Parsed data - Date: {date}, StartTime: {startTime}, EndTime: {endTime}, IsVirtual: {isVirtual}, Cost: {cost}, Notes: {notes}");
        
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

        Console.WriteLine("DEBUG: Availability inserted successfully");
        return Results.Ok(new { message = "Availability added successfully" });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DEBUG: Exception in availability endpoint: {ex.Message}");
        Console.WriteLine($"DEBUG: Stack trace: {ex.StackTrace}");
        return Results.BadRequest(new { message = "Failed to add availability: " + ex.Message });
    }
});

// Lessons endpoints

app.MapPost("/api/teachers/schedule-lesson", async (HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.BadRequest(new { message = "Teacher profile not found. Please create your profile first." });
        }

        var request = await context.Request.ReadFromJsonAsync<ScheduleLessonRequest>();
        if (request == null)
        {
            return Results.BadRequest(new { message = "Invalid request data" });
        }
        
        Console.WriteLine($"DEBUG: Received lesson scheduling data: Student={request.StudentName}, Instrument={request.Instrument}, Date={request.LessonDate}, Time={request.LessonTime}, Duration={request.Duration}, Type={request.LessonType}, Cost={request.Cost}");
        
        // Calculate end time - work with 12-hour format directly
        var startTime = request.LessonTime ?? "";
        var duration = request.Duration;
        
        Console.WriteLine($"DEBUG: Start time: '{startTime}', Duration: {duration}");
        
        // Parse 12-hour format time (e.g., "3:00 PM")
        var timeParts = startTime.Split(' ');
        var timeOnly = timeParts[0]; // "3:00"
        var period = timeParts.Length > 1 ? timeParts[1] : "AM"; // "PM" or "AM"
        
        Console.WriteLine($"DEBUG: Time only: '{timeOnly}', Period: '{period}'");
        
        var hourMinuteParts = timeOnly.Split(':');
        var hours12 = int.TryParse(hourMinuteParts[0], out int hoursResult) ? hoursResult : 0;
        var minutes = int.TryParse(hourMinuteParts[1], out int minutesResult) ? minutesResult : 0;
        
        Console.WriteLine($"DEBUG: 12-hour: {hours12}, minutes: {minutes}");
        
        // Calculate end time in 12-hour format
        var startMinutes = hours12 * 60 + minutes;
        var endMinutes = startMinutes + duration;
        
        // Handle end time that goes past 12 hours
        var endHours12 = endMinutes / 60;
        var endMins = endMinutes % 60;
        
        // Convert back to 12-hour format
        string endPeriod;
        int finalEndHours;
        
        if (endHours12 >= 12) {
            finalEndHours = endHours12 == 12 ? 12 : endHours12 - 12;
            endPeriod = "PM";
        } else {
            finalEndHours = endHours12 == 0 ? 12 : endHours12;
            endPeriod = "AM";
        }
        
        var endTime = $"{finalEndHours}:{endMins:D2} {endPeriod}";
        
        Console.WriteLine($"DEBUG: Start minutes: {startMinutes}, End minutes: {endMinutes}");
        Console.WriteLine($"DEBUG: Calculated end time: {endTime}");
        Console.WriteLine($"DEBUG: About to insert lesson with TeacherId: {teacherProfile.Id}");
        
        try
        {
            var lessonId = conn.ExecuteScalar<int>(@"
                INSERT INTO Lessons (TeacherId, StudentName, Instrument, LessonDate, StartTime, EndTime, 
                                    LessonType, Cost, Status, Notes)
                VALUES (@TeacherId, @StudentName, @Instrument, @LessonDate, @StartTime, @EndTime, 
                        @LessonType, @Cost, @Status, @Notes);
                SELECT last_insert_rowid();",
                new { 
                    TeacherId = teacherProfile.Id, 
                    StudentName = request.StudentName ?? "",
                    Instrument = request.Instrument ?? "",
                    LessonDate = request.LessonDate ?? "",
                    StartTime = startTime, // Store in 12-hour format like "3:00 PM"
                    EndTime = endTime,     // Store in 12-hour format like "3:30 PM"
                    LessonType = request.LessonType ?? "",
                    Cost = request.Cost,
                    Status = "Pending",
                    Notes = request.Notes ?? ""
                });
            
            Console.WriteLine($"DEBUG: Lesson inserted successfully with ID: {lessonId}");
            
            return Results.Ok(new { message = "Lesson scheduled successfully", lessonId = lessonId });
        }
        catch (Exception dbEx)
        {
            Console.WriteLine($"DEBUG: Database insertion failed: {dbEx.Message}");
            return Results.BadRequest(new { message = "Failed to schedule lesson: " + dbEx.Message });
        }
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to schedule lesson: " + ex.Message });
    }
});

// Lesson confirmation endpoint
app.MapPost("/api/teachers/lessons/{lessonId}/confirm", async (int lessonId, HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        
        // Verify the lesson belongs to this teacher
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.BadRequest(new { message = "Teacher profile not found." });
        }

        // Update lesson status to Confirmed
        var rowsAffected = conn.Execute(@"
            UPDATE Lessons 
            SET Status = 'Confirmed' 
            WHERE Id = @LessonId AND TeacherId = @TeacherId",
            new { LessonId = lessonId, TeacherId = teacherProfile.Id });

        if (rowsAffected == 0)
        {
            return Results.NotFound(new { message = "Lesson not found or you don't have permission to confirm it." });
        }

        return Results.Ok(new { message = "Lesson confirmed successfully" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to confirm lesson: " + ex.Message });
    }
});

// Lesson completion endpoint
app.MapPost("/api/teachers/lessons/{lessonId}/complete", async (int lessonId, HttpContext context) =>
{
    try
    {
        var userId = GetUserId(context);
        if (userId == null) return Results.Unauthorized();

        using var conn = new SqliteConnection(connectionString);
        
        // Verify the lesson belongs to this teacher
        var teacherProfile = conn.QueryFirstOrDefault(@"
            SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
        
        if (teacherProfile == null)
        {
            return Results.BadRequest(new { message = "Teacher profile not found." });
        }

        // Update lesson status to Completed
        var rowsAffected = conn.Execute(@"
            UPDATE Lessons 
            SET Status = 'Completed' 
            WHERE Id = @LessonId AND TeacherId = @TeacherId",
            new { LessonId = lessonId, TeacherId = teacherProfile.Id });

        if (rowsAffected == 0)
        {
            return Results.NotFound(new { message = "Lesson not found or you don't have permission to complete it." });
        }

        return Results.Ok(new { message = "Lesson marked as completed" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = "Failed to complete lesson: " + ex.Message });
    }
});

// Get instruments list
app.MapGet("/api/students/instruments", async () =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        
        // First, ensure the Instruments table exists
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS Instruments (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL UNIQUE,
                Category TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        
        // Clear existing instruments and populate with the 5 we want
        conn.Execute("DELETE FROM Instruments");
        
        // Insert the 5 instruments we want
        var defaultInstruments = new[]
        {
            new { Name = "Piano", Category = "Keyboard" },
            new { Name = "Guitar", Category = "String" },
            new { Name = "Violin", Category = "String" },
            new { Name = "Drums", Category = "Percussion" },
            new { Name = "Voice/Singing", Category = "Vocal" }
        };
        
        foreach (var instrument in defaultInstruments)
        {
            conn.Execute("INSERT INTO Instruments (Name, Category) VALUES (@Name, @Category)", instrument);
        }
        
        var instruments = conn.Query("SELECT Id, Name, Category FROM Instruments ORDER BY Name");
        return Results.Ok(instruments);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DEBUG: Instruments endpoint error: {ex.Message}");
        Console.WriteLine($"DEBUG: Stack trace: {ex.StackTrace}");
        return Results.BadRequest(new { message = "Failed to load instruments: " + ex.Message });
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

// Helper function to get user ID from JWT token
static int? GetUserIdFromToken(HttpContext context)
{
    try
    {
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        if (authHeader?.StartsWith("Bearer ") == true)
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var handler = new JwtSecurityTokenHandler();
            var jsonToken = handler.ReadJwtToken(token);
            
            var userIdClaim = jsonToken.Claims.FirstOrDefault(x => x.Type == "userId");
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error parsing JWT token: {ex.Message}");
    }
    
    return null;
}

// Get all teachers for student browsing
app.MapGet("/api/teachers/all", (HttpContext context) =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        
        // First, ensure the database schema exists
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS Users (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT NOT NULL UNIQUE,
                PasswordHash TEXT NOT NULL,
                Role TEXT NOT NULL CHECK (Role IN ('Admin', 'Teacher', 'Student')),
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                IsActive BOOLEAN DEFAULT 1
            );
        ");
        
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS Teachers (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId INTEGER NOT NULL,
                Name TEXT NOT NULL,
                Bio TEXT,
                HourlyRate DECIMAL(10,2) NOT NULL,
                ContactInfo TEXT,
                PhotoUrl TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
            );
        ");
        
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS Instruments (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL UNIQUE,
                Category TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
        
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS TeacherInstruments (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                TeacherId INTEGER NOT NULL,
                InstrumentId INTEGER NOT NULL,
                ProficiencyLevel TEXT DEFAULT 'Intermediate',
                YearsExperience INTEGER DEFAULT 0,
                FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE,
                FOREIGN KEY (InstrumentId) REFERENCES Instruments(Id) ON DELETE CASCADE,
                UNIQUE(TeacherId, InstrumentId)
            );
        ");
        
        // Insert default instruments if they don't exist
        conn.Execute(@"
            INSERT OR IGNORE INTO Instruments (Name, Category) VALUES 
            ('Piano', 'Keyboard'),
            ('Guitar', 'String'),
            ('Violin', 'String'),
            ('Drums', 'Percussion'),
            ('Voice/Singing', 'Vocal');
        ");
        
        // Create admin user if it doesn't exist
        var adminExists = conn.QuerySingleOrDefault<int>("SELECT COUNT(*) FROM Users WHERE Username = 'admin'");
        if (adminExists == 0)
        {
            var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
            conn.Execute("INSERT INTO Users (Username, PasswordHash, Role) VALUES ('admin', @PasswordHash, 'Admin')", 
                new { PasswordHash = adminPasswordHash });
            Console.WriteLine("Admin user created: admin/admin123");
        }
        
        // Create a test teacher if none exist
        var teacherExists = conn.QuerySingleOrDefault<int>("SELECT COUNT(*) FROM Teachers");
        Console.WriteLine($"Current teacher count: {teacherExists}");
        if (teacherExists == 0)
        {
            try
            {
                // Check if user 's' already exists
                var userExists = conn.QuerySingleOrDefault<int>("SELECT COUNT(*) FROM Users WHERE Username = 's'");
                int userId;
                
                if (userExists == 0)
                {
                    // Create test teacher user
                    var teacherPasswordHash = BCrypt.Net.BCrypt.HashPassword("s");
                    conn.Execute("INSERT INTO Users (Username, PasswordHash, Role) VALUES ('s', @PasswordHash, 'Teacher')", 
                        new { PasswordHash = teacherPasswordHash });
                    
                    userId = conn.QuerySingleOrDefault<int>("SELECT Id FROM Users WHERE Username = 's'");
                    Console.WriteLine($"Created user with ID: {userId}");
                }
                else
                {
                    // User already exists, get their ID
                    userId = conn.QuerySingleOrDefault<int>("SELECT Id FROM Users WHERE Username = 's'");
                    Console.WriteLine($"User 's' already exists with ID: {userId}");
                }
                
                // Check if teacher profile already exists for this user
                var existingTeacher = conn.QuerySingleOrDefault<int>("SELECT COUNT(*) FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
                
                if (existingTeacher == 0)
                {
                    // Create teacher profile
                    conn.Execute("INSERT INTO Teachers (UserId, Name, Bio, HourlyRate, ContactInfo) VALUES (@UserId, @Name, @Bio, @HourlyRate, @ContactInfo)", 
                        new { 
                            UserId = userId, 
                            Name = "Test Teacher", 
                            Bio = "Experienced music teacher", 
                            HourlyRate = 50.00, 
                            ContactInfo = "test@email.com" 
                        });
                    
                    var teacherId = conn.QuerySingleOrDefault<int>("SELECT Id FROM Teachers WHERE UserId = @UserId", new { UserId = userId });
                    Console.WriteLine($"Created teacher with ID: {teacherId}");
                    
                    // Add instruments to teacher
                    conn.Execute("INSERT INTO TeacherInstruments (TeacherId, InstrumentId) VALUES (@TeacherId, 1)", new { TeacherId = teacherId });
                    conn.Execute("INSERT INTO TeacherInstruments (TeacherId, InstrumentId) VALUES (@TeacherId, 2)", new { TeacherId = teacherId });
                }
                else
                {
                    Console.WriteLine($"Teacher profile already exists for user ID: {userId}");
                }
                
                Console.WriteLine("Test teacher setup completed: s/s");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating test teacher: {ex.Message}");
            }
        }
        
        // Debug: Check what's actually in the Teachers table
        var allTeachers = conn.Query("SELECT * FROM Teachers").ToList();
        Console.WriteLine($"Raw Teachers table has {allTeachers.Count} records");
        if (allTeachers.Count > 0)
        {
            var firstTeacher = allTeachers[0];
            Console.WriteLine($"First teacher - Id: {firstTeacher.Id}, Name: {firstTeacher.Name}, UserId: {firstTeacher.UserId}");
        }
        
        // Debug: Check Users table
        var teacherUsers = conn.Query("SELECT * FROM Users WHERE Role = 'Teacher'").ToList();
        Console.WriteLine($"Users with Teacher role: {teacherUsers.Count}");
        
        // Debug: Check the specific user that the teacher references
        var specificUser = conn.Query("SELECT * FROM Users WHERE Id = 9").FirstOrDefault();
        if (specificUser != null)
        {
            Console.WriteLine($"User 9 exists - Username: {specificUser.Username}, Role: {specificUser.Role}");
        }
        else
        {
            Console.WriteLine("User 9 does not exist!");
        }
        
        var teachers = conn.Query(@"
            SELECT 
                t.Id,
                t.Name,
                t.Bio,
                t.HourlyRate as DefaultLessonCost,
                t.ContactInfo,
                u.Username
            FROM Teachers t
            INNER JOIN Users u ON t.UserId = u.Id
            WHERE u.Role = 'Teacher'
        ").ToList();
        
        Console.WriteLine($"Found {teachers.Count} teachers in database");
        
        // If no teachers found but we have teacher records, try to fix the data
        if (teachers.Count == 0 && allTeachers.Count > 0)
        {
            Console.WriteLine("Attempting to fix teacher data...");
            foreach (var teacher in allTeachers)
            {
                // Check if the user exists and has the right role
                var user = conn.Query("SELECT * FROM Users WHERE Id = @UserId", new { UserId = teacher.UserId }).FirstOrDefault();
                if (user != null && user.Role != "Teacher")
                {
                    Console.WriteLine($"Updating user {user.Username} role from {user.Role} to Teacher");
                    conn.Execute("UPDATE Users SET Role = 'Teacher' WHERE Id = @UserId", new { UserId = teacher.UserId });
                }
            }
            
            // Try the query again
            teachers = conn.Query(@"
                SELECT 
                    t.Id,
                    t.Name,
                    t.Bio,
                    t.HourlyRate as DefaultLessonCost,
                    t.ContactInfo,
                    u.Username
                FROM Teachers t
                INNER JOIN Users u ON t.UserId = u.Id
                WHERE u.Role = 'Teacher'
            ").ToList();
            
            Console.WriteLine($"After fix: Found {teachers.Count} teachers in database");
        }

        // Get instruments for each teacher
        var teachersWithInstruments = teachers.Select(teacher => new
        {
            Id = teacher.Id,
            Name = teacher.Name,
            Username = teacher.Username,
            Bio = teacher.Bio,
            DefaultLessonCost = teacher.DefaultLessonCost,
            ContactInfo = teacher.ContactInfo,
            Instruments = conn.Query(@"
                SELECT i.Id, i.Name
                FROM TeacherInstruments ti
                INNER JOIN Instruments i ON ti.InstrumentId = i.Id
                WHERE ti.TeacherId = @TeacherId
            ", new { TeacherId = teacher.Id }).ToList()
        }).ToList();

        return Results.Ok(teachersWithInstruments);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error loading teachers: {ex.Message}");
        return Results.BadRequest(new { message = "Failed to load teachers: " + ex.Message });
    }
});

// Student profile endpoint
app.MapPost("/api/students/profile", async (HttpContext context) =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        
        // Get user ID from JWT token
        var userId = GetUserIdFromToken(context);
        if (userId == null)
        {
            return Results.Unauthorized();
        }
        
        // Ensure Students table exists
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS Students (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId INTEGER NOT NULL,
                Name TEXT NOT NULL,
                ContactInfo TEXT,
                PaymentInfo TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
            );
        ");
        
        var request = await context.Request.ReadFromJsonAsync<StudentProfileRequest>();
        if (request == null)
        {
            return Results.BadRequest(new { message = "Invalid request data" });
        }
        
        // Check if student profile already exists
        var existingStudent = conn.QuerySingleOrDefault<int>("SELECT COUNT(*) FROM Students WHERE UserId = @UserId", new { UserId = userId });
        
        if (existingStudent > 0)
        {
            // Update existing student profile
            conn.Execute(@"
                UPDATE Students 
                SET Name = @Name, ContactInfo = @ContactInfo, PaymentInfo = @PaymentInfo 
                WHERE UserId = @UserId
            ", new { 
                UserId = userId, 
                Name = request.Name, 
                ContactInfo = request.ContactInfo, 
                PaymentInfo = request.PaymentInfo 
            });
        }
        else
        {
            // Create new student profile
            conn.Execute(@"
                INSERT INTO Students (UserId, Name, ContactInfo, PaymentInfo) 
                VALUES (@UserId, @Name, @ContactInfo, @PaymentInfo)
            ", new { 
                UserId = userId, 
                Name = request.Name, 
                ContactInfo = request.ContactInfo, 
                PaymentInfo = request.PaymentInfo 
            });
        }
        
        return Results.Ok(new { message = "Student profile saved successfully" });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error saving student profile: {ex.Message}");
        return Results.BadRequest(new { message = "Failed to save student profile: " + ex.Message });
    }
});

// Get student profile endpoint
app.MapGet("/api/students/my-profile", (HttpContext context) =>
{
    try
    {
        using var conn = new SqliteConnection(connectionString);
        
        // Get user ID from JWT token
        var userId = GetUserIdFromToken(context);
        if (userId == null)
        {
            return Results.Unauthorized();
        }
        
        // Ensure Students table exists
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS Students (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId INTEGER NOT NULL,
                Name TEXT NOT NULL,
                ContactInfo TEXT,
                PaymentInfo TEXT,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
            );
        ");
        
        var student = conn.QuerySingleOrDefault(@"
            SELECT s.Name, s.ContactInfo, s.PaymentInfo, u.Username
            FROM Students s
            INNER JOIN Users u ON s.UserId = u.Id
            WHERE s.UserId = @UserId
        ", new { UserId = userId });
        
        if (student == null)
        {
            return Results.NotFound(new { message = "Student profile not found" });
        }
        
        return Results.Ok(student);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error loading student profile: {ex.Message}");
        return Results.BadRequest(new { message = "Failed to load student profile: " + ex.Message });
    }
});

app.Run();

// Request/Response models
public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password, string Role, string Name, string? HourlyRate, string? Description, string? Instruments, string? Instrument, string? Level);
public record AvailabilityRequest(string? Date, string? StartTime, string? EndTime, bool IsVirtual, decimal Cost, string? Notes);
public record ScheduleLessonRequest(string? StudentName, string? Instrument, string? LessonDate, string? LessonTime, int Duration, string? LessonType, decimal Cost, string? Notes);
public record StudentProfileRequest(string Name, string ContactInfo, string PaymentInfo);