// Freelance Music Platform - Frontend JavaScript
// Global variables
let currentUser = null;
let authToken = null;
const API_BASE_URL = 'http://localhost:5000/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateNavigation();
        showDashboard();
    } else {
        showHomePage();
    }
    
    // Set up form event listeners
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Teacher profile form
    document.getElementById('teacherProfileForm').addEventListener('submit', handleTeacherProfile);
    
    // Student profile form
    document.getElementById('studentProfileForm').addEventListener('submit', handleStudentProfile);
    
    // Availability form
    document.getElementById('availabilityForm').addEventListener('submit', handleAddAvailability);
    
    // Teacher photo preview
    document.getElementById('teacherPhoto').addEventListener('change', handlePhotoPreview);
    
    // Schedule lesson form
    document.getElementById('scheduleLessonForm').addEventListener('submit', handleScheduleLesson);
    
    // Cost preview for lesson scheduling
    document.getElementById('lessonCost').addEventListener('input', updateCostPreview);
    document.getElementById('lessonDuration').addEventListener('change', updateCostSummary);
    
    // Availability form enhancements
    document.getElementById('availabilityStart').addEventListener('change', calculateEndTime);
    document.getElementById('availabilityDuration').addEventListener('change', calculateEndTime);
    document.getElementById('availabilityCost').addEventListener('input', loadDefaultAvailabilityCost);
    
    // Lesson search and filtering
    document.getElementById('lessonSearch').addEventListener('input', filterLessons);
    document.getElementById('lessonStatusFilter').addEventListener('change', filterLessons);
}

// Navigation Functions
function showHomePage() {
    hideAllPages();
    document.getElementById('homePage').classList.remove('hidden');
    updateNavigation();
}

function showLoginPage() {
    hideAllPages();
    document.getElementById('loginPage').classList.remove('hidden');
}

function showRegisterPage(role = '') {
    hideAllPages();
    document.getElementById('registerPage').classList.remove('hidden');
    if (role) {
        document.getElementById('registerRole').value = role;
    }
}

function showAdminDashboard() {
    hideAllPages();
    document.getElementById('adminDashboard').classList.remove('hidden');
    loadAdminReports();
}

function showTeacherDashboard() {
    hideAllPages();
    document.getElementById('teacherDashboard').classList.remove('hidden');
    loadTeacherData();
}

function showStudentDashboard() {
    hideAllPages();
    document.getElementById('studentDashboard').classList.remove('hidden');
    loadStudentData();
}

function showBrowsePage() {
    hideAllPages();
    document.getElementById('browsePage').classList.remove('hidden');
    loadGuestTeachers();
}

function showDashboard() {
    if (!currentUser) {
        showHomePage();
        return;
    }
    
    switch (currentUser.role) {
        case 'Admin':
            showAdminDashboard();
            break;
        case 'Teacher':
            showTeacherDashboard();
            break;
        case 'Student':
            showStudentDashboard();
            break;
        default:
            showHomePage();
    }
}

function hideAllPages() {
    const pages = ['homePage', 'loginPage', 'registerPage', 'adminDashboard', 'teacherDashboard', 'studentDashboard', 'browsePage'];
    pages.forEach(page => {
        document.getElementById(page).classList.add('hidden');
    });
}

function updateNavigation() {
    const loginNav = document.getElementById('loginNav');
    const registerNav = document.getElementById('registerNav');
    const userNav = document.getElementById('userNav');
    const adminNav = document.getElementById('adminNav');
    const teacherNav = document.getElementById('teacherNav');
    const studentNav = document.getElementById('studentNav');
    
    if (currentUser) {
        loginNav.style.display = 'none';
        registerNav.style.display = 'none';
        userNav.style.display = 'block';
        document.getElementById('userName').textContent = currentUser.username;
        
        // Show role-specific navigation
        adminNav.style.display = currentUser.role === 'Admin' ? 'block' : 'none';
        teacherNav.style.display = currentUser.role === 'Teacher' ? 'block' : 'none';
        studentNav.style.display = currentUser.role === 'Student' ? 'block' : 'none';
    } else {
        loginNav.style.display = 'block';
        registerNav.style.display = 'block';
        userNav.style.display = 'none';
        adminNav.style.display = 'none';
        teacherNav.style.display = 'none';
        studentNav.style.display = 'none';
    }
}

// Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            authToken = data.token;
            currentUser = {
                id: data.userId,
                username: username,
                role: data.role
            };
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateNavigation();
            showDashboard();
        } else {
            alert('Login failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please check if the API server is running on http://localhost:5000');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            showLoginPage();
        } else {
            alert('Registration failed: ' + data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateNavigation();
    showHomePage();
}

// API Helper Functions
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('Sending request with token:', authToken.substring(0, 20) + '...');
        console.log('Current user:', currentUser);
    } else {
        console.log('No auth token available');
        console.log('Current user:', currentUser);
    }
    
    const config = {
        method,
        headers
    };
    
    if (body) {
        config.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
    }
    
    return response.json();
}

// Admin Functions
async function loadAdminReports() {
    try {
        // Load revenue report
        const revenueData = await apiCall('/reports/revenue?period=quarter');
        createRevenueChart(revenueData);
        
        // Load referral report
        const referralData = await apiCall('/reports/referrals');
        createReferralChart(referralData);
        
        // Load popular instruments
        const instrumentsData = await apiCall('/reports/popular-instruments');
        createInstrumentsChart(instrumentsData);
        
        // Load revenue by instrument
        const revenueByInstrumentData = await apiCall('/reports/revenue-by-instrument');
        createRevenueByInstrumentChart(revenueByInstrumentData);
        
        // Load revenue distribution by instrument
        const instrumentDistributionData = await apiCall('/reports/revenue-distribution-instrument');
        createRevenueDistributionInstrumentChart(instrumentDistributionData);
        
        // Load revenue distribution by student
        const studentDistributionData = await apiCall('/reports/revenue-distribution-student');
        createRevenueDistributionStudentChart(studentDistributionData);
        
        // Load bookings
        const bookingsData = await apiCall('/reports/lessons-booked');
        populateBookingsTable(bookingsData);
        
        // Load user statistics
        await loadUserStatistics();
        
    } catch (error) {
        console.error('Error loading admin reports:', error);
        alert('Failed to load reports. Please try again.');
    }
}

// User Statistics Functions
async function loadUserStatistics() {
    try {
        // Load total users
        const usersData = await apiCall('/reports/users-joined');
        document.getElementById('totalUsers').textContent = usersData.totalUsers;
        
        // Load repeat students
        const repeatData = await apiCall('/reports/repeat-students');
        document.getElementById('repeatStudents').textContent = repeatData.count;
        populateRepeatStudentsTable(repeatData.data);
        
        // Load top contributors
        const contributorsData = await apiCall('/reports/top-contributors');
        document.getElementById('topContributors').textContent = contributorsData.count;
        populateTopContributorsTable(contributorsData.data);
        
    } catch (error) {
        console.error('Error loading user statistics:', error);
        alert('Failed to load user statistics. Please try again.');
    }
}

function populateRepeatStudentsTable(data) {
    const tbody = document.querySelector('#repeatStudentsTable tbody');
    tbody.innerHTML = '';
    
    data.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.studentName}</td>
            <td>${student.lessonsBooked}</td>
            <td>$${student.totalSpent}</td>
        `;
        tbody.appendChild(row);
    });
}

function populateTopContributorsTable(data) {
    const tbody = document.querySelector('#topContributorsTable tbody');
    tbody.innerHTML = '';
    
    data.forEach(contributor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contributor.studentName}</td>
            <td>$${contributor.revenueGenerated}</td>
            <td>${contributor.percentage}%</td>
        `;
        tbody.appendChild(row);
    });
}

function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.data.map(item => item.quarter),
            datasets: [{
                label: 'Revenue ($)',
                data: data.data.map(item => item.revenue),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createReferralChart(data) {
    const ctx = document.getElementById('referralChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.data.map(item => item.referralSource),
            datasets: [{
                data: data.data.map(item => item.count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createInstrumentsChart(data) {
    const ctx = document.getElementById('instrumentsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.data.map(item => item.instrument),
            datasets: [{
                label: 'Bookings',
                data: data.data.map(item => item.bookings),
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createRevenueByInstrumentChart(data) {
    const ctx = document.getElementById('revenueByInstrumentChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.data.map(item => item.instrument),
            datasets: [{
                data: data.data.map(item => item.revenue),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = data.data[context.dataIndex];
                            return `${item.instrument}: $${item.revenue.toFixed(2)} (${item.percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createRevenueDistributionInstrumentChart(data) {
    const ctx = document.getElementById('revenueDistributionInstrumentChart').getContext('2d');
    
    // Separate data for top 50% and others
    const top50Data = data.data.filter(item => item.isInTop50);
    const otherData = data.data.filter(item => !item.isInTop50);
    
    const labels = [...top50Data.map(item => item.instrument), ...otherData.map(item => item.instrument)];
    const values = [...top50Data.map(item => item.revenue), ...otherData.map(item => item.revenue)];
    const colors = [
        ...top50Data.map(() => 'rgba(40, 167, 69, 0.8)'), // Green for top 50%
        ...otherData.map(() => 'rgba(108, 117, 125, 0.8)') // Gray for others
    ];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = data.data[context.dataIndex];
                            const isTop50 = item.isInTop50;
                            return `${item.instrument}: $${item.revenue.toFixed(2)} (${item.percentage}%) ${isTop50 ? '✓ Top 50%' : ''}`;
                        }
                    }
                }
            }
        }
    });
    
    // Update summary
    const summaryContainer = document.getElementById('instrumentDistributionSummary');
    summaryContainer.innerHTML = `
        <div class="alert alert-info">
            <h6><i class="bi bi-info-circle"></i> 50% Revenue Analysis</h6>
            <p class="mb-1"><strong>Top ${data.instrumentsInTop50} instruments</strong> contribute to <strong>${data.cumulativePercentage}%</strong> of total revenue.</p>
            <p class="mb-0"><strong>Total Revenue:</strong> $${data.totalRevenue.toLocaleString()} | <strong>50% Target:</strong> $${data.targetRevenue.toLocaleString()}</p>
        </div>
    `;
}

function createRevenueDistributionStudentChart(data) {
    const ctx = document.getElementById('revenueDistributionStudentChart').getContext('2d');
    
    // Separate data for top 50% and others
    const top50Data = data.data.filter(item => item.isInTop50);
    const otherData = data.data.filter(item => !item.isInTop50);
    
    const labels = [...top50Data.map(item => item.studentName), ...otherData.map(item => item.studentName)];
    const values = [...top50Data.map(item => item.revenueGenerated), ...otherData.map(item => item.revenueGenerated)];
    const colors = [
        ...top50Data.map(() => 'rgba(220, 53, 69, 0.8)'), // Red for top 50%
        ...otherData.map(() => 'rgba(108, 117, 125, 0.8)') // Gray for others
    ];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = data.data[context.dataIndex];
                            const isTop50 = item.isInTop50;
                            return `${item.studentName}: $${item.revenueGenerated.toFixed(2)} (${item.percentage}%) ${isTop50 ? '✓ Top 50%' : ''}`;
                        }
                    }
                }
            }
        }
    });
    
    // Update summary
    const summaryContainer = document.getElementById('studentDistributionSummary');
    summaryContainer.innerHTML = `
        <div class="alert alert-warning">
            <h6><i class="bi bi-people"></i> 50% Revenue Analysis</h6>
            <p class="mb-1"><strong>Top ${data.studentsInTop50} students</strong> contribute to <strong>${data.cumulativePercentage}%</strong> of total revenue.</p>
            <p class="mb-0"><strong>Total Revenue:</strong> $${data.totalRevenue.toLocaleString()} | <strong>50% Target:</strong> $${data.targetRevenue.toLocaleString()}</p>
        </div>
    `;
}

function populateBookingsTable(data) {
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = '';
    
    data.data.forEach(booking => {
        const row = document.createElement('tr');
        // Determine badge color based on status
        let badgeClass = 'secondary';
        if (booking.status === 'Completed') {
            badgeClass = 'success'; // Green
        } else if (booking.status === 'Pending') {
            badgeClass = 'warning'; // Yellow
        } else if (booking.status === 'Confirmed') {
            badgeClass = 'confirmed'; // Purple (custom class)
        }
        
        row.innerHTML = `
            <td>${booking.studentName}</td>
            <td>${booking.teacherName}</td>
            <td>${booking.instrument}</td>
            <td>${new Date(booking.lessonDate).toLocaleDateString()}</td>
            <td>$${booking.totalCost}</td>
            <td><span class="badge bg-${badgeClass}">${booking.status}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    // Also populate the calendar
    populateBookingsCalendar(data.data);
}

function populateBookingsCalendar(bookings) {
    const calendarContainer = document.getElementById('bookingsCalendar');
    calendarContainer.innerHTML = '';
    
    // Create calendar for October 2025
    const year = 2025;
    const month = 9; // October (0-indexed)
    
    const calendar = document.createElement('table');
    calendar.className = 'calendar';
    
    // Create header
    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.appendChild(th);
    });
    header.appendChild(headerRow);
    calendar.appendChild(header);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Create calendar rows
    let currentDate = 1;
    const weeksInMonth = Math.ceil((startingDayOfWeek + daysInMonth) / 7);
    
    for (let week = 0; week < weeksInMonth; week++) {
        const row = document.createElement('tr');
        
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('td');
            
            if (week === 0 && day < startingDayOfWeek) {
                // Empty cells before first day of month
                cell.innerHTML = '';
            } else if (currentDate <= daysInMonth) {
                // Day cell
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = currentDate;
                cell.appendChild(dayNumber);
                
                // Add bookings for this date
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
                const dayBookings = bookings.filter(booking => {
                    const bookingDate = new Date(booking.lessonDate);
                    return bookingDate.toISOString().split('T')[0] === dateStr;
                });
                
                // Add has-bookings class if there are bookings
                if (dayBookings.length > 0) {
                    cell.classList.add('has-bookings');
                }
                
                // Check if this is today's date
                const today = new Date();
                const isToday = today.getFullYear() === year && 
                               today.getMonth() === month && 
                               today.getDate() === currentDate;
                if (isToday) {
                    cell.classList.add('today');
                }
                
                dayBookings.forEach(booking => {
                    const bookingItem = document.createElement('div');
                    bookingItem.className = `booking-item ${booking.status.toLowerCase()}`;
                    bookingItem.innerHTML = `
                        <div><strong>${booking.studentName}</strong></div>
                        <div>${booking.teacherName} - ${booking.instrument}</div>
                        <div>$${booking.totalCost}</div>
                    `;
                    bookingItem.title = `${booking.studentName} with ${booking.teacherName} - ${booking.instrument} - $${booking.totalCost}`;
                    cell.appendChild(bookingItem);
                });
                
                currentDate++;
            }
            
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    }
    
    calendar.appendChild(tbody);
    calendarContainer.appendChild(calendar);
}

// Teacher Functions
async function loadTeacherData() {
    try {
        // Load teacher profile from API
        const profile = await apiCall('/teachers/my-profile');
        if (profile) {
            populateTeacherProfile(profile);
        }
        
        // Load availability from API
        const availability = await apiCall('/teachers/availability');
        window.allAvailability = availability;
        populateAvailabilityList(availability);
        
        // Load lessons from API
        const lessons = await apiCall('/teachers/my-lessons');
        window.allLessons = lessons;
        populateTeacherLessons(lessons);
        
    } catch (error) {
        console.error('Error loading teacher data:', error);
        alert('Failed to load teacher data. Please try again.');
    }
}

function populateTeacherProfile(profile) {
    document.getElementById('teacherName').value = profile.Name || '';
    document.getElementById('teacherBio').value = profile.Bio || '';
    document.getElementById('defaultLessonCost').value = profile.DefaultLessonCost || '';
    document.getElementById('teacherContact').value = profile.ContactInfo || '';
    
    // Handle photo preview if saved
    if (profile.PhotoUrl) {
        const preview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');
        previewImage.src = profile.PhotoUrl;
        preview.style.display = 'block';
    }
    
    
    // Load default cost into schedule lesson form
    loadDefaultLessonCost();
}

async function handleTeacherProfile(event) {
    event.preventDefault();
    
    const name = document.getElementById('teacherName').value;
    const bio = document.getElementById('teacherBio').value;
    const defaultLessonCost = parseFloat(document.getElementById('defaultLessonCost').value);
    const contact = document.getElementById('teacherContact').value;
    const photoFile = document.getElementById('teacherPhoto').files[0];
    
    // Get selected instruments
    const selectedInstruments = Array.from(document.querySelectorAll('#instrumentsCheckboxes input:checked'))
        .map(input => parseInt(input.value));
    
    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('name', name);
        formData.append('bio', bio);
        formData.append('defaultLessonCost', defaultLessonCost);
        formData.append('contactInfo', contact);
        formData.append('instrumentIds', JSON.stringify(selectedInstruments));
        
        if (photoFile) {
            formData.append('photo', photoFile);
        }
        
        const response = await fetch(`${API_BASE_URL}/teachers/profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to save profile');
        }
        
        // Profile saved to database via API
        
        alert('Profile saved successfully!');
    } catch (error) {
        console.error('Error saving teacher profile:', error);
        alert('Failed to save profile. Please try again.');
    }
}

// Handle photo preview
function handlePhotoPreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photoPreview');
    const previewImage = document.getElementById('previewImage');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
}

// Handle schedule lesson
async function handleScheduleLesson(event) {
    event.preventDefault();
    
    const student = document.getElementById('lessonStudent').value;
    const instrument = document.getElementById('lessonInstrument').value;
    const date = document.getElementById('lessonDate').value;
    const time = document.getElementById('lessonTime').value;
    const duration = parseInt(document.getElementById('lessonDuration').value);
    const type = document.getElementById('lessonType').value;
    const cost = parseFloat(document.getElementById('lessonCost').value);
    const notes = document.getElementById('lessonNotes').value;
    
    // Check for overlapping lessons
    if (window.allLessons && window.allLessons.length > 0) {
        const hasOverlap = checkForOverlappingLessons(date, time, duration);
        if (hasOverlap) {
            alert('Error: This lesson time overlaps with an existing lesson. Please choose a different time.');
            return;
        }
    }
    
    try {
        const response = await apiCall('/teachers/schedule-lesson', 'POST', {
            studentName: student,
            instrument: instrument,
            lessonDate: date,
            lessonTime: time,
            duration: duration,
            lessonType: type,
            cost: cost,
            notes: notes
        });
        
        // Create new lesson object
        const [hours, minutes] = time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        
        const newLesson = {
            id: Date.now(), // Generate a temporary ID
            student: {
                name: student,
                contactInfo: 'student@example.com' // Default contact
            },
            instrument: {
                name: instrument
            },
            availabilitySlot: {
                date: date,
                startTime: time,
                endTime: endTime
            },
            lessonType: type,
            totalCost: cost,
            status: 'Pending',
            notes: notes
        };
        
        // Add to global lessons array
        if (!window.allLessons) {
            window.allLessons = [];
        }
        window.allLessons.push(newLesson);
        
        // Lesson saved to database via API
        
        // Update the display immediately
        populateTeacherLessons(window.allLessons);
        
        alert('Lesson scheduled successfully!');
        
        // Clear the form
        document.getElementById('scheduleLessonForm').reset();
        
    } catch (error) {
        console.error('Error scheduling lesson:', error);
        alert('Failed to schedule lesson. Please try again.');
    }
}

// Update cost preview
function updateCostPreview() {
    const cost = document.getElementById('lessonCost').value;
    const costAmount = document.getElementById('costAmount');
    const costPreview = document.getElementById('costPreview');
    
    if (cost && cost > 0) {
        costAmount.textContent = `$${parseFloat(cost).toFixed(2)}`;
        costPreview.style.display = 'block';
    } else {
        costPreview.style.display = 'none';
    }
    
    // Also update the cost summary
    updateCostSummary();
}

// Update cost summary
function updateCostSummary() {
    const cost = document.getElementById('lessonCost').value;
    const duration = document.getElementById('lessonDuration').value;
    const durationDisplay = document.getElementById('durationDisplay');
    const totalCostDisplay = document.getElementById('totalCostDisplay');
    
    // Update duration display
    const durationText = duration === '60' ? '1 hour' : 
                        duration === '75' ? '1 hour 15 minutes' :
                        duration === '90' ? '1 hour 30 minutes' :
                        duration === '120' ? '2 hours' :
                        duration === '150' ? '2 hours 30 minutes' :
                        duration === '180' ? '3 hours' :
                        duration === '210' ? '3 hours 30 minutes' :
                        duration === '240' ? '4 hours' :
                        `${duration} minutes`;
    durationDisplay.textContent = durationText;
    
    // Update total cost (flat rate regardless of duration)
    if (cost && cost > 0) {
        totalCostDisplay.textContent = `$${parseFloat(cost).toFixed(2)}`;
    } else {
        totalCostDisplay.textContent = '$0.00';
    }
}

// Load default cost from teacher profile
function loadDefaultLessonCost() {
    const defaultCost = document.getElementById('defaultLessonCost').value;
    if (defaultCost) {
        document.getElementById('lessonCost').value = defaultCost;
        updateCostPreview();
    }
}

// Calculate end time based on start time and duration
function calculateEndTime() {
    const startTime = document.getElementById('availabilityStart').value;
    const duration = parseInt(document.getElementById('availabilityDuration').value);
    const endTimeDisplay = document.getElementById('calculatedEndTime');
    
    if (startTime && duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        endTimeDisplay.textContent = endTime;
    } else {
        endTimeDisplay.textContent = '--:--';
    }
}

// Load default cost into availability form
function loadDefaultAvailabilityCost() {
    const defaultCost = document.getElementById('defaultLessonCost').value;
    if (defaultCost && !document.getElementById('availabilityCost').value) {
        document.getElementById('availabilityCost').value = defaultCost;
    }
}

// Convert 24-hour time to 12-hour format with AM/PM
function formatTime12Hour(time24) {
    if (!time24 || typeof time24 !== 'string') {
        return '--:--';
    }
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Check for overlapping lessons
function checkForOverlappingLessons(newDate, newTime, newDuration) {
    if (!window.allLessons || window.allLessons.length === 0) {
        return false;
    }
    
    // Convert new lesson time to minutes
    const [newHours, newMinutes] = newTime.split(':').map(Number);
    const newStartMinutes = newHours * 60 + newMinutes;
    const newEndMinutes = newStartMinutes + newDuration;
    
    // Check against existing lessons on the same date
    return window.allLessons.some(lesson => {
        // Check if it's the same date
        const lessonDate = new Date(lesson.availabilitySlot.date).toISOString().split('T')[0];
        if (lessonDate !== newDate) {
            return false;
        }
        
        // Parse existing lesson times
        const [lessonStartHours, lessonStartMins] = lesson.availabilitySlot.startTime.split(':').map(Number);
        const [lessonEndHours, lessonEndMins] = lesson.availabilitySlot.endTime.split(':').map(Number);
        
        const lessonStartMinutes = lessonStartHours * 60 + lessonStartMins;
        const lessonEndMinutes = lessonEndHours * 60 + lessonEndMins;
        
        // Check for overlap
        // Two time ranges overlap if: start1 < end2 AND start2 < end1
        return newStartMinutes < lessonEndMinutes && lessonStartMinutes < newEndMinutes;
    });
}

function populateInstrumentsCheckboxes(instruments) {
    const container = document.getElementById('instrumentsCheckboxes');
    container.innerHTML = '';
    
    instruments.forEach(instrument => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${instrument.id}" id="instrument${instrument.id}">
            <label class="form-check-label" for="instrument${instrument.id}">
                ${instrument.name}
            </label>
        `;
        container.appendChild(div);
    });
}

async function handleAddAvailability(event) {
    event.preventDefault();
    
    const dateInput = document.getElementById('availabilityDate').value;
    const startTime = document.getElementById('availabilityStart').value;
    const duration = parseInt(document.getElementById('availabilityDuration').value);
    const isVirtual = document.getElementById('availabilityVirtual').value === 'true';
    const cost = parseFloat(document.getElementById('availabilityCost').value);
    const notes = document.getElementById('availabilityNotes').value;
    
    // Convert date to ISO format (YYYY-MM-DD)
    const date = new Date(dateInput).toISOString().split('T')[0];
    
    // Calculate end time
    // Convert 12-hour format to 24-hour format for calculation
    const time12Hour = startTime;
    const [time, period] = time12Hour.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    const hours24 = period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours);
    
    const startMinutes = hours24 * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    // Check for overlapping availability (if we have existing availability data)
    if (window.allAvailability && window.allAvailability.length > 0) {
        const hasOverlap = checkForOverlappingAvailability(date, startTime, duration);
        if (hasOverlap) {
            alert('Error: This availability time overlaps with an existing availability slot. Please choose a different time.');
            return;
        }
    }
    
    try {
        const requestData = {
            date: date,
            startTime: `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            endTime: endTime,
            isVirtual: isVirtual,
            cost: cost,
            notes: notes
        };
        
        console.log('Sending availability data:', requestData);
        console.log('Original dateInput:', dateInput);
        console.log('Converted date:', date);
        console.log('Original startTime:', startTime);
        console.log('Parsed hours24:', hours24, 'minutes:', minutes);
        
        await apiCall('/teachers/availability', 'POST', requestData);
        
        // Add the new availability slot to the current list immediately
        const newSlot = {
            Id: Date.now(), // Generate a temporary ID
            Date: date,
            StartTime: startTime,
            EndTime: endTime,
            IsAvailable: true,
            IsVirtual: isVirtual,
            Cost: cost,
            Notes: notes
        };
        
        // Add to global availability array
        if (!window.allAvailability) {
            window.allAvailability = [];
        }
        window.allAvailability.push(newSlot);
        
        // Availability saved to database via API
        
        // Update the display immediately
        populateAvailabilityList(window.allAvailability);
        
        alert('Availability added successfully!');
        document.getElementById('availabilityForm').reset();
        document.getElementById('calculatedEndTime').textContent = '--:--';
    } catch (error) {
        console.error('Error adding availability:', error);
        alert('Failed to add availability. Please try again.');
    }
}

// Check for overlapping availability
function checkForOverlappingAvailability(newDate, newTime, newDuration) {
    if (!window.allAvailability || window.allAvailability.length === 0) {
        return false;
    }
    
    // Convert new availability time to minutes
    const [newHours, newMinutes] = newTime.split(':').map(Number);
    const newStartMinutes = newHours * 60 + newMinutes;
    const newEndMinutes = newStartMinutes + newDuration;
    
    // Check against existing availability on the same date
    return window.allAvailability.some(slot => {
        // Check if it's the same date
        const slotDate = new Date(slot.date).toISOString().split('T')[0];
        if (slotDate !== newDate) {
            return false;
        }
        
        // Parse existing availability times
        const [slotStartHours, slotStartMins] = slot.startTime.split(':').map(Number);
        const [slotEndHours, slotEndMins] = slot.endTime.split(':').map(Number);
        
        const slotStartMinutes = slotStartHours * 60 + slotStartMins;
        const slotEndMinutes = slotEndHours * 60 + slotEndMins;
        
        // Check for overlap
        return newStartMinutes < slotEndMinutes && slotStartMinutes < newEndMinutes;
    });
}

function populateAvailabilityList(availability) {
    const container = document.getElementById('currentAvailability');
    container.innerHTML = '';
    
    // Store availability globally for overlap checking
    window.allAvailability = availability;
    
    if (availability.length === 0) {
        container.innerHTML = '<p class="text-muted">No availability set.</p>';
        return;
    }
    
    availability.forEach(slot => {
        const div = document.createElement('div');
        div.className = 'availability-slot';
        div.innerHTML = `
            <strong>${new Date(slot.Date || slot.date).toLocaleDateString()}</strong><br>
            ${formatTime12Hour(slot.StartTime || slot.startTime)} - ${formatTime12Hour(slot.EndTime || slot.endTime)}<br>
            <small class="text-muted">${(slot.IsVirtual !== undefined ? slot.IsVirtual : slot.isVirtual) ? 'Virtual' : 'In-Person'}</small>
        `;
        container.appendChild(div);
    });
}

function populateTeacherLessons(lessons) {
    const container = document.getElementById('teacherLessonsList');
    container.innerHTML = '';
    
    if (lessons.length === 0) {
        container.innerHTML = '<p class="text-muted">No lessons booked.</p>';
        return;
    }
    
    // Store lessons globally for filtering
    window.allLessons = lessons;
    
    lessons.forEach(lesson => {
        const div = document.createElement('div');
        div.className = 'card booking-card mb-3 lesson-item';
        div.setAttribute('data-student', (lesson.Student?.Name || lesson.student?.name || '').toLowerCase());
        div.setAttribute('data-instrument', (lesson.Instrument?.Name || lesson.instrument?.name || '').toLowerCase());
        div.setAttribute('data-status', lesson.Status || lesson.status);
        
        const status = lesson.Status || lesson.status;
        const statusColor = status === 'Completed' ? 'success' : 
                           status === 'Confirmed' ? 'primary' : 
                           status === 'Pending' ? 'warning' : 'secondary';
        
        div.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0">${lesson.Student?.Name || lesson.student?.name || 'Unknown Student'}</h6>
                            <span class="badge bg-${statusColor}">${status}</span>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-1"><i class="bi bi-music-note"></i> <strong>Instrument:</strong> ${lesson.Instrument?.Name || lesson.instrument?.name || 'Unknown Instrument'}</p>
                                <p class="mb-1"><i class="bi bi-person"></i> <strong>Type:</strong> ${lesson.LessonType || lesson.lessonType}</p>
                                <p class="mb-1"><i class="bi bi-envelope"></i> <strong>Contact:</strong> ${lesson.Student?.ContactInfo || lesson.student?.contactInfo || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1"><i class="bi bi-calendar"></i> <strong>Date:</strong> ${new Date(lesson.AvailabilitySlot?.Date || lesson.availabilitySlot?.date || lesson.LessonDate || lesson.lessonDate).toLocaleDateString()}</p>
                                <p class="mb-1"><i class="bi bi-clock"></i> <strong>Time:</strong> ${formatTime12Hour(lesson.AvailabilitySlot?.StartTime || lesson.availabilitySlot?.startTime || lesson.StartTime || lesson.startTime)} - ${formatTime12Hour(lesson.AvailabilitySlot?.EndTime || lesson.availabilitySlot?.endTime || lesson.EndTime || lesson.endTime)}</p>
                                <p class="mb-1"><i class="bi bi-currency-dollar"></i> <strong>Cost:</strong> $${lesson.TotalCost || lesson.totalCost}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="d-flex flex-column gap-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewLessonDetails(${lesson.id})">
                                <i class="bi bi-eye"></i> View Details
                            </button>
                            ${lesson.status === 'Pending' ? `
                                <button class="btn btn-success btn-sm" onclick="confirmLesson(${lesson.id})">
                                    <i class="bi bi-check"></i> Confirm
                                </button>
                            ` : ''}
                            ${lesson.status === 'Confirmed' ? `
                                <button class="btn btn-warning btn-sm" onclick="markCompleted(${lesson.id})">
                                    <i class="bi bi-check-circle"></i> Mark Complete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Filter lessons based on search and status
function filterLessons() {
    const searchTerm = document.getElementById('lessonSearch').value.toLowerCase();
    const statusFilter = document.getElementById('lessonStatusFilter').value;
    const lessonItems = document.querySelectorAll('.lesson-item');
    
    lessonItems.forEach(item => {
        const student = item.getAttribute('data-student');
        const instrument = item.getAttribute('data-instrument');
        const status = item.getAttribute('data-status');
        
        const matchesSearch = student.includes(searchTerm) || instrument.includes(searchTerm);
        const matchesStatus = !statusFilter || status === statusFilter;
        
        if (matchesSearch && matchesStatus) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// View lesson details
function viewLessonDetails(lessonId) {
    const lesson = window.allLessons.find(l => l.id === lessonId);
    if (lesson) {
        alert(`Lesson Details:\n\nStudent: ${lesson.student.name}\nInstrument: ${lesson.instrument.name}\nDate: ${new Date(lesson.availabilitySlot.date).toLocaleDateString()}\nTime: ${formatTime12Hour(lesson.availabilitySlot.startTime)} - ${formatTime12Hour(lesson.availabilitySlot.endTime)}\nCost: $${lesson.totalCost}\nStatus: ${lesson.status}`);
    }
}

// Confirm a pending lesson
async function confirmLesson(lessonId) {
    try {
        await apiCall(`/teachers/lessons/${lessonId}/confirm`, 'POST');
        
        // Update the lesson status in the UI immediately
        updateLessonStatusInUI(lessonId, 'Confirmed');
        
        alert('Lesson confirmed successfully!');
    } catch (error) {
        console.error('Error confirming lesson:', error);
        alert('Failed to confirm lesson. Please try again.');
    }
}

// Mark lesson as completed
async function markCompleted(lessonId) {
    try {
        await apiCall(`/teachers/lessons/${lessonId}/complete`, 'POST');
        
        // Update the lesson status in the UI immediately
        updateLessonStatusInUI(lessonId, 'Completed');
        
        alert('Lesson marked as completed!');
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        alert('Failed to mark lesson complete. Please try again.');
    }
}

// Update lesson status in the UI immediately
function updateLessonStatusInUI(lessonId, newStatus) {
    // Update the lesson in the global lessons array
    if (window.allLessons) {
        const lesson = window.allLessons.find(l => l.id === lessonId);
        if (lesson) {
            lesson.status = newStatus;
        }
        
        // Lesson status updated in database via API
    }
    
    // Find the lesson card in the DOM and update it
    const lessonCards = document.querySelectorAll('.lesson-item');
    lessonCards.forEach(card => {
        if (card.getAttribute('data-status') !== newStatus) {
            // Update the status badge
            const statusBadge = card.querySelector('.badge');
            if (statusBadge) {
                statusBadge.textContent = newStatus;
                
                // Update badge color based on status
                statusBadge.className = 'badge bg-' + (
                    newStatus === 'Completed' ? 'success' : 
                    newStatus === 'Confirmed' ? 'primary' : 
                    newStatus === 'Pending' ? 'warning' : 'secondary'
                );
            }
            
            // Update the data attribute
            card.setAttribute('data-status', newStatus);
            
            // Update action buttons based on new status
            const actionButtons = card.querySelector('.d-flex.flex-column.gap-2');
            if (actionButtons) {
                if (newStatus === 'Completed') {
                    // Remove all action buttons for completed lessons
                    actionButtons.innerHTML = `
                        <button class="btn btn-outline-primary btn-sm" onclick="viewLessonDetails(${lessonId})">
                            <i class="bi bi-eye"></i> View Details
                        </button>
                    `;
                } else if (newStatus === 'Confirmed') {
                    // Show mark complete button for confirmed lessons
                    actionButtons.innerHTML = `
                        <button class="btn btn-outline-primary btn-sm" onclick="viewLessonDetails(${lessonId})">
                            <i class="bi bi-eye"></i> View Details
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="markCompleted(${lessonId})">
                            <i class="bi bi-check-circle"></i> Mark Complete
                        </button>
                    `;
                }
            }
        }
    });
}

// Student Functions
async function loadStudentData() {
    try {
        // Load student profile
        const profile = await apiCall('/students/my-profile');
        if (profile) {
            populateStudentProfile(profile);
        }
        
        // Load instruments for filtering
        const instruments = await apiCall('/students/instruments');
        populateInstrumentFilter(instruments);
        
        // Load teachers
        await loadTeachers();
        
        // Load bookings
        const bookings = await apiCall('/students/my-bookings');
        populateStudentBookings(bookings);
        
    } catch (error) {
        console.error('Error loading student data:', error);
        alert('Failed to load student data. Please try again.');
    }
}

function populateStudentProfile(profile) {
    document.getElementById('studentName').value = profile.name || '';
    document.getElementById('studentContact').value = profile.contactInfo || '';
    document.getElementById('studentPayment').value = profile.paymentInfo || '';
}

async function handleStudentProfile(event) {
    event.preventDefault();
    
    const name = document.getElementById('studentName').value;
    const contact = document.getElementById('studentContact').value;
    const payment = document.getElementById('studentPayment').value;
    
    try {
        await apiCall('/students/profile', 'POST', {
            name,
            contactInfo: contact,
            paymentInfo: payment
        });
        
        alert('Profile saved successfully!');
    } catch (error) {
        console.error('Error saving student profile:', error);
        alert('Failed to save profile. Please try again.');
    }
}

function populateInstrumentFilter(instruments) {
    const filter = document.getElementById('instrumentFilter');
    const guestFilter = document.getElementById('guestInstrumentFilter');
    
    [filter, guestFilter].forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">All Instruments</option>';
            instruments.forEach(instrument => {
                const option = document.createElement('option');
                option.value = instrument.id;
                option.textContent = instrument.name;
                select.appendChild(option);
            });
        }
    });
}

async function loadTeachers(instrumentId = null) {
    try {
        let endpoint = '/teachers';
        if (instrumentId) {
            endpoint = `/students/teachers/by-instrument/${instrumentId}`;
        }
        
        const teachers = await apiCall(endpoint);
        populateTeachersList(teachers);
    } catch (error) {
        console.error('Error loading teachers:', error);
        alert('Failed to load teachers. Please try again.');
    }
}

function populateTeachersList(teachers) {
    const container = document.getElementById('teachersList');
    const guestContainer = document.getElementById('guestTeachersList');
    
    [container, guestContainer].forEach(target => {
        if (target) {
            target.innerHTML = '';
            
            if (teachers.length === 0) {
                target.innerHTML = '<p class="text-muted">No teachers found.</p>';
                return;
            }
            
            teachers.forEach(teacher => {
                const div = document.createElement('div');
                div.className = 'teacher-card';
                div.innerHTML = `
                    <div class="row">
                        <div class="col-md-8">
                            <h5>${teacher.name}</h5>
                            <p class="text-muted">${teacher.bio}</p>
                            <p><strong>Rate:</strong> $${teacher.hourlyRate}/hour</p>
                            <p><strong>Instruments:</strong> ${teacher.instruments.map(i => i.instrument.name).join(', ')}</p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-primary" onclick="viewTeacherAvailability(${teacher.id})">
                                View Availability
                            </button>
                        </div>
                    </div>
                `;
                target.appendChild(div);
            });
        }
    });
}

async function loadGuestTeachers() {
    try {
        const instruments = await apiCall('/students/instruments');
        populateInstrumentFilter(instruments);
        await loadTeachers();
    } catch (error) {
        console.error('Error loading guest teachers:', error);
        alert('Failed to load teachers. Please try again.');
    }
}

function filterTeachersByInstrument() {
    const filter = document.getElementById('instrumentFilter') || document.getElementById('guestInstrumentFilter');
    const instrumentId = filter.value;
    
    if (instrumentId) {
        loadTeachers(parseInt(instrumentId));
    } else {
        loadTeachers();
    }
}

async function viewTeacherAvailability(teacherId) {
    try {
        const availability = await apiCall(`/students/availability/${teacherId}`);
        showBookingModal(teacherId, availability);
    } catch (error) {
        console.error('Error loading teacher availability:', error);
        alert('Failed to load availability. Please try again.');
    }
}

function showBookingModal(teacherId, availability) {
    // This would show a modal for booking
    // For now, we'll just show an alert
    alert(`Teacher ${teacherId} has ${availability.length} available slots. Booking functionality would be implemented here.`);
}

function populateStudentBookings(bookings) {
    const container = document.getElementById('studentBookingsList');
    container.innerHTML = '';
    
    if (bookings.length === 0) {
        container.innerHTML = '<p class="text-muted">No bookings found.</p>';
        return;
    }
    
    bookings.forEach(booking => {
        const div = document.createElement('div');
        div.className = 'card booking-card mb-3';
        div.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>${booking.teacher.name}</h6>
                        <p class="mb-1"><strong>Instrument:</strong> ${booking.instrument.name}</p>
                        <p class="mb-1"><strong>Type:</strong> ${booking.lessonType}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Date:</strong> ${new Date(booking.availabilitySlot.date).toLocaleDateString()}</p>
                        <p class="mb-1"><strong>Time:</strong> ${booking.availabilitySlot.startTime} - ${booking.availabilitySlot.endTime}</p>
                        <p class="mb-1"><strong>Cost:</strong> $${booking.totalCost}</p>
                    </div>
                </div>
                <div class="mt-2">
                    <span class="badge bg-${booking.status === 'Completed' ? 'success' : 'warning'}">${booking.status}</span>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="cancelBooking(${booking.id})">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        await apiCall(`/students/cancel/${bookingId}`, 'POST');
        alert('Booking cancelled successfully!');
        loadStudentData(); // Reload data
    } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking. Please try again.');
    }
}

// Revenue Report Functions
async function loadRevenueReport() {
    try {
        const period = document.getElementById('revenuePeriod').value;
        const revenueData = await apiCall(`/reports/revenue?period=${period}`);
        createRevenueChart(revenueData);
    } catch (error) {
        console.error('Error loading revenue report:', error);
        alert('Failed to load revenue report. Please try again.');
    }
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatTime(timeString) {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

// API error handling
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});
