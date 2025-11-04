# Freelance Music Platform

A full-stack web application that connects music teachers with students for private music lessons. Built with .NET API backend, SQLite database, and Bootstrap frontend.

## Quick Start

### Setup and Run

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Application:**
   ```bash
   npm start
   ```
   This will start both the frontend server (http://localhost:8080) and the backend API (http://localhost:5000).

3. **Login:**
   - Open your browser to `http://localhost:8080`
   - **Admin Login:** username: `admin`, password: `password123`
   - Teacher Login: username: `teacher1`, password: `password123`
   - Student Login: username: `student1`, password: `password123`

## Project Overview

Freelance Music (FM) is a platform where teachers offer music lessons and students book them. The platform takes a small percentage of each lesson booking fee for providing the service.

### User Roles
- **Admin**: View all bookings, generate reports, manage platform
- **Teacher**: Create profiles, schedule availability, manage lessons
- **Student**: Browse teachers, book lessons, manage bookings

## Technology Stack

### Frontend
- **HTML/CSS**: Single-page application with Bootstrap 5.x
- **JavaScript**: Vanilla JavaScript (ES6+) with DOM manipulation
- **Styling**: Bootstrap 5.x from CDN
- **Charts**: Chart.js for reporting

### Backend
- **Framework**: .NET 8.0 Web API
- **Language**: C#
- **Database**: SQLite with direct SQL queries
- **Authentication**: JWT Bearer tokens
- **Architecture**: RESTful API design

### Database
- **Type**: SQLite database
- **Location**: `/api/database.db`
- **Access**: Direct SQL queries (no ORM)

## Project Structure

```
Client/
├── index.html                 # Main SPA entry point
├── resources/
│   ├── styles/
│   │   └── index.css         # Custom styles
│   └── scripts/
│       └── index.js          # Frontend JavaScript
├── api/                      # Backend .NET API
│   ├── Controllers/          # API Controllers
│   ├── Models/              # Data Models
│   ├── Services/            # Business Logic
│   ├── database.db          # SQLite Database
│   ├── DatabaseSchema.sql   # Database Schema
│   ├── appsettings.json     # Configuration
│   ├── Program.cs           # Application Entry Point
│   └── FreelanceMusicAPI.csproj
└── Assignment/              # Project Requirements
    ├── Powerpoint/          # PowerPoint Screenshots
    └── Requirements/         # Requirements Screenshots
```

## Database Schema

### Core Tables
- **Users**: Authentication and user management
- **Teachers**: Teacher profiles and information
- **Students**: Student profiles and payment info
- **Instruments**: Available instruments for teaching
- **TeacherInstruments**: Many-to-many relationship
- **AvailabilitySlots**: Teacher's available time slots
- **Bookings**: Lesson bookings and transactions
- **Payments**: Payment processing and platform fees
- **Referrals**: Student referral tracking

### Demo Data
The database includes seeded demo users:
- **Admin**: username: `admin`, password: `password123`
- **Teacher**: username: `teacher1`, password: `password123`
- **Student**: username: `student1`, password: `password123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

### Teachers
- `GET /api/teachers` - Get all teachers
- `GET /api/teachers/{id}` - Get teacher by ID
- `POST /api/teachers/profile` - Create/update teacher profile
- `GET /api/teachers/my-profile` - Get current teacher profile
- `POST /api/teachers/availability` - Add availability slot
- `GET /api/teachers/availability` - Get teacher availability
- `GET /api/teachers/my-lessons` - Get teacher's lessons

### Students
- `POST /api/students/profile` - Create/update student profile
- `GET /api/students/my-profile` - Get current student profile
- `GET /api/students/my-bookings` - Get student bookings
- `GET /api/students/instruments` - Get all instruments
- `GET /api/students/teachers/by-instrument/{id}` - Search teachers by instrument
- `GET /api/students/availability/{teacherId}` - Get teacher availability
- `POST /api/students/book` - Book a lesson
- `POST /api/students/cancel/{id}` - Cancel booking
- `POST /api/students/validate-card` - Validate payment card

### Reports (Admin Only)
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/referrals` - Referral sources report
- `GET /api/reports/popular-instruments` - Popular instruments report
- `GET /api/reports/lessons-booked` - All bookings report
- `GET /api/reports/users-joined` - User registration report
- `GET /api/reports/repeat-lessons` - Repeat customers report
- `GET /api/reports/revenue-distribution/instrument` - Revenue by instrument
- `GET /api/reports/revenue-distribution/student` - Revenue by student

## MoSCoW Requirements Checklist

### MUST HAVE (Core Features)

#### Admin Portal (HLR 1)
- [x] **1.1 Revenue Report** - Revenue per quarter on bar chart
- [x] **1.1.2 Referral Report** - Breakdown of "how students heard about FM"
- [x] **1.2 Popular Instruments** - Report of most-booked instruments
- [x] **1.3.1 Lessons Booked** - Bookings table view

#### Teacher Portal (HLR 2)
- [x] **2.1 Create Teacher Profile** - Name, instruments taught, rate, photo, bio
- [x] **2.2.1 Revenue Per Lesson** - Schedule flat-rate lessons
- [x] **2.3.1 Schedule Availability** - 30-minute slots
- [x] **2.4 View Lessons** - Teacher sees booked lessons

#### Student Portal (HLR 3)
- [x] **3.1 Create Student Profile** - Name, email, instrument interest, level
- [x] **3.2.1 Schedule Lessons** - Book from availability table view

### SHOULD HAVE (Enhanced Features)

#### Admin Portal
- [x] **1.3.2 Lessons Booked** - Bookings calendar view
- [x] **1.4 Users Joined** - Count users who created accounts
- [x] **1.5 Repeat Lessons** - Count students with multiple lessons

#### Student Portal
- [x] **3.2.2 Schedule Lessons** - Book from calendar view
- [x] **3.3 Select Lesson Type** - In-person or virtual

### COULD HAVE (Advanced Features)

#### Admin Portal
- [ ] **1.6.1 Revenue Distribution by Instrument** - Which instruments drive most revenue
- [ ] **1.6.2 Revenue Distribution by Student** - Which students drive most revenue

#### Teacher Portal
- [ ] **2.2.2 Revenue Per Lesson** - Teacher sets custom cost per lesson
- [ ] **2.3.2 Schedule Availability** - Flexible durations (45m, 60m, etc.)

#### Student Portal
- [ ] **3.4 Search by Instrument** - Filter by instrument; only show matching teachers
- [ ] **3.5 Recurring Lessons** - Weekly/bi-weekly frequency; auto-generate series
- [ ] **3.6 Add Sheet Music** - Student uploads PDF/image to booking

#### Payments (HLR 4)
- [ ] **4.1 Verify Card Information** - Mock validation with Luhn check and expiry validation

## Acceptance Criteria

### Revenue Distribution
- [ ] Show % contributions for instruments/students
- [ ] Highlight top contributors (50% threshold)
- [ ] Data reconciles with booking transactions

### Custom Lesson Cost
- [ ] Teacher can set custom per-lesson cost
- [ ] Cost persists and is visible to both parties
- [ ] Applied to transaction calculations

### Flexible Durations
- [ ] Allow 45m and 60m durations (extensible)
- [ ] Pricing scales accordingly
- [ ] Beyond 30m default

### Search by Instrument
- [ ] Results strictly limited to teachers teaching that instrument
- [ ] Filter functionality works correctly

### Recurring Lessons
- [ ] Choosing frequency generates future instances
- [ ] User can cancel single occurrence within series
- [ ] Proper scheduling logic

### Sheet Music Uploads
- [ ] Accept PDF and common image formats
- [ ] File attached to booking
- [ ] Teacher has read access

### Card Verification
- [ ] Run Luhn + expiry + format validation
- [ ] Surface clear errors on invalid
- [ ] Proceed to mock authorization on valid

## Getting Started

### Prerequisites
- .NET 8.0 SDK
- Modern web browser
- SQLite (included with .NET)

### Running the Application

1. **Start the API Backend:**
   ```bash
   cd api
   dotnet run
   ```
   The API will be available at `http://localhost:5000`

2. **Open the Frontend:**
   Open `index.html` in a web browser or serve it with a local server.

3. **Login with Demo Users:**
   - Admin: `admin` / `password123`
   - Teacher: `teacher1` / `password123`
   - Student: `student1` / `password123`

### Development

#### Database Setup
The database is automatically initialized when the API starts. The schema is defined in `DatabaseSchema.sql` and includes demo data.

#### API Development
- Controllers handle HTTP requests
- Services contain business logic
- Models define data structures
- DatabaseService handles SQLite operations

#### Frontend Development
- Single-page application with role-based navigation
- Bootstrap 5.x for responsive design
- Chart.js for data visualization
- Vanilla JavaScript for API communication

## Features Implemented

### ✅ Completed Features
- User authentication and role-based access
- Teacher profile creation and management
- Student profile creation and management
- Availability scheduling (30-minute slots)
- Lesson booking system
- Payment processing simulation
- Admin reporting dashboard
- Revenue, referral, and popular instruments reports
- Responsive Bootstrap UI
- SQLite database with comprehensive schema

### 🚧 In Progress
- Calendar views for bookings
- Advanced reporting features
- Card validation system

### 📋 Planned
- Flexible lesson durations
- Custom lesson pricing
- Recurring lesson series
- Sheet music uploads
- Advanced search and filtering
- Revenue distribution analytics

## Testing

### Manual Testing
1. Register new users with different roles
2. Create teacher profiles with instruments
3. Schedule availability slots
4. Book lessons as a student
5. View reports as an admin
6. Test payment validation

### API Testing
Use tools like Postman or curl to test API endpoints:
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

## Deployment

### Production Considerations
- Use environment variables for sensitive configuration
- Implement proper error handling and logging
- Set up HTTPS for production
- Configure CORS for production domains
- Use a production database (PostgreSQL/MySQL)
- Implement proper backup strategies

## Contributing

1. Follow the existing code structure
2. Use meaningful variable and function names
3. Add comments for complex logic
4. Test all new features
5. Update documentation as needed

## License

This project is part of MIS 321 coursework. All rights reserved.

## Contact

For questions about this project, please contact the development team.

---

**Note**: This is a case study project for MIS 321. The business (Freelance Music) is fictional and used for educational purposes only.
