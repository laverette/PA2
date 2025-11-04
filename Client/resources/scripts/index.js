// Freelance Music Platform - Frontend JavaScript
// Global variables
let currentUser = null;
let authToken = null;
let userDisplayName = null; // Store the user's actual name from profile

// Configurable API Base URL - Configured for localhost development
const API_BASE_URL = 'http://localhost:5000/api';
console.log('🌐 LOCALHOST CONFIGURATION:');
console.log('Frontend: http://localhost:8080');
console.log('Backend API:', API_BASE_URL);
console.log('Database: freelancemusic.db (SQLite)');

let isShowingDashboard = false; // Prevent multiple dashboard calls
let isInitialized = false; // Prevent multiple initializations

// Debug counters
let apiCallCount = 0;
let loadTeacherDataCallCount = 0;
let showTeacherDashboardCallCount = 0;

// Debug function to check current state
function debugTeacherState() {
    console.log('=== TEACHER DEBUG STATE ===');
    console.log('API Call Count:', apiCallCount);
    console.log('Load Teacher Data Call Count:', loadTeacherDataCallCount);
    console.log('Show Teacher Dashboard Call Count:', showTeacherDashboardCallCount);
    console.log('Teacher Data Loaded:', teacherDataLoaded);
    console.log('Is Loading Teacher Data:', isLoadingTeacherData);
    console.log('Teacher Data Load Promise:', !!teacherDataLoadPromise);
    console.log('Is Showing Dashboard:', isShowingDashboard);
    console.log('Current User:', currentUser);
    console.log('=== END DEBUG STATE ===');
}

// Reset debug counters
function resetDebugCounters() {
    apiCallCount = 0;
    loadTeacherDataCallCount = 0;
    showTeacherDashboardCallCount = 0;
    console.log('Debug counters reset');
}

// Test API connection
async function testApiConnection() {
    try {
        console.log('Testing API connection to:', API_BASE_URL);
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
        if (response.ok) {
            const data = await response.json();
            console.log('API connection successful:', data);
            return true;
        } else {
            console.error('API connection failed:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('API connection error:', error);
        return false;
    }
}

// Make debug functions available globally
window.debugTeacherState = debugTeacherState;
window.resetDebugCounters = resetDebugCounters;
window.testApiConnection = testApiConnection;

// Add debugging for page navigation/refresh events
window.addEventListener('beforeunload', function(event) {
    console.log('=== PAGE ABOUT TO RELOAD/NAVIGATE ===');
    console.log('Event:', event);
    console.log('Current URL:', window.location.href);
    console.log('Current user:', currentUser);
    console.log('=== END PAGE RELOAD DEBUG ===');
});

window.addEventListener('unload', function(event) {
    console.log('=== PAGE UNLOADING ===');
    console.log('Event:', event);
    console.log('=== END PAGE UNLOAD DEBUG ===');
});

// Track any form submissions that might cause navigation
document.addEventListener('submit', function(event) {
    console.log('=== FORM SUBMISSION DETECTED ===');
    console.log('Form:', event.target);
    console.log('Form action:', event.target.action);
    console.log('Form method:', event.target.method);
    console.log('=== END FORM SUBMISSION DEBUG ===');
});

// Add Bootstrap tab event listener for Browse Teachers tab
document.addEventListener('shown.bs.tab', function(event) {
    console.log('=== TAB ACTIVATED ===');
    console.log('Tab target:', event.target);
    console.log('Tab href:', event.target.getAttribute('href'));
    
    // If the Browse Teachers tab was activated, reload teachers
    if (event.target.getAttribute('href') === '#browseTeachers') {
        console.log('Browse Teachers tab activated, reloading teachers...');
        loadTeachers();
    }
    console.log('=== END TAB ACTIVATED DEBUG ===');
});

// Track any clicks that might cause navigation
document.addEventListener('click', function(event) {
    const target = event.target;
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.onclick) {
        console.log('=== CLICK DETECTED ===');
        console.log('Target:', target);
        console.log('Tag name:', target.tagName);
        console.log('Href:', target.href);
        console.log('Onclick:', target.onclick);
        console.log('=== END CLICK DEBUG ===');
    }
});

// Global error handler to prevent page refreshes
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    console.error('Error details:', event.error?.message);
    console.error('Error stack:', event.error?.stack);
    // Prevent the error from causing a page refresh
    event.preventDefault();
    event.stopPropagation();
    return false;
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    console.error('Promise rejection details:', event.reason?.message);
    console.error('Promise rejection stack:', event.reason?.stack);
    // Prevent the rejection from causing a page refresh
    event.preventDefault();
    return false;
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    console.log('isInitialized:', isInitialized);
    
    if (isInitialized) {
        console.log('Already initialized, skipping...');
        return;
    }
    
    isInitialized = true;
    console.log('Starting application initialization...');
    
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    console.log('Saved token exists:', !!savedToken);
    console.log('Saved user exists:', !!savedUser);
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        console.log('User loaded from storage:', currentUser);
        updateNavigation();
        // CRITICAL: Go directly to dashboard, NOT homepage
        showDashboard();
    } else {
        console.log('No saved user, showing homepage');
        showHomePage();
    }
    
    // Set up form event listeners
    setupEventListeners();
    console.log('=== DOM CONTENT LOADED END ===');
});

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Prevent ALL form submissions by default
    document.addEventListener('submit', function(event) {
        console.log('=== FORM SUBMISSION INTERCEPTED ===');
        console.log('Form:', event.target);
        console.log('Form ID:', event.target.id);
        console.log('Preventing default submission...');
        event.preventDefault();
        event.stopPropagation();
        return false;
    });
    
    // Login form
    const studentLoginForm = document.getElementById('studentLoginForm');
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', (e) => handleLogin(e, 'Student'));
    }
    
    const teacherLoginForm = document.getElementById('teacherLoginForm');
    if (teacherLoginForm) {
        teacherLoginForm.addEventListener('submit', (e) => handleLogin(e, 'Teacher'));
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Register form event listener added');
    } else {
        console.error('Register form not found!');
    }
    
    // Teacher profile form
    const teacherProfileForm = document.getElementById('teacherProfileForm');
    if (teacherProfileForm) {
        teacherProfileForm.addEventListener('submit', handleTeacherProfile);
        console.log('Teacher profile form event listener added');
    }
    
    // Student profile form
    const studentProfileForm = document.getElementById('studentProfileForm');
    if (studentProfileForm) {
        studentProfileForm.addEventListener('submit', handleStudentProfile);
    }
    
    // Availability form
    const availabilityForm = document.getElementById('availabilityForm');
    if (availabilityForm) {
        availabilityForm.addEventListener('submit', handleAddAvailability);
    }
    
    // Teacher photo preview (only if element exists)
    const teacherPhotoElement = document.getElementById('teacherPhoto');
    if (teacherPhotoElement) {
        teacherPhotoElement.addEventListener('change', handlePhotoPreview);
    }
    
    // Schedule lesson form
    const scheduleLessonForm = document.getElementById('scheduleLessonForm');
    if (scheduleLessonForm) {
        scheduleLessonForm.addEventListener('submit', handleScheduleLesson);
    }
    
    // Cost preview for lesson scheduling
    const lessonCostElement = document.getElementById('lessonCost');
    if (lessonCostElement) {
        lessonCostElement.addEventListener('input', updateCostPreview);
    }
    
    const lessonDurationElement = document.getElementById('lessonDuration');
    if (lessonDurationElement) {
        lessonDurationElement.addEventListener('change', updateCostSummary);
    }
    
    // Availability form enhancements
    const availabilityStartElement = document.getElementById('availabilityStart');
    if (availabilityStartElement) {
        availabilityStartElement.addEventListener('change', calculateEndTime);
    }
    
    const availabilityDurationElement = document.getElementById('availabilityDuration');
    if (availabilityDurationElement) {
        availabilityDurationElement.addEventListener('change', calculateEndTime);
    }
    
    const availabilityCostElement = document.getElementById('availabilityCost');
    if (availabilityCostElement) {
        availabilityCostElement.addEventListener('input', loadDefaultAvailabilityCost);
    }
    
    // Lesson search and filtering
    const lessonSearchElement = document.getElementById('lessonSearch');
    if (lessonSearchElement) {
        lessonSearchElement.addEventListener('input', filterLessons);
    }
    
    const lessonStatusFilterElement = document.getElementById('lessonStatusFilter');
    if (lessonStatusFilterElement) {
        lessonStatusFilterElement.addEventListener('change', filterLessons);
    }
    
    console.log('Event listeners setup completed');
}

// Navigation Functions
function showHomePage(event) {
    if (event) {
        event.preventDefault();
    }
    console.log('=== SHOW HOMEPAGE DEBUG ===');
    console.log('showHomePage called - Stack trace:', new Error().stack);
    console.log('Current user:', currentUser);
    console.log('Event:', event);
    hideAllPages();
    document.getElementById('homePage').classList.remove('hidden');
    updateNavigation();
    
    // If user is logged in, show welcome message instead of login prompts
    if (currentUser) {
        updateHomePageForLoggedInUser();
    }
    console.log('=== SHOW HOMEPAGE DEBUG END ===');
}

function updateHomePageForLoggedInUser() {
    // Update the hero section for logged-in users
    const heroSection = document.querySelector('.hero-section .container .row .col-lg-6:first-child');
    if (heroSection) {
        heroSection.innerHTML = `
            <h1 class="display-4 fw-bold mb-4">Welcome back, ${currentUser.email}!</h1>
            <p class="lead mb-4">Ready to continue your musical journey? Access your dashboard to manage your ${currentUser.role.toLowerCase()} activities.</p>
            <div class="d-flex gap-3">
                <button class="btn btn-light btn-lg" onclick="showDashboard(); return false;">Go to Dashboard</button>
                <button class="btn btn-outline-light btn-lg" onclick="logout(); return false;">Logout</button>
            </div>
        `;
    }
}

function resetHomePageForLoggedOutUser() {
    // Reset the hero section to match the current homepage design
    const heroSection = document.querySelector('.hero-section .container .row .col-lg-6:first-child');
    if (heroSection) {
        heroSection.innerHTML = `
            <h1 class="display-4 fw-bold mb-4">Connect with Music</h1>
            <p class="lead mb-4">Freelance Music connects talented music teachers with eager students. Book lessons, learn instruments, and share your passion for music.</p>
            <div class="d-flex gap-3">
                <button class="btn btn-light btn-lg" onclick="showStudentLoginPage()">Student Login</button>
                <button class="btn btn-outline-light btn-lg" onclick="showTeacherLoginPage()">Teacher Login</button>
                <button class="btn btn-outline-warning btn-lg" onclick="showAdminLoginPage()">Admin Login</button>
            </div>
        `;
    }
}

function toggleStudentFields() {
    const role = document.getElementById('registerRole').value;
    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');
    
    if (role === 'Student') {
        studentFields.style.display = 'block';
        teacherFields.style.display = 'none';
    } else if (role === 'Teacher') {
        studentFields.style.display = 'none';
        teacherFields.style.display = 'block';
    } else {
        studentFields.style.display = 'none';
        teacherFields.style.display = 'none';
    }
}

function showStudentLoginPage() {
    hideAllPages();
    document.getElementById('studentLoginPage').classList.remove('hidden');
}

function showTeacherLoginPage() {
    hideAllPages();
    document.getElementById('teacherLoginPage').classList.remove('hidden');
}

function showStudentRegisterPage() {
    hideAllPages();
    document.getElementById('registerPage').classList.remove('hidden');
    // Pre-select Student role
    document.getElementById('registerRole').value = 'Student';
    toggleStudentFields();
}

function showTeacherRegisterPage() {
    hideAllPages();
    document.getElementById('registerPage').classList.remove('hidden');
    // Pre-select Teacher role
    document.getElementById('registerRole').value = 'Teacher';
    toggleStudentFields();
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

function showTeacherDashboard(event) {
    if (event) {
        event.preventDefault();
    }
    showTeacherDashboardCallCount++;
    console.log('=== TEACHER DASHBOARD DEBUG ===');
    console.log('showTeacherDashboard called - COUNT:', showTeacherDashboardCallCount);
    console.log('Current user:', currentUser);
    console.log('Auth token exists:', !!authToken);
    console.log('Event:', event);
    
    try {
        console.log('Hiding all pages...');
        hideAllPages();
        console.log('Showing teacher dashboard...');
        document.getElementById('teacherDashboard').classList.remove('hidden');
        
        // Reset the teacher data loading flags to allow fresh data loading
        resetTeacherDataFlags();
        
        console.log('Teacher dashboard shown, about to load data');
        loadTeacherData();
        console.log('loadTeacherData called, showTeacherDashboard function ending');
        console.log('=== TEACHER DASHBOARD DEBUG END ===');
    } catch (error) {
        console.error('Error in showTeacherDashboard:', error);
        console.error('Error stack:', error.stack);
    }
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
    console.log('showDashboard called with currentUser:', currentUser);
    console.log('isShowingDashboard:', isShowingDashboard);
    
    // Prevent multiple simultaneous dashboard calls
    if (isShowingDashboard) {
        console.log('Dashboard already being shown, skipping...');
        return;
    }
    
    isShowingDashboard = true;
    
    try {
        if (!currentUser) {
            console.log('No current user, showing homepage');
            showHomePage();
            return;
        }
        
        console.log('User role:', currentUser.role);
        
        switch (currentUser.role) {
            case 'Admin':
                console.log('Showing admin dashboard');
                showAdminDashboard();
                break;
            case 'Teacher':
                console.log('Showing teacher dashboard');
                showTeacherDashboard();
                break;
            case 'Student':
                console.log('Showing student dashboard');
                showStudentDashboard();
                break;
            default:
                console.log('Unknown role, showing homepage');
                showHomePage();
        }
    } finally {
        // Reset the flag after a short delay to allow the dashboard to load
        setTimeout(() => {
            isShowingDashboard = false;
            console.log('Dashboard showing flag reset');
        }, 2000); // 2 second delay
    }
}

function hideAllPages() {
    const pages = ['homePage', 'studentLoginPage', 'teacherLoginPage', 'registerPage', 'adminDashboard', 'teacherDashboard', 'studentDashboard', 'browsePage', 'adminLoginPage'];
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
        // Use the actual name from profile if available, otherwise fall back to email
        const displayName = userDisplayName || currentUser.email.split('@')[0];
        document.getElementById('userName').textContent = displayName;
        
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
async function handleLogin(event, role) {
    event.preventDefault();
    
    let email, password;
    
    if (role === 'Student') {
        email = document.getElementById('studentEmail').value;
        password = document.getElementById('studentPassword').value;
    } else if (role === 'Teacher') {
        email = document.getElementById('teacherEmail').value;
        password = document.getElementById('teacherPassword').value;
    } else {
        // Admin login
        email = document.getElementById('adminEmail').value;
        password = document.getElementById('adminPassword').value;
    }
    
    try {
        console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            authToken = data.token;
            currentUser = {
                id: data.userId,
                email: email,
                role: data.role
            };
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // CRITICAL: Update navigation FIRST
            updateNavigation();
            
            // CRITICAL: Redirect based on role - NO HOMEPAGE CALLS
            if (data.role === 'Admin') {
                showAdminDashboard();
            } else if (data.role === 'Teacher') {
                showTeacherDashboard();
            } else if (data.role === 'Student') {
                showStudentDashboard();
            } else {
                // Fallback - still go to dashboard, not homepage
                showDashboard();
            }
        } else {
            alert(`Login failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    console.log('handleRegister called');
    console.log('Current page:', document.getElementById('registerPage') ? 'registerPage visible' : 'registerPage not visible');
    
    const emailElement = document.getElementById('registerEmail');
    const passwordElement = document.getElementById('registerPassword');
    const roleElement = document.getElementById('registerRole');
    const nameElement = document.getElementById('registerName');
    
    console.log('Form elements found:', {
        emailElement: !!emailElement,
        passwordElement: !!passwordElement,
        roleElement: !!roleElement,
        nameElement: !!nameElement
    });
    
    // Log the actual elements for debugging
    console.log('Element details:', {
        emailElement: emailElement,
        passwordElement: passwordElement,
        roleElement: roleElement,
        nameElement: nameElement
    });
    
    if (!emailElement || !passwordElement || !roleElement || !nameElement) {
        console.error('Basic form elements not found');
        console.error('Missing elements:', {
            email: !emailElement,
            password: !passwordElement,
            role: !roleElement,
            name: !nameElement
        });
        
        // Check if we're on the register page
        const registerPage = document.getElementById('registerPage');
        if (!registerPage || registerPage.classList.contains('hidden')) {
            console.error('Register page is not visible or does not exist');
            alert('Error: Registration form is not available. Please navigate to the registration page.');
            return;
        }
        
        alert('Error: Form fields not found. Please refresh the page.');
        return;
    }
    
    const email = emailElement.value;
    const password = passwordElement.value;
    const role = roleElement.value;
    const name = nameElement.value;
    
    console.log('Registration data:', { email, password, role, name });
    
    // Collect role-specific data
    let requestData = { email, password, role, name };
    
    if (role === 'Student') {
        // Get selected student instrument (radio button)
        const selectedStudentInstrument = document.querySelector('input[name="studentInstrument"]:checked');
        const instrument = selectedStudentInstrument ? selectedStudentInstrument.value : '';
        
        const levelElement = document.getElementById('registerStudentLevel');
        if (!levelElement) {
            console.error('registerStudentLevel element not found');
            alert('Error: Level field not found. Please refresh the page.');
            return;
        }
        
        const level = levelElement.value;
        console.log('Student data:', { instrument, level });
        requestData = { ...requestData, instrument, level };
    } else if (role === 'Teacher') {
        const hourlyRateElement = document.getElementById('registerTeacherRate');
        const descriptionElement = document.getElementById('registerTeacherDescription');
        
        if (!hourlyRateElement) {
            console.error('registerTeacherRate element not found');
            alert('Error: Hourly rate field not found. Please refresh the page.');
            return;
        }
        if (!descriptionElement) {
            console.error('registerTeacherDescription element not found');
            alert('Error: Description field not found. Please refresh the page.');
            return;
        }
        
        const hourlyRate = hourlyRateElement.value;
        const description = descriptionElement.value;
        // Get selected teacher instruments (checkboxes)
        const selectedTeacherInstruments = Array.from(document.querySelectorAll('input[name="teacherInstruments"]:checked'))
            .map(checkbox => checkbox.value);
        const instruments = selectedTeacherInstruments.join(', ');
        console.log('Teacher data:', { hourlyRate, description, instruments });
        requestData = { ...requestData, hourlyRate, description, instruments };
    }
    
    console.log('Final request data:', requestData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            if (role === 'Student') {
                showStudentLoginPage();
            } else if (role === 'Teacher') {
                showTeacherLoginPage();
            }
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
    resetHomePageForLoggedOutUser();
}

// API Helper Functions
async function apiCall(endpoint, method = 'GET', body = null) {
    apiCallCount++;
    console.log(`=== API CALL DEBUG #${apiCallCount} ===`);
    console.log('Endpoint:', endpoint);
    console.log('Method:', method);
    console.log('Body:', body);
    
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
    
    console.log('Making API call to:', `${API_BASE_URL}${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    console.log('API response status:', response.status);
    
    if (!response.ok) {
        console.error('API call failed with status:', response.status);
        
        // Try to get error message from response
        let errorMessage = `API call failed: ${response.status}`;
        let errorData = null;
        try {
            errorData = await response.json();
            console.error('Error response data:', errorData);
            if (errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.response = errorData;
        throw error;
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    console.log(`=== API CALL DEBUG #${apiCallCount} END ===`);
    
    return data;
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
let isLoadingTeacherData = false;
let lastLoadTeacherDataCall = 0;
let teacherDataLoaded = false;
let teacherDataLoadPromise = null; // Track the current loading promise

// Function to reset teacher data loading flags
function resetTeacherDataFlags() {
    console.log('Resetting teacher data flags...');
    teacherDataLoaded = false;
    isLoadingTeacherData = false;
    lastLoadTeacherDataCall = 0;
    teacherDataLoadPromise = null;
}

async function loadTeacherData() {
    loadTeacherDataCallCount++;
    console.log('=== LOAD TEACHER DATA DEBUG ===');
    console.log('loadTeacherData function called - COUNT:', loadTeacherDataCallCount);
    console.log('teacherDataLoaded:', teacherDataLoaded);
    console.log('isLoadingTeacherData:', isLoadingTeacherData);
    console.log('teacherDataLoadPromise exists:', !!teacherDataLoadPromise);
    
    // If we're already loading, return the existing promise
    if (teacherDataLoadPromise) {
        console.log('Teacher data already loading, returning existing promise');
        return teacherDataLoadPromise;
    }
    
    // If data is already loaded and we're not explicitly resetting, skip
    if (teacherDataLoaded && !isLoadingTeacherData) {
        console.log('Teacher data already loaded and not loading, skipping...');
        return Promise.resolve();
    }
    
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastLoadTeacherDataCall < 1000) { // 1 second minimum between calls
        console.log('loadTeacherData called too soon, skipping...');
        return Promise.resolve();
    }
    lastLoadTeacherDataCall = now;
    
    console.log('Starting new teacher data load...');
    isLoadingTeacherData = true;
    
    // Create the loading promise with proper error handling
    teacherDataLoadPromise = loadTeacherDataInternal().catch(error => {
        console.error('Teacher data loading failed:', error);
        // Don't re-throw the error to prevent unhandled promise rejection
        return null;
    });
    
    try {
        await teacherDataLoadPromise;
    } catch (error) {
        console.error('Error in loadTeacherData:', error);
        // Don't re-throw to prevent unhandled promise rejection
    } finally {
        // Always clean up
        teacherDataLoadPromise = null;
        isLoadingTeacherData = false;
        teacherDataLoaded = true;
        console.log('=== LOAD TEACHER DATA DEBUG END ===');
    }
    
    return teacherDataLoadPromise;
}

async function loadTeacherDataInternal() {
    try {
        console.log('Starting internal teacher data loading...');
        
        // Load teacher profile from API
        console.log('Loading teacher profile...');
        const profile = await apiCall('/teachers/my-profile');
        console.log('Profile loaded from API:', profile);
        
        if (profile) {
            console.log('Calling populateTeacherProfile with:', profile);
            populateTeacherProfile(profile);
            console.log('populateTeacherProfile completed');
        } else {
            console.log('No profile data received from API');
        }
        
        // Load instruments for teacher profile
        console.log('Loading instruments...');
        const instruments = await apiCall('/students/instruments');
        console.log('Instruments loaded:', instruments);
        populateInstrumentsCheckboxes(instruments);
        
        // Load availability from API
        try {
            const availability = await apiCall('/teachers/availability');
            window.allAvailability = availability || [];
            populateAvailabilityList(availability || []);
        } catch (availabilityError) {
            console.log('No availability found or error loading availability:', availabilityError);
            window.allAvailability = [];
            populateAvailabilityList([]);
        }
        
        // Load lessons from API
        try {
            const lessons = await apiCall('/teachers/my-lessons');
            window.allLessons = lessons || [];
            populateTeacherLessons(lessons || []);
        } catch (lessonError) {
            console.log('No lessons found or error loading lessons:', lessonError);
            window.allLessons = [];
            populateTeacherLessons([]);
        }
        
        console.log('Teacher data loading completed successfully');
        
        // Add a delay to see if something happens after this
        setTimeout(() => {
            console.log('=== 2 SECONDS AFTER TEACHER DATA LOADED ===');
            console.log('Checking if anything triggered a reload...');
        }, 2000);
        
    } catch (error) {
        console.error('Error loading teacher data:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        // Don't show alert to prevent page reload issues
        console.log('Teacher data loading failed, but continuing...');
        // Don't re-throw the error - let the caller handle it
    }
}

function populateTeacherProfile(profile) {
    try {
        console.log('populateTeacherProfile called with:', profile);
        
        // Handle both capitalized and lowercase property names
        const name = profile.Name || profile.name || '';
        const email = profile.Email || profile.email || '';
        const hourlyRate = profile.HourlyRate || profile.hourlyRate || '';
        const description = profile.Description || profile.description || '';
        
        console.log('About to populate form fields...');
        
        // Temporarily disable ALL event listeners to prevent any cascading effects
        const defaultCostElement = document.getElementById('defaultLessonCost');
        const availabilityCostElement = document.getElementById('availabilityCost');
        const teacherNameElement = document.getElementById('teacherName');
        const teacherEmailElement = document.getElementById('teacherProfileEmail');
        const teacherBioElement = document.getElementById('teacherBio');
        
        // Remove ALL event listeners temporarily
        if (availabilityCostElement) {
            availabilityCostElement.removeEventListener('input', loadDefaultAvailabilityCost);
        }
        
        // Also check for any form submission listeners
        const teacherProfileForm = document.getElementById('teacherProfileForm');
        if (teacherProfileForm) {
            console.log('Temporarily disabling teacher profile form...');
            teacherProfileForm.style.pointerEvents = 'none';
        }
        
        console.log('Setting form field values...');
        teacherNameElement.value = name;
        teacherEmailElement.value = email;
        defaultCostElement.value = hourlyRate;
        teacherBioElement.value = description;
        
        console.log('Form fields populated:', {
            name: name,
            email: email,
            hourlyRate: hourlyRate,
            description: description
        });
        
        // Store the user's name for navigation display
        if (name) {
            userDisplayName = name;
            updateNavigation(); // Update navigation with the actual name
        }
        
        // Re-enable everything after a delay
        setTimeout(() => {
            console.log('Re-enabling form and event listeners...');
            if (teacherProfileForm) {
                teacherProfileForm.style.pointerEvents = 'auto';
            }
            if (availabilityCostElement) {
                availabilityCostElement.addEventListener('input', loadDefaultAvailabilityCost);
            }
        }, 500); // Longer delay to ensure everything is set
        
        // Handle instruments - the instruments will be populated by populateInstrumentsCheckboxes
        // and then we'll check the ones that match the saved instruments
        const instruments = profile.Instruments || profile.instruments;
        if (instruments) {
            console.log('Saved instruments:', instruments);
            // Store the saved instruments for later use when checkboxes are created
            window.savedTeacherInstruments = instruments.split(', ').filter(i => i.trim() !== '');
            console.log('Saved instruments array:', window.savedTeacherInstruments);
        }
        
        console.log('populateTeacherProfile completed successfully');
    } catch (error) {
        console.error('Error in populateTeacherProfile:', error);
        console.error('Error stack:', error.stack);
    }
}

async function handleTeacherProfile(event) {
    event.preventDefault();
    
    const name = document.getElementById('teacherName').value;
    const email = document.getElementById('teacherProfileEmail').value;
    const hourlyRate = parseFloat(document.getElementById('defaultLessonCost').value) || 0;
    const description = document.getElementById('teacherBio').value;
    
    // Get selected instruments
    const selectedInstruments = Array.from(document.querySelectorAll('input[name="profileTeacherInstruments"]:checked'))
        .map(checkbox => checkbox.value);
    const instruments = selectedInstruments.join(', ');
    
    try {
        const response = await fetch(`${API_BASE_URL}/teachers/profile`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                hourlyRate,
                description,
                instruments
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Profile updated successfully!');
        } else {
            alert('Failed to update profile: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
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
        // Convert 24-hour time to 12-hour format for consistency
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const time12Hour = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
        
        console.log('Original time (24-hour):', time);
        console.log('Converted time (12-hour):', time12Hour);
        
        const response = await apiCall('/teachers/schedule-lesson', 'POST', {
            studentName: student,
            instrument: instrument,
            lessonDate: date,
            lessonTime: time12Hour,
            duration: duration,
            lessonType: type,
            cost: cost,
            notes: notes
        });
        
        // Use the real lesson ID returned from the API
        const lessonId = response.lessonId;
        
        // Create new lesson object
        const [hours2, minutes2] = time.split(':').map(Number);
        const startMinutes = hours2 * 60 + minutes2;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        
        const newLesson = {
            id: lessonId, // Use the real database ID
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
        
        // Convert to 12-hour format with AM/PM
        const period = endHours >= 12 ? 'PM' : 'AM';
        const hours12 = endHours === 0 ? 12 : endHours > 12 ? endHours - 12 : endHours;
        
        const endTime = `${hours12}:${endMins.toString().padStart(2, '0')} ${period}`;
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
function formatTime12Hour(timeInput) {
    if (!timeInput || typeof timeInput !== 'string') {
        return '--:--';
    }
    
    // Check if it's already in 12-hour format (contains AM/PM)
    if (timeInput.includes('AM') || timeInput.includes('PM')) {
        return timeInput; // Already in 12-hour format
    }
    
    // Handle 24-hour format
    const [hours, minutes] = timeInput.split(':').map(Number);
    
    // Check if parsing was successful
    if (isNaN(hours) || isNaN(minutes)) {
        return '--:--';
    }
    
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
    console.log('populateInstrumentsCheckboxes called with:', instruments);
    const container = document.getElementById('instrumentsCheckboxes');
    console.log('Container found:', container);
    
    if (!container) {
        console.error('instrumentsCheckboxes container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (!instruments || instruments.length === 0) {
        console.log('No instruments to display');
        container.innerHTML = '<p class="text-muted">No instruments available.</p>';
        return;
    }
    
    instruments.forEach(instrument => {
        console.log('Creating checkbox for instrument:', instrument);
        const div = document.createElement('div');
        div.className = 'form-check';
        
        // Check if this instrument should be checked based on saved teacher instruments
        const isChecked = window.savedTeacherInstruments && 
                        window.savedTeacherInstruments.includes(instrument.Name || instrument.name);
        
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" name="profileTeacherInstruments" value="${instrument.Name || instrument.name}" id="instrument${instrument.Id || instrument.id}" ${isChecked ? 'checked' : ''}>
            <label class="form-check-label" for="instrument${instrument.Id || instrument.id}">
                ${instrument.Name || instrument.name}
            </label>
        `;
        container.appendChild(div);
    });
    
    console.log('Instruments checkboxes populated');
    console.log('Saved teacher instruments:', window.savedTeacherInstruments);
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
    // startTime is already in 24-hour format from HTML time input (e.g., "14:30")
    const [hours, minutes] = startTime.split(':').map(Number);
    const hours24 = hours;
    
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
            StartTime: `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
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
        // Handle both property name formats (API returns capitalized, local data uses lowercase)
        const slotDateValue = slot.Date || slot.date;
        const slotStartTime = slot.StartTime || slot.startTime;
        const slotEndTime = slot.EndTime || slot.endTime;
        
        // Check if it's the same date - handle both formats safely
        let slotDate;
        try {
            slotDate = new Date(slotDateValue).toISOString().split('T')[0];
        } catch (error) {
            console.warn('Invalid date format in slot:', slotDateValue);
            return false;
        }
        
        if (slotDate !== newDate) {
            return false;
        }
        
        // Parse existing availability times
        const [slotStartHours, slotStartMins] = slotStartTime.split(':').map(Number);
        const [slotEndHours, slotEndMins] = slotEndTime.split(':').map(Number);
        
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
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!lessons || lessons.length === 0) {
        container.innerHTML = '<p class="text-muted">No lessons booked.</p>';
        return;
    }
    
    // Store lessons globally for filtering
    window.allLessons = lessons;
    
    lessons.forEach(lesson => {
        const div = document.createElement('div');
        div.className = 'card booking-card mb-3 lesson-item';
        
        const studentName = lesson.StudentName || lesson.studentName || 'Unknown Student';
        const instrument = lesson.Instrument || lesson.instrument || 'Unknown Instrument';
        const status = lesson.Status || lesson.status || 'Confirmed';
        const lessonId = lesson.Id || lesson.id;
        
        div.setAttribute('data-student', studentName.toLowerCase());
        div.setAttribute('data-instrument', instrument.toLowerCase());
        div.setAttribute('data-status', status);
        
        const statusColor = status === 'Completed' ? 'success' : 
                           status === 'Confirmed' ? 'info' : 
                           status === 'Pending' ? 'warning' : 'secondary';
        
        const date = new Date(lesson.LessonDate || lesson.lessonDate);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const startTime = lesson.StartTime || lesson.startTime || '';
        const endTime = lesson.EndTime || lesson.endTime || '';
        const lessonType = lesson.LessonType || lesson.lessonType || 'In-Person';
        const cost = lesson.TotalCost || lesson.totalCost || 0;
        const studentEmail = lesson.StudentEmail || lesson.studentEmail || 'N/A';
        const studentLevel = lesson.StudentLevel || lesson.studentLevel || 'N/A';
        
        div.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="mb-0">${studentName}</h6>
                            <span class="badge bg-${statusColor}">${status}</span>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-1"><i class="bi bi-music-note"></i> <strong>Instrument:</strong> ${instrument}</p>
                                <p class="mb-1"><i class="bi bi-person"></i> <strong>Type:</strong> ${lessonType}</p>
                                <p class="mb-1"><i class="bi bi-envelope"></i> <strong>Email:</strong> ${studentEmail}</p>
                                <p class="mb-1"><i class="bi bi-star"></i> <strong>Level:</strong> ${studentLevel}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1"><i class="bi bi-calendar"></i> <strong>Date:</strong> ${dateStr}</p>
                                <p class="mb-1"><i class="bi bi-clock"></i> <strong>Time:</strong> ${startTime} - ${endTime}</p>
                                <p class="mb-1"><i class="bi bi-currency-dollar"></i> <strong>Cost:</strong> $${cost}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="d-flex flex-column gap-2">
                            ${status === 'Confirmed' ? `
                                <button class="btn btn-warning btn-sm" onclick="markCompleted(${lessonId})">
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
    
    // Find the specific lesson card in the DOM and update only that one
    const lessonCards = document.querySelectorAll('.lesson-item');
    lessonCards.forEach(card => {
        // Check if this card has the specific lesson ID in its action buttons
        const actionButtons = card.querySelector('.d-flex.flex-column.gap-2');
        if (actionButtons) {
            // Look for buttons with onclick that contains this lessonId
            const hasThisLessonId = actionButtons.innerHTML.includes(`onclick="confirmLesson(${lessonId})"`) ||
                                   actionButtons.innerHTML.includes(`onclick="markCompleted(${lessonId})"`) ||
                                   actionButtons.innerHTML.includes(`onclick="viewLessonDetails(${lessonId})"`);
            
            if (hasThisLessonId && card.getAttribute('data-status') !== newStatus) {
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
        // Load student profile from API
        console.log('Loading student profile...');
        const profile = await apiCall('/students/my-profile');
        console.log('Student profile loaded from API:', profile);
        
        if (profile) {
            console.log('Calling populateStudentProfile with:', profile);
            populateStudentProfile(profile);
            console.log('populateStudentProfile completed');
        } else {
            console.log('No student profile data received from API');
        }
        
        // Load instruments for filtering
        const instruments = await apiCall('/students/instruments');
        populateInstrumentFilter(instruments);
        
        // Load teachers
        await loadTeachers();
        
        // Load student bookings
        try {
            const bookings = await apiCall('/students/my-bookings');
            populateStudentBookings(bookings);
        } catch (error) {
            console.error('Error loading student bookings:', error);
        }
        
    } catch (error) {
        console.error('Error loading student data:', error);
        // Don't show alert, just log the error
        console.log('Some student data not yet implemented in API');
    }
}

function populateStudentProfile(profile) {
    document.getElementById('studentName').value = profile.name || '';
    document.getElementById('studentProfileEmail').value = profile.email || '';
    document.getElementById('studentPayment').value = profile.paymentInfo || '';
    
    // Store the user's name for navigation display
    if (profile.name) {
        userDisplayName = profile.name;
        updateNavigation(); // Update navigation with the actual name
    }
    
    // Handle multiple instruments - split comma-separated string and check boxes
    if (profile.instruments) {
        const instruments = profile.instruments.split(',').map(inst => inst.trim());
        instruments.forEach(instrument => {
            const instrumentCheckbox = document.querySelector(`input[name="studentProfileInstruments"][value="${instrument}"]`);
            if (instrumentCheckbox) {
                instrumentCheckbox.checked = true;
            }
        });
    }
    
    // Handle level
    if (profile.level) {
        document.getElementById('studentLevel').value = profile.level;
    }
}

async function handleStudentProfile(event) {
    event.preventDefault();
    
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentProfileEmail').value;
    const payment = document.getElementById('studentPayment').value;
    
    // Get selected instruments (checkboxes)
    const selectedInstruments = Array.from(document.querySelectorAll('input[name="studentProfileInstruments"]:checked'))
        .map(checkbox => checkbox.value);
    const instruments = selectedInstruments.join(', ');
    const level = document.getElementById('studentLevel').value;
    
    try {
        await apiCall('/students/profile', 'POST', {
            name,
            email,
            paymentInfo: payment,
            instruments,
            level
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
        console.log('=== LOAD TEACHERS DEBUG ===');
        console.log('Loading teachers from /teachers/all endpoint...');
        
        // Use the correct API endpoint
        const teachers = await apiCall('/teachers/all');
        console.log('Teachers loaded from API:', teachers);
        console.log('Number of teachers:', teachers ? teachers.length : 0);
        
        if (teachers && teachers.length > 0) {
            console.log('First teacher:', teachers[0]);
        }
        
        populateTeachersList(teachers, instrumentId);
        console.log('=== LOAD TEACHERS DEBUG END ===');
    } catch (error) {
        console.error('Error loading teachers:', error);
        alert('Failed to load teachers. Please try again.');
    }
}

function populateTeachersList(teachers, instrumentFilter = null) {
    console.log('=== POPULATE TEACHERS LIST DEBUG ===');
    console.log('Teachers received:', teachers);
    console.log('Teachers type:', typeof teachers);
    console.log('Teachers length:', teachers ? teachers.length : 'null/undefined');
    console.log('Instrument filter:', instrumentFilter);
    
    const container = document.getElementById('teachersList');
    const guestContainer = document.getElementById('guestTeachersList');
    
    console.log('Container found:', !!container);
    console.log('Guest container found:', !!guestContainer);
    
    [container, guestContainer].forEach(target => {
        if (target) {
            console.log('Clearing target container...');
            target.innerHTML = '';
            
            if (!teachers || teachers.length === 0) {
                console.log('No teachers found, showing empty message');
                target.innerHTML = '<p class="text-muted">No teachers found.</p>';
                return;
            }
            
            console.log(`Processing ${teachers.length} teachers...`);
            
            // Filter teachers by instrument if specified
            let filteredTeachers = teachers;
            if (instrumentFilter) {
                filteredTeachers = teachers.filter(teacher => {
                    // Check if teacher teaches the selected instrument
                    return teacher.Instruments && teacher.Instruments.some(inst => 
                        inst.Id === instrumentFilter || 
                        inst.Name === instrumentFilter
                    );
                });
            }
            
            if (filteredTeachers.length === 0) {
                console.log('No teachers match the filter');
                target.innerHTML = '<p class="text-muted">No teachers found for the selected instrument.</p>';
                return;
            }
            
            console.log(`Displaying ${filteredTeachers.length} filtered teachers`);
            
            filteredTeachers.forEach((teacher, index) => {
                console.log(`Processing teacher ${index + 1}:`, teacher);
                
                const div = document.createElement('div');
                div.className = 'teacher-card';
                
                // Get teacher's instruments - handle both cases
                const instruments = (teacher.Instruments || teacher.instruments) ? 
                    (teacher.Instruments || teacher.instruments).map(inst => inst.Name || inst.name).join(', ') : 
                    'Not specified';
                
                // Get teacher's bio/description - handle both cases
                const bio = teacher.Bio || teacher.bio || 'No description available';
                
                // Get teacher's rate - handle both cases
                const rate = teacher.DefaultLessonCost || teacher.defaultLessonCost || 'Contact for pricing';
                
                // Get teacher's name - handle both cases
                const teacherName = teacher.Name || teacher.name || teacher.Username || teacher.username || 'Teacher';
                
                // Get teacher's contact - handle both cases
                const contact = teacher.ContactInfo || teacher.contactInfo || teacher.Email || teacher.email || 'Not provided';
                
                console.log(`Teacher ${index + 1} data:`, {
                    name: teacherName,
                    bio: bio,
                    rate: rate,
                    instruments: instruments,
                    contact: contact
                });
                
                div.innerHTML = `
                    <div class="row">
                        <div class="col-md-8">
                            <h5>${teacherName}</h5>
                            <p class="text-muted">${bio}</p>
                            <p><strong>Rate:</strong> $${rate}/lesson</p>
                            <p><strong>Instruments:</strong> ${instruments}</p>
                            <p><strong>Contact:</strong> ${contact}</p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-primary" onclick="viewTeacherAvailability(${teacher.Id || teacher.id})">
                                View Availability
                            </button>
                        </div>
                    </div>
                `;
                target.appendChild(div);
            });
        }
    });
    
    console.log('=== POPULATE TEACHERS LIST DEBUG END ===');
}

async function loadGuestTeachers() {
    try {
        const instruments = await apiCall('/students/instruments');
        populateInstrumentFilter(instruments);
        await loadTeachers();
    } catch (error) {
        console.error('Error loading guest teachers:', error);
        // Use fallback approach
        console.log('Using fallback for guest teachers');
        const mockInstruments = [
            { Id: 1, Name: "Piano" },
            { Id: 2, Name: "Guitar" },
            { Id: 3, Name: "Violin" },
            { Id: 4, Name: "Drums" },
            { Id: 5, Name: "Voice/Singing" }
        ];
        populateInstrumentFilter(mockInstruments);
        await loadTeachers();
    }
}

function filterTeachersByInstrument() {
    const filter = document.getElementById('instrumentFilter') || document.getElementById('guestInstrumentFilter');
    const instrumentId = filter.value;
    
    // Reload teachers with the selected instrument filter
    loadTeachers(instrumentId);
}

async function viewTeacherAvailability(teacherId) {
    try {
        const availability = await apiCall(`/teachers/${teacherId}/availability`);
        // Get teacher info from the teachers list
        const teachers = await apiCall('/teachers/all');
        const teacher = teachers.find(t => (t.Id || t.id) === teacherId);
        await showBookingModal(teacherId, teacher, availability);
    } catch (error) {
        console.error('Error loading teacher availability:', error);
        alert('Failed to load availability. Please try again.');
    }
}

async function showBookingModal(teacherId, teacher, availability) {
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    const content = document.getElementById('bookingModalContent');
    
    // Get student profile data
    let studentProfile = null;
    try {
        studentProfile = await apiCall('/students/my-profile');
    } catch (error) {
        console.error('Error loading student profile:', error);
    }
    
    const teacherName = teacher?.Name || teacher?.name || 'Teacher';
    
    if (!availability || availability.length === 0) {
        content.innerHTML = `
            <div class="alert alert-info">
                <h6>${teacherName}</h6>
                <p class="mb-0">No available time slots at the moment. Please check back later!</p>
            </div>
        `;
        modal.show();
        return;
    }
    
    // Format and display availability slots
    let slotsHTML = `
        <div class="mb-3">
            <h6>${teacherName}</h6>
            <p class="text-muted mb-3">Select a time slot to book a lesson:</p>
        </div>
        <div class="list-group">
    `;
    
    availability.forEach((slot, index) => {
        const date = new Date(slot.Date);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const cost = slot.Cost || slot.cost || 0;
        const costDisplay = cost && cost !== 0 ? `$${cost}` : 'Contact for pricing';
        const isVirtual = slot.IsVirtual || slot.isVirtual ? 'Virtual' : 'In-Person';
        const notes = slot.Notes || slot.notes || '';
        
        slotsHTML += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${dateStr}</h6>
                        <p class="mb-1">
                            <strong>Time:</strong> ${slot.StartTime || slot.startTime} - ${slot.EndTime || slot.endTime}
                        </p>
                        <p class="mb-1">
                            <strong>Type:</strong> ${isVirtual} | 
                            <strong>Cost:</strong> ${costDisplay}
                        </p>
                        ${notes ? `<p class="mb-1 text-muted"><small>${notes}</small></p>` : ''}
                    </div>
                    <button class="btn btn-primary book-slot-btn" 
                            data-teacher-id="${teacherId}" 
                            data-slot-id="${slot.Id || slot.id}" 
                            data-teacher-name="${(teacherName || '').replace(/"/g, '&quot;')}" 
                            data-lesson-date="${slot.Date || slot.date}" 
                            data-start-time="${slot.StartTime || slot.startTime}" 
                            data-end-time="${slot.EndTime || slot.endTime}" 
                            data-cost="${cost || 0}" 
                            data-is-virtual="${slot.IsVirtual || slot.isVirtual ? 'true' : 'false'}">
                        Book This Slot
                    </button>
                </div>
            </div>
        `;
    });
    
    slotsHTML += `
        </div>
        ${studentProfile ? '' : '<div class="alert alert-warning mt-3"><small>Please complete your student profile before booking.</small></div>'}
    `;
    
    content.innerHTML = slotsHTML;
    
    // Attach event listeners to all booking buttons
    content.querySelectorAll('.book-slot-btn').forEach(button => {
        button.addEventListener('click', function() {
            const teacherId = parseInt(this.getAttribute('data-teacher-id'));
            const slotId = parseInt(this.getAttribute('data-slot-id'));
            const teacherName = this.getAttribute('data-teacher-name');
            const lessonDate = this.getAttribute('data-lesson-date');
            const startTime = this.getAttribute('data-start-time');
            const endTime = this.getAttribute('data-end-time');
            const cost = parseFloat(this.getAttribute('data-cost'));
            const isVirtual = this.getAttribute('data-is-virtual') === 'true';
            
            bookLesson(teacherId, slotId, teacherName, lessonDate, startTime, endTime, cost, isVirtual);
        });
    });
    
    modal.show();
}

async function bookLesson(teacherId, availabilitySlotId, teacherName, lessonDate, startTime, endTime, cost, isVirtual) {
    try {
        // Get student profile to get name and instrument
        const studentProfile = await apiCall('/students/my-profile');
        
        if (!studentProfile || !studentProfile.name) {
            alert('Please complete your student profile before booking a lesson.');
            return;
        }
        
        // Get student's first instrument (or prompt for one)
        const instruments = studentProfile.instruments ? studentProfile.instruments.split(',').map(i => i.trim()) : [];
        if (instruments.length === 0) {
            alert('Please add at least one instrument to your profile before booking.');
            return;
        }
        
        // For now, use the first instrument. In the future, could prompt user to select
        const instrument = instruments[0];
        
        // Format date for display
        const dateObj = new Date(lessonDate);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        
        // Confirm booking
        const confirmMessage = `Book lesson with ${teacherName || 'teacher'}?\n\n` +
            `Date: ${dateStr}\n` +
            `Time: ${startTime} - ${endTime}\n` +
            `Instrument: ${instrument}\n` +
            `Type: ${isVirtual ? 'Virtual' : 'In-Person'}\n` +
            `Cost: $${cost}\n\n` +
            `Confirm booking?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Call booking API - match backend property names exactly
        const bookingData = {
            TeacherId: teacherId,
            AvailabilitySlotId: availabilitySlotId,
            StudentName: studentProfile.name,
            Instrument: instrument,
            LessonDate: lessonDate,
            StartTime: startTime,
            EndTime: endTime,
            LessonType: isVirtual ? 'Virtual' : 'In-Person',
            Cost: cost && !isNaN(cost) ? cost : 0,
            Notes: ''
        };
        
        console.log('Booking data being sent:', bookingData);
        const result = await apiCall('/students/book-lesson', 'POST', bookingData);
        
        alert('Lesson booked successfully!');
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
        if (modal) {
            modal.hide();
        }
        
        // Reload student data to show the new booking
        await loadStudentData();
        
    } catch (error) {
        console.error('Error booking lesson:', error);
        console.error('Error details:', error);
        
        // Get detailed error message
        let errorMessage = 'Failed to book lesson. ';
        if (error.message && error.message !== `API call failed: ${error.status}`) {
            errorMessage += error.message;
        } else if (error.response && error.response.message) {
            errorMessage += error.response.message;
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Please check the console for details.';
        }
        
        alert(errorMessage);
    }
}

function populateStudentBookings(bookings) {
    const container = document.getElementById('studentBookingsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="text-muted">No bookings found.</p>';
        return;
    }
    
    bookings.forEach(booking => {
        const div = document.createElement('div');
        div.className = 'card booking-card mb-3';
        
        const date = new Date(booking.LessonDate || booking.lessonDate);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const teacherName = booking.TeacherName || booking.teacherName || 'Teacher';
        const instrument = booking.Instrument || booking.instrument || 'Not specified';
        const lessonType = booking.LessonType || booking.lessonType || 'In-Person';
        const startTime = booking.StartTime || booking.startTime || '';
        const endTime = booking.EndTime || booking.endTime || '';
        const cost = booking.TotalCost || booking.totalCost || 0;
        const status = booking.Status || booking.status || 'Confirmed';
        const bookingId = booking.Id || booking.id;
        
        let statusBadgeClass = 'secondary';
        if (status === 'Completed') {
            statusBadgeClass = 'success';
        } else if (status === 'Confirmed') {
            statusBadgeClass = 'info';
        } else if (status === 'Pending') {
            statusBadgeClass = 'warning';
        }
        
        div.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>${teacherName}</h6>
                        <p class="mb-1"><strong>Instrument:</strong> ${instrument}</p>
                        <p class="mb-1"><strong>Type:</strong> ${lessonType}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-1"><strong>Date:</strong> ${dateStr}</p>
                        <p class="mb-1"><strong>Time:</strong> ${startTime} - ${endTime}</p>
                        <p class="mb-1"><strong>Cost:</strong> $${cost}</p>
                    </div>
                </div>
                <div class="mt-2">
                    <span class="badge bg-${statusBadgeClass}">${status}</span>
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
