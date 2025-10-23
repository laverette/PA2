-- Freelance Music Platform Database Schema
-- SQLite Database for FM Platform

-- Users table (base authentication)
CREATE TABLE Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    Email TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    Role TEXT NOT NULL CHECK (Role IN ('Admin', 'Teacher', 'Student')),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT 1
);

-- Teachers table (extends Users)
CREATE TABLE Teachers (
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

-- Students table (extends Users)
CREATE TABLE Students (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    ContactInfo TEXT,
    PaymentInfo TEXT, -- JSON string for card details
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Instruments table
CREATE TABLE Instruments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL UNIQUE,
    Category TEXT, -- e.g., 'String', 'Wind', 'Percussion'
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TeacherInstruments (Many-to-Many relationship)
CREATE TABLE TeacherInstruments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TeacherId INTEGER NOT NULL,
    InstrumentId INTEGER NOT NULL,
    ProficiencyLevel TEXT DEFAULT 'Intermediate', -- Beginner, Intermediate, Advanced, Expert
    YearsExperience INTEGER DEFAULT 0,
    FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE,
    FOREIGN KEY (InstrumentId) REFERENCES Instruments(Id) ON DELETE CASCADE,
    UNIQUE(TeacherId, InstrumentId)
);

-- Availability Slots (Teacher's available times)
CREATE TABLE AvailabilitySlots (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TeacherId INTEGER NOT NULL,
    Date DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    IsVirtual BOOLEAN DEFAULT 0,
    MaxDuration INTEGER DEFAULT 30, -- minutes
    IsAvailable BOOLEAN DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE Bookings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    StudentId INTEGER NOT NULL,
    TeacherId INTEGER NOT NULL,
    AvailabilitySlotId INTEGER NOT NULL,
    InstrumentId INTEGER NOT NULL,
    LessonType TEXT NOT NULL CHECK (LessonType IN ('In-Person', 'Virtual')),
    Duration INTEGER NOT NULL DEFAULT 30, -- minutes
    CustomCost DECIMAL(10,2), -- NULL means use teacher's default rate
    TotalCost DECIMAL(10,2) NOT NULL,
    Status TEXT NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
    PaymentStatus TEXT NOT NULL DEFAULT 'Pending' CHECK (PaymentStatus IN ('Pending', 'Authorized', 'Completed', 'Failed')),
    BookingDate DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentId) REFERENCES Students(Id) ON DELETE CASCADE,
    FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE,
    FOREIGN KEY (AvailabilitySlotId) REFERENCES AvailabilitySlots(Id) ON DELETE CASCADE,
    FOREIGN KEY (InstrumentId) REFERENCES Instruments(Id) ON DELETE CASCADE
);

-- Recurring Bookings (for recurring lesson series)
CREATE TABLE RecurringBookings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    StudentId INTEGER NOT NULL,
    TeacherId INTEGER NOT NULL,
    InstrumentId INTEGER NOT NULL,
    LessonType TEXT NOT NULL,
    Duration INTEGER NOT NULL,
    CustomCost DECIMAL(10,2),
    Frequency TEXT NOT NULL CHECK (Frequency IN ('Weekly', 'Bi-Weekly', 'Monthly')),
    StartDate DATE NOT NULL,
    EndDate DATE,
    IsActive BOOLEAN DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentId) REFERENCES Students(Id) ON DELETE CASCADE,
    FOREIGN KEY (TeacherId) REFERENCES Teachers(Id) ON DELETE CASCADE,
    FOREIGN KEY (InstrumentId) REFERENCES Instruments(Id) ON DELETE CASCADE
);

-- Booking Occurrences (individual instances of recurring bookings)
CREATE TABLE BookingOccurrences (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    RecurringBookingId INTEGER NOT NULL,
    AvailabilitySlotId INTEGER NOT NULL,
    OccurrenceDate DATE NOT NULL,
    Status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (Status IN ('Scheduled', 'Completed', 'Cancelled')),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (RecurringBookingId) REFERENCES RecurringBookings(Id) ON DELETE CASCADE,
    FOREIGN KEY (AvailabilitySlotId) REFERENCES AvailabilitySlots(Id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE Payments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BookingId INTEGER NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    PlatformFee DECIMAL(10,2) NOT NULL, -- FM's cut
    TeacherAmount DECIMAL(10,2) NOT NULL,
    PaymentMethod TEXT NOT NULL,
    TransactionId TEXT,
    Status TEXT NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Authorized', 'Completed', 'Failed', 'Refunded')),
    ProcessedAt DATETIME,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingId) REFERENCES Bookings(Id) ON DELETE CASCADE
);

-- Referrals table (for referral tracking)
CREATE TABLE Referrals (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    StudentId INTEGER NOT NULL,
    ReferralSource TEXT NOT NULL, -- 'Social Media', 'Friend', 'Search Engine', 'Advertisement', etc.
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentId) REFERENCES Students(Id) ON DELETE CASCADE
);

-- Sheet Music Files (for student uploads)
CREATE TABLE SheetMusicFiles (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BookingId INTEGER NOT NULL,
    FileName TEXT NOT NULL,
    FilePath TEXT NOT NULL,
    FileSize INTEGER NOT NULL,
    MimeType TEXT NOT NULL,
    UploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingId) REFERENCES Bookings(Id) ON DELETE CASCADE
);

-- Reports Cache (for performance optimization)
CREATE TABLE ReportsCache (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ReportType TEXT NOT NULL,
    ReportData TEXT NOT NULL, -- JSON string
    GeneratedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt DATETIME NOT NULL
);

-- Insert default instruments
INSERT INTO Instruments (Name, Category) VALUES 
('Piano', 'Keyboard'),
('Guitar', 'String'),
('Violin', 'String'),
('Drums', 'Percussion'),
('Voice/Singing', 'Vocal'),
('Bass Guitar', 'String'),
('Saxophone', 'Wind'),
('Trumpet', 'Wind'),
('Flute', 'Wind'),
('Cello', 'String');

-- Insert demo users (password: 'password123' hashed)
INSERT INTO Users (Username, Email, PasswordHash, Role) VALUES 
('admin', 'admin@fm.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin'),
('teacher1', 'teacher1@fm.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Teacher'),
('teacher2', 'teacher2@fm.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Teacher'),
('student1', 'student1@fm.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Student'),
('student2', 'student2@fm.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Student');

-- Insert demo teachers
INSERT INTO Teachers (UserId, Name, Bio, HourlyRate, ContactInfo) VALUES 
(2, 'Sarah Johnson', 'Professional pianist with 10+ years teaching experience. Specializes in classical and jazz.', 75.00, 'sarah.johnson@email.com'),
(3, 'Mike Chen', 'Guitar instructor and session musician. Teaches rock, blues, and acoustic styles.', 60.00, 'mike.chen@email.com');

-- Insert demo students
INSERT INTO Students (UserId, Name, ContactInfo) VALUES 
(4, 'Alex Smith', 'alex.smith@email.com'),
(5, 'Emma Davis', 'emma.davis@email.com');

-- Insert teacher instruments
INSERT INTO TeacherInstruments (TeacherId, InstrumentId, ProficiencyLevel, YearsExperience) VALUES 
(1, 1, 'Expert', 10), -- Sarah teaches Piano
(2, 2, 'Expert', 8);  -- Mike teaches Guitar

-- Insert demo availability slots
INSERT INTO AvailabilitySlots (TeacherId, Date, StartTime, EndTime, IsVirtual, IsAvailable) VALUES 
(1, '2024-10-25', '09:00', '09:30', 0, 1),
(1, '2024-10-25', '10:00', '10:30', 1, 1),
(1, '2024-10-26', '14:00', '14:30', 0, 1),
(2, '2024-10-25', '15:00', '15:30', 0, 1),
(2, '2024-10-26', '11:00', '11:30', 1, 1);

-- Insert demo referrals
INSERT INTO Referrals (StudentId, ReferralSource) VALUES 
(1, 'Social Media'),
(1, 'Friend'),
(2, 'Search Engine'),
(2, 'Advertisement');
