// ==================== GLOBAL VARIABLES ====================
let currentDate = new Date().toISOString().split('T')[0];
let currentPage = 'login';
let employees = [];      // { id, name, defaultWage, password, enabled }
let machines = [];       // { id, machineNo, description, enabled }
let dailyEntries = [];   // { id, date, employeeId, employeeName, attendance, machineId, machineNo, machineWorkhour, machineExpenses, empWage, description }
let customers = [];      // { id, date, name, phoneNo, workDay, paymentMethod, amount, discount, totalAmount }
let lastSaveTime = new Date();

// Authentication
let currentUser = null;   // { role: 'admin' } or { role: 'employee', employeeId, name }

// Selected filter for admin search
let selectedFilter = null;

// ==================== DOM ELEMENTS ====================
const loginPage = document.getElementById('login-page');
const adminSidebar = document.getElementById('sidebar');
const employeeSidebar = document.getElementById('employee-sidebar');
const adminDashboard = document.getElementById('dashboard');
const employeeDashboard = document.getElementById('employee-dashboard');
const modulePages = document.querySelectorAll('.module-page');
const backButtons = document.querySelectorAll('.back-btn');
const storageStatus = document.getElementById('storage-status');
const adminLoginForm = document.getElementById('admin-login-form');
const employeeLoginForm = document.getElementById('employee-login-form');
const adminTab = document.getElementById('admin-tab');
const employeeTab = document.getElementById('employee-tab');
const adminLoginBtn = document.getElementById('admin-login-btn');
const employeeLoginBtn = document.getElementById('employee-login-btn');
const logoutBtns = document.querySelectorAll('#logout-btn, #sidebar-logout-btn, #employee-logout-btn, #employee-logout-btn2');

// Search elements
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const searchFromDate = document.getElementById('search-from-date');
const searchToDate = document.getElementById('search-to-date');
const selectedFilterText = document.getElementById('selectedFilterText');
const employeeSubmenu = document.getElementById('employeeSubmenu');
const machineSubmenu = document.getElementById('machineSubmenu');
const customerSubmenu = document.getElementById('customerSubmenu');

// ==================== HELPER FUNCTIONS ====================
function getNextId(arr) {
    return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

// Populate filter dropdown (for admin search)
function populateFilterDropdown() {
    employeeSubmenu.innerHTML = '';
    employees.filter(e => e.enabled).forEach(emp => {
        const item = document.createElement('div');
        item.className = 'filter-submenu-item';
        item.textContent = emp.name;
        item.dataset.id = emp.id;
        item.dataset.type = 'employee';
        item.dataset.name = emp.name;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFilter = { type: 'employee', id: emp.id, name: emp.name };
            selectedFilterText.textContent = `Employee: ${emp.name}`;
        });
        employeeSubmenu.appendChild(item);
    });
    if (employeeSubmenu.children.length === 0) {
        employeeSubmenu.innerHTML = '<div class="filter-submenu-item" style="font-style:italic;">No employees</div>';
    }

    machineSubmenu.innerHTML = '';
    machines.filter(m => m.enabled).forEach(mac => {
        const item = document.createElement('div');
        item.className = 'filter-submenu-item';
        item.textContent = mac.machineNo + (mac.description ? ' - ' + mac.description : '');
        item.dataset.id = mac.id;
        item.dataset.type = 'machine';
        item.dataset.name = mac.machineNo;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFilter = { type: 'machine', id: mac.id, name: mac.machineNo };
            selectedFilterText.textContent = `Machine: ${mac.machineNo}`;
        });
        machineSubmenu.appendChild(item);
    });
    if (machineSubmenu.children.length === 0) {
        machineSubmenu.innerHTML = '<div class="filter-submenu-item" style="font-style:italic;">No machines</div>';
    }

    customerSubmenu.innerHTML = '';
    customers.forEach(cust => {
        const item = document.createElement('div');
        item.className = 'filter-submenu-item';
        item.textContent = cust.name + (cust.phoneNo ? ' (' + cust.phoneNo + ')' : '');
        item.dataset.id = cust.id;
        item.dataset.type = 'customer';
        item.dataset.name = cust.name;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFilter = { type: 'customer', id: cust.id, name: cust.name };
            selectedFilterText.textContent = `Customer: ${cust.name}`;
        });
        customerSubmenu.appendChild(item);
    });
    if (customerSubmenu.children.length === 0) {
        customerSubmenu.innerHTML = '<div class="filter-submenu-item" style="font-style:italic;">No customers</div>';
    }
}

// ==================== DATA PERSISTENCE ====================
function loadAllData() {
    try {
        const saved = localStorage.getItem('accountingSystemData');
        if (saved) {
            const data = JSON.parse(saved);
            employees = data.employees || [];
            machines = data.machines || [];
            dailyEntries = data.dailyEntries || [];
            customers = data.customers || [];
            lastSaveTime = new Date(data.lastSaveTime || new Date());
        } else {
            // Default data with passwords
            employees = [
                { id: 1, name: 'John Doe', defaultWage: 150, password: 'john123', enabled: true },
                { id: 2, name: 'Jane Smith', defaultWage: 200, password: 'jane123', enabled: true }
            ];
            machines = [
                { id: 1, machineNo: 'M001', description: 'Primary machine', enabled: true },
                { id: 2, machineNo: 'M002', description: 'Secondary machine', enabled: true }
            ];
            dailyEntries = [];
            customers = [];
        }
        renderAll(); // admin renders
        populateFilterDropdown();
    } catch (e) {
        console.error('Load error', e);
    }
}

function saveAllData() {
    try {
        const data = { employees, machines, dailyEntries, customers, lastSaveTime: new Date().toISOString() };
        localStorage.setItem('accountingSystemData', JSON.stringify(data));
        lastSaveTime = new Date();
        updateStorageStatus();
        alert('Data saved successfully!');
        populateFilterDropdown();
    } catch (e) {
        alert('Save failed');
    }
}

function updateStorageStatus() {
    if (!storageStatus) return;
    const diff = Math.floor((new Date() - lastSaveTime) / 1000);
    let text = diff < 60 ? 'Just now' : diff < 3600 ? `${Math.floor(diff/60)} min ago` : `${Math.floor(diff/3600)} hr ago`;
    storageStatus.innerHTML = `<p><i class="fas fa-database"></i> Data saved locally. Last saved: ${text}</p>`;
}

function renderAll() {
    // Admin only
    renderDailyEntries();
    renderEmployees();
    renderMachines();
    renderCustomers();
    renderSettings();
}

// ==================== AUTHENTICATION ====================
function showLoginTab(tab) {
    if (tab === 'admin') {
        adminTab.classList.add('active');
        employeeTab.classList.remove('active');
        adminLoginForm.style.display = 'block';
        employeeLoginForm.style.display = 'none';
        document.getElementById('admin-login-error').style.display = 'none';
        document.getElementById('employee-login-error').style.display = 'none';
    } else {
        employeeTab.classList.add('active');
        adminTab.classList.remove('active');
        adminLoginForm.style.display = 'none';
        employeeLoginForm.style.display = 'block';
        document.getElementById('admin-login-error').style.display = 'none';
        document.getElementById('employee-login-error').style.display = 'none';
    }
}

function adminLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username === 'avinash' && password === 'avinash@123') {
        currentUser = { role: 'admin' };
        showAdminUI();
    } else {
        document.getElementById('admin-login-error').textContent = 'Invalid admin credentials';
        document.getElementById('admin-login-error').style.display = 'block';
    }
}

function employeeLogin() {
    const name = document.getElementById('emp-name').value.trim();
    const password = document.getElementById('emp-password').value.trim();
    // Find employee with matching name AND password AND enabled
    const employee = employees.find(e => e.name === name && e.password === password && e.enabled);
    if (employee) {
        currentUser = { role: 'employee', employeeId: employee.id, name: employee.name };
        showEmployeeUI();
        renderEmployeeWorkDetails();
        showPage('employee-dashboard');
    } else {
        document.getElementById('employee-login-error').textContent = 'Employee not found or incorrect password.';
        document.getElementById('employee-login-error').style.display = 'block';
    }
}

function logout() {
    currentUser = null;
    adminSidebar.style.display = 'none';
    employeeSidebar.style.display = 'none';
    adminDashboard.style.display = 'none';
    employeeDashboard.style.display = 'none';
    modulePages.forEach(p => p.style.display = 'none');
    loginPage.style.display = 'block';
    showLoginTab('admin'); // default to admin tab
}

function showAdminUI() {
    loginPage.style.display = 'none';
    adminSidebar.style.display = 'flex';
    employeeSidebar.style.display = 'none';
    adminDashboard.style.display = 'flex';
    employeeDashboard.style.display = 'none';
    modulePages.forEach(p => p.style.display = 'none');
    currentPage = 'dashboard';
    // Set date inputs
    document.getElementById('date-picker').value = currentDate;
    document.getElementById('daily-entry-date').value = currentDate;
    document.getElementById('employee-date').value = currentDate;
    document.getElementById('machine-date').value = currentDate;
    document.getElementById('customer-date').value = currentDate;
    const currentMonth = new Date().toISOString().slice(0,7);
    document.getElementById('pl-date').value = currentMonth;
    document.getElementById('summary-month').value = currentMonth;
    renderAll();
}

function showEmployeeUI() {
    loginPage.style.display = 'none';
    adminSidebar.style.display = 'none';
    employeeSidebar.style.display = 'flex';
    adminDashboard.style.display = 'none';
    employeeDashboard.style.display = 'flex';
    modulePages.forEach(p => p.style.display = 'none');
    document.getElementById('employee-welcome-name').textContent = currentUser.name;
    document.getElementById('employee-work-welcome').textContent = `Welcome, ${currentUser.name}! Here are your work details:`;
    currentPage = 'employee-dashboard';
}

// ==================== PAGE NAVIGATION ====================
function showPage(page) {
    if (currentUser && currentUser.role === 'admin') {
        // Admin pages
        adminDashboard.style.display = 'none';
        employeeDashboard.style.display = 'none';
        modulePages.forEach(p => p.style.display = 'none');
        if (page === 'dashboard') {
            adminDashboard.style.display = 'flex';
        } else {
            const el = document.getElementById(page);
            if (el) {
                el.style.display = 'flex';
                // Special handling for certain pages
                if (page === 'daily-entry') renderDailyEntries();
                else if (page === 'employee-attendance') renderEmployees();
                else if (page === 'machine-page') renderMachines();
                else if (page === 'customer-details') renderCustomers();
                else if (page === 'profit-loss') calculateProfitLoss();
                else if (page === 'monthly-summary') calculateMonthlySummary();
                else if (page === 'settings') renderSettings();
            }
        }
        // Update sidebar active
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === page) link.classList.add('active');
        });
    } else if (currentUser && currentUser.role === 'employee') {
        // Employee pages
        adminDashboard.style.display = 'none';
        employeeDashboard.style.display = 'none';
        modulePages.forEach(p => p.style.display = 'none');
        if (page === 'employee-dashboard') {
            employeeDashboard.style.display = 'flex';
        } else if (page === 'employee-work-details') {
            document.getElementById('employee-work-details').style.display = 'flex';
            renderEmployeeWorkDetails();
        }
        // Update employee sidebar active
        document.querySelectorAll('.employee-sidebar .sidebar-menu a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === page) link.classList.add('active');
        });
    }
}

// ==================== RENDER EMPLOYEE WORK DETAILS ====================
function renderEmployeeWorkDetails() {
    if (!currentUser || currentUser.role !== 'employee') return;
    const tbody = document.getElementById('employee-work-tbody');
    tbody.innerHTML = '';
    const employeeRecords = dailyEntries.filter(d => d.employeeId === currentUser.employeeId);
    if (employeeRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No work records found.</td></tr>';
        return;
    }
    employeeRecords.sort((a,b) => a.date.localeCompare(b.date)).forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.attendance ? 'Present' : 'Absent'}</td>
            <td>${entry.machineNo || 'None'}</td>
            <td>${entry.machineWorkhour || 0}</td>
            <td>₹${entry.machineExpenses || 0}</td>
            <td>₹${entry.empWage || 0}</td>
            <td>${entry.description || ''}</td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== ALL ADMIN RENDERING FUNCTIONS (updated with password) ====================
function renderDailyEntries() {
    const date = document.getElementById('daily-entry-date').value || currentDate;
    const tbody = document.getElementById('daily-entry-table-body');
    tbody.innerHTML = '';
    const enabledEmployees = employees.filter(e => e.enabled);
    enabledEmployees.forEach((emp, idx) => {
        const existing = dailyEntries.find(d => d.date === date && d.employeeId === emp.id);
        const attendance = existing ? (existing.attendance ? 'checked' : '') : '';
        const machineId = existing ? existing.machineId : '';
        const machineWorkhour = existing ? existing.machineWorkhour : 0;
        const machineExpenses = existing ? existing.machineExpenses : 0;
        const empWage = existing ? existing.empWage : emp.defaultWage;
        const description = existing ? existing.description : '';
        let machineOptions = '<option value="">None</option>';
        machines.filter(m => m.enabled).forEach(m => {
            const selected = (machineId && m.id === machineId) ? 'selected' : '';
            machineOptions += `<option value="${m.id}" ${selected}>${m.machineNo}</option>`;
        });
        const row = document.createElement('tr');
        row.setAttribute('data-employee-id', emp.id);
        row.innerHTML = `
            <td>${idx+1}</td>
            <td>${emp.name}</td>
            <td><input type="checkbox" class="attendance" ${attendance}></td>
            <td><select class="machine-select">${machineOptions}</select></td>
            <td><input type="number" class="machine-workhour" value="${machineWorkhour}" step="0.1" min="0"></td>
            <td><input type="number" class="machine-expenses" value="${machineExpenses}" step="1" min="0"></td>
            <td><input type="number" class="emp-wage" value="${empWage}" step="1" min="0"></td>
            <td><input type="text" class="description" value="${description}"></td>
        `;
        tbody.appendChild(row);
    });
}

function renderEmployees() {
    const date = document.getElementById('employee-date').value || currentDate;
    const tbody = document.getElementById('employee-table-body');
    tbody.innerHTML = '';
    employees.filter(e => e.enabled).forEach((emp, idx) => {
        const entry = dailyEntries.find(d => d.date === date && d.employeeId === emp.id);
        const attendance = entry ? (entry.attendance ? 'Yes' : 'No') : 'No';
        const machineNo = entry ? entry.machineNo : '';
        const wage = entry ? entry.empWage : '';
        tbody.innerHTML += `<tr><td>${idx+1}</td><td>${emp.name}</td><td>${attendance}</td><td>${machineNo}</td><td>${wage ? '₹'+wage : ''}</td></tr>`;
    });
}

function renderMachines() {
    const date = document.getElementById('machine-date').value || currentDate;
    const tbody = document.getElementById('machine-table-body');
    tbody.innerHTML = '';
    const entriesForDate = dailyEntries.filter(d => d.date === date && d.machineId);
    entriesForDate.forEach((entry, idx) => {
        tbody.innerHTML += `<tr><td>${idx+1}</td><td>${entry.machineNo}</td><td>${entry.employeeName}</td><td>${entry.machineWorkhour}</td><td>₹${entry.machineExpenses}</td></tr>`;
    });
    if (entriesForDate.length === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No machine usage for this date.</td></tr>';
}

function renderCustomers() {
    const date = document.getElementById('customer-date').value || currentDate;
    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = '';
    customers.filter(c => c.date === date).forEach((c, idx) => {
        tbody.innerHTML += `<tr><td>${idx+1}</td><td>${c.date}</td><td>${c.name}</td><td>${c.phoneNo || ''}</td><td>${c.workDay || 0}</td><td>${c.paymentMethod || ''}</td><td>₹${c.amount || 0}</td><td>₹${c.discount || 0}</td><td>₹${c.totalAmount || 0}</td><td><button class="btn btn-danger" onclick="removeCustomer(${c.id})">Remove</button></td></tr>`;
    });
}

function renderSettings() {
    const empTbody = document.getElementById('settings-employees-tbody');
    empTbody.innerHTML = '';
    employees.forEach((emp, idx) => {
        empTbody.innerHTML += `<tr>
            <td>${idx+1}</td>
            <td>${emp.name}</td>
            <td>₹${emp.defaultWage}</td>
            <td>${emp.password || ''}</td>
            <td><input type="checkbox" ${emp.enabled ? 'checked' : ''} onchange="toggleEmployeeEnabled(${emp.id})"></td>
            <td><button class="btn btn-danger btn-sm" onclick="removeEmployee(${emp.id})">Remove</button>
            <button class="btn btn-secondary btn-sm" onclick="editEmployee(${emp.id})">Edit</button></td>
        </tr>`;
    });
    const macTbody = document.getElementById('settings-machines-tbody');
    macTbody.innerHTML = '';
    machines.forEach((mac, idx) => {
        macTbody.innerHTML += `<tr><td>${idx+1}</td><td>${mac.machineNo}</td><td>${mac.description || ''}</td><td><input type="checkbox" ${mac.enabled ? 'checked' : ''} onchange="toggleMachineEnabled(${mac.id})"></td><td><button class="btn btn-danger btn-sm" onclick="removeMachine(${mac.id})">Remove</button></td></tr>`;
    });
}

// Admin actions
window.removeEmployee = function(id) { employees = employees.filter(e => e.id !== id); renderSettings(); saveAllData(); };
window.toggleEmployeeEnabled = function(id) { const e = employees.find(e => e.id === id); if (e) e.enabled = !e.enabled; renderSettings(); saveAllData(); };
window.editEmployee = function(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const newName = prompt('Enter new name:', emp.name);
    if (newName !== null) emp.name = newName;
    const newWage = prompt('Enter new default wage:', emp.defaultWage);
    if (newWage !== null) emp.defaultWage = parseFloat(newWage) || 0;
    const newPass = prompt('Enter new password:', emp.password);
    if (newPass !== null) emp.password = newPass;
    renderSettings();
    saveAllData();
};
window.removeMachine = function(id) { machines = machines.filter(m => m.id !== id); renderSettings(); saveAllData(); };
window.toggleMachineEnabled = function(id) { const m = machines.find(m => m.id === id); if (m) m.enabled = !m.enabled; renderSettings(); saveAllData(); };
window.removeCustomer = function(id) { customers = customers.filter(c => c.id !== id); renderCustomers(); saveAllData(); };
window.calculateCustomerTotal = function() {
    const amt = parseFloat(document.getElementById('new-customer-amount').value) || 0;
    const disc = parseFloat(document.getElementById('new-customer-discount').value) || 0;
    document.getElementById('new-customer-total-amount').value = (amt - disc).toFixed(2);
};

// Save functions
function saveDailyEntries() {
    const date = document.getElementById('daily-entry-date').value || currentDate;
    dailyEntries = dailyEntries.filter(d => d.date !== date);
    const rows = document.querySelectorAll('#daily-entry-table-body tr');
    rows.forEach(row => {
        const empId = parseInt(row.getAttribute('data-employee-id'));
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        const attendance = row.querySelector('.attendance').checked;
        const machineSelect = row.querySelector('.machine-select');
        const machineId = machineSelect.value ? parseInt(machineSelect.value) : null;
        const machine = machines.find(m => m.id === machineId);
        const machineNo = machine ? machine.machineNo : '';
        const machineWorkhour = parseFloat(row.querySelector('.machine-workhour').value) || 0;
        const machineExpenses = parseFloat(row.querySelector('.machine-expenses').value) || 0;
        const empWage = parseFloat(row.querySelector('.emp-wage').value) || 0;
        const description = row.querySelector('.description').value;
        dailyEntries.push({
            id: getNextId(dailyEntries), date, employeeId: emp.id, employeeName: emp.name,
            attendance, machineId, machineNo, machineWorkhour, machineExpenses, empWage, description
        });
    });
    saveAllData();
    renderDailyEntries();
}

function addCustomer() {
    const date = document.getElementById('customer-date').value || currentDate;
    const name = document.getElementById('new-customer-name').value;
    if (!name) { alert('Enter name'); return; }
    const amt = parseFloat(document.getElementById('new-customer-amount').value) || 0;
    const disc = parseFloat(document.getElementById('new-customer-discount').value) || 0;
    const total = amt - disc;
    customers.push({
        id: getNextId(customers), date, name,
        phoneNo: document.getElementById('new-customer-phone').value,
        workDay: parseFloat(document.getElementById('new-customer-work-day').value) || 0,
        paymentMethod: document.getElementById('new-customer-payment-method').value,
        amount: amt, discount: disc, totalAmount: total
    });
    renderCustomers();
    saveAllData();
    resetCustomerForm();
}

function resetCustomerForm() {
    document.getElementById('new-customer-name').value = '';
    document.getElementById('new-customer-phone').value = '';
    document.getElementById('new-customer-work-day').value = '';
    document.getElementById('new-customer-payment-method').value = '';
    document.getElementById('new-customer-amount').value = '';
    document.getElementById('new-customer-discount').value = '';
    document.getElementById('new-customer-total-amount').value = '';
}

function calculateProfitLoss() {
    const month = document.getElementById('pl-date').value;
    const monthEntries = dailyEntries.filter(d => d.date.startsWith(month) && d.attendance === true);
    const monthCustomers = customers.filter(c => c.date.startsWith(month));
    const wages = monthEntries.reduce((sum, d) => sum + (d.empWage || 0), 0);
    const sales = monthCustomers.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    document.getElementById('employee-wages-total').innerText = `₹${wages.toFixed(2)}`;
    document.getElementById('customer-sales-total').innerText = `₹${sales.toFixed(2)}`;
    document.getElementById('total-expenses').innerText = `₹${wages.toFixed(2)}`;
    document.getElementById('total-income').innerText = `₹${sales.toFixed(2)}`;
    const pl = sales - wages;
    const plEl = document.getElementById('profit-loss-total');
    if (pl >= 0) plEl.innerHTML = `<span>Net Profit</span><span style="color:green;">₹${pl.toFixed(2)}</span>`;
    else plEl.innerHTML = `<span>Net Loss</span><span style="color:red;">₹${Math.abs(pl).toFixed(2)}</span>`;
}

function calculateMonthlySummary() {
    const month = document.getElementById('summary-month').value;
    const monthEntries = dailyEntries.filter(d => d.date.startsWith(month) && d.attendance === true);
    const monthCustomers = customers.filter(c => c.date.startsWith(month));
    const wages = monthEntries.reduce((sum, d) => sum + (d.empWage || 0), 0);
    const sales = monthCustomers.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalExp = wages;
    const pl = sales - totalExp;
    document.getElementById('summary-employee').innerText = `₹${wages.toFixed(2)}`;
    document.getElementById('summary-customer').innerText = `₹${sales.toFixed(2)}`;
    document.getElementById('summary-total-expenses').innerHTML = `<strong>₹${totalExp.toFixed(2)}</strong>`;
    document.getElementById('summary-profit').innerHTML = pl >= 0 ? `<strong style="color:green;">₹${pl.toFixed(2)}</strong>` : `<strong style="color:red;">-₹${Math.abs(pl).toFixed(2)}</strong>`;
}

function performSearch() {
    if (!selectedFilter) { alert('Please select a filter'); return; }
    const from = searchFromDate.value;
    const to = searchToDate.value;
    const type = selectedFilter.type;
    const id = selectedFilter.id;
    const inRange = (date) => {
        if (!from && !to) return true;
        if (from && to) return date >= from && date <= to;
        if (from) return date >= from;
        if (to) return date <= to;
        return true;
    };
    let results = [];
    if (type === 'employee') {
        results = dailyEntries.filter(d => d.employeeId === id && inRange(d.date)).map(d => ({ date: d.date, name: d.employeeName, attendance: d.attendance ? 'Yes' : 'No', machineNo: d.machineNo || 'None', wage: d.empWage, workhour: d.machineWorkhour, expenses: d.machineExpenses }));
    } else if (type === 'machine') {
        results = dailyEntries.filter(d => d.machineId === id && inRange(d.date)).map(d => ({ date: d.date, machineNo: d.machineNo, user: d.employeeName, workhour: d.machineWorkhour, expenses: d.machineExpenses }));
    } else if (type === 'customer') {
        results = customers.filter(c => c.id === id && inRange(c.date));
    }
    let html = '';
    if (results.length === 0) html = '<p>No results found.</p>';
    else {
        html = '<table class="data-table"><thead><tr>';
        if (type === 'employee') html += '<th>Date</th><th>Employee</th><th>Attendance</th><th>Machine</th><th>Wage (₹)</th><th>Workhour</th><th>Expenses (₹)</th>';
        else if (type === 'machine') html += '<th>Date</th><th>Machine</th><th>User</th><th>Workhour</th><th>Expenses (₹)</th>';
        else if (type === 'customer') html += '<th>Date</th><th>Name</th><th>Phone</th><th>Work Day</th><th>Payment</th><th>Amount (₹)</th><th>Discount (₹)</th><th>Total (₹)</th>';
        html += '</tr></thead><tbody>';
        results.forEach(r => {
            html += '<tr>';
            if (type === 'employee') html += `<td>${r.date}</td><td>${r.name}</td><td>${r.attendance}</td><td>${r.machineNo}</td><td>₹${r.wage}</td><td>${r.workhour}</td><td>₹${r.expenses}</td>`;
            else if (type === 'machine') html += `<td>${r.date}</td><td>${r.machineNo}</td><td>${r.user}</td><td>${r.workhour}</td><td>₹${r.expenses}</td>`;
            else if (type === 'customer') html += `<td>${r.date}</td><td>${r.name}</td><td>${r.phoneNo || ''}</td><td>${r.workDay || 0}</td><td>${r.paymentMethod || ''}</td><td>₹${r.amount || 0}</td><td>₹${r.discount || 0}</td><td>₹${r.totalAmount || 0}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
    }
    searchResults.innerHTML = html;
}

// ==================== INITIALIZATION ====================
function init() {
    loadAllData();

    // Tabs
    adminTab.addEventListener('click', () => showLoginTab('admin'));
    employeeTab.addEventListener('click', () => showLoginTab('employee'));

    // Login buttons
    adminLoginBtn.addEventListener('click', adminLogin);
    employeeLoginBtn.addEventListener('click', employeeLogin);

    // Logout buttons
    logoutBtns.forEach(btn => btn.addEventListener('click', logout));

    // Admin sidebar navigation
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser || currentUser.role !== 'admin') return;
            const target = link.getAttribute('data-target');
            showPage(target);
        });
    });

    // Employee sidebar navigation
    document.querySelectorAll('.employee-sidebar .sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser || currentUser.role !== 'employee') return;
            const target = link.getAttribute('data-target');
            showPage(target);
        });
    });

    // Module boxes in admin dashboard
    document.querySelectorAll('#dashboard .module-box').forEach(box => {
        box.addEventListener('click', () => {
            if (!currentUser || currentUser.role !== 'admin') return;
            showPage(box.dataset.module);
        });
    });

    // Module box in employee dashboard
    document.querySelectorAll('#employee-dashboard .module-box').forEach(box => {
        box.addEventListener('click', () => {
            if (!currentUser || currentUser.role !== 'employee') return;
            showPage(box.dataset.module);
        });
    });

    // Back buttons
    backButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.back;
            showPage(target);
        });
    });

    // Admin date picker
    document.getElementById('date-picker')?.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadAllData();
    });

    // Daily Entry
    document.getElementById('save-daily-entry-btn')?.addEventListener('click', saveDailyEntries);
    document.getElementById('reset-daily-entry-btn')?.addEventListener('click', () => renderDailyEntries());
    document.getElementById('daily-entry-date')?.addEventListener('change', renderDailyEntries);

    // Employee Attendance
    document.getElementById('employee-date')?.addEventListener('change', renderEmployees);

    // Machine Page
    document.getElementById('machine-date')?.addEventListener('change', renderMachines);

    // Customer
    document.getElementById('add-customer-btn')?.addEventListener('click', addCustomer);
    document.getElementById('save-customer-btn')?.addEventListener('click', saveAllData);
    document.getElementById('reset-customer-btn')?.addEventListener('click', resetCustomerForm);
    document.getElementById('customer-date')?.addEventListener('change', renderCustomers);

    // Profit & Loss
    document.getElementById('calculate-pl-btn')?.addEventListener('click', calculateProfitLoss);
    document.getElementById('print-pl-btn')?.addEventListener('click', () => window.print());
    document.getElementById('pl-date')?.addEventListener('change', calculateProfitLoss);

    // Monthly Summary
    document.getElementById('calculate-summary-btn')?.addEventListener('click', calculateMonthlySummary);
    document.getElementById('print-summary-btn')?.addEventListener('click', () => window.print());
    document.getElementById('summary-month')?.addEventListener('change', calculateMonthlySummary);

    // Settings
    document.getElementById('add-emp-btn')?.addEventListener('click', () => {
        const name = document.getElementById('new-emp-name').value.trim();
        const wage = parseFloat(document.getElementById('new-emp-wage').value) || 0;
        const password = document.getElementById('new-emp-password').value.trim();
        const enabled = document.getElementById('new-emp-enabled').checked;
        if (!name) { alert('Enter name'); return; }
        employees.push({ id: getNextId(employees), name, defaultWage: wage, password: password, enabled });
        renderSettings();
        saveAllData();
        document.getElementById('new-emp-name').value = '';
        document.getElementById('new-emp-wage').value = '';
        document.getElementById('new-emp-password').value = '';
    });
    document.getElementById('add-machine-btn')?.addEventListener('click', () => {
        const no = document.getElementById('new-machine-no').value.trim();
        const desc = document.getElementById('new-machine-desc').value.trim();
        const enabled = document.getElementById('new-machine-enabled').checked;
        if (!no) { alert('Enter machine number'); return; }
        machines.push({ id: getNextId(machines), machineNo: no, description: desc, enabled });
        renderSettings();
        saveAllData();
        document.getElementById('new-machine-no').value = '';
        document.getElementById('new-machine-desc').value = '';
    });

    // Search
    searchBtn?.addEventListener('click', performSearch);

    // Backup/Restore
    document.getElementById('backup-btn')?.addEventListener('click', () => {
        const data = { employees, machines, dailyEntries, customers, lastSaveTime: new Date().toISOString() };
        const str = JSON.stringify(data);
        const uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(str);
        const link = document.createElement('a');
        link.href = uri;
        link.download = `backup-${currentDate}.json`;
        link.click();
    });
    document.getElementById('restore-btn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.employees && data.machines) {
                        employees = data.employees;
                        machines = data.machines;
                        dailyEntries = data.dailyEntries || [];
                        customers = data.customers || [];
                        renderAll();
                        saveAllData();
                        alert('Restored');
                    } else alert('Invalid file');
                } catch (ex) { alert('Error'); }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    setInterval(updateStorageStatus, 60000);
    showLoginTab('admin'); // default
}

document.addEventListener('DOMContentLoaded', init);