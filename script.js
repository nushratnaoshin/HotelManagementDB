let rooms = [];
let services = [];
let records = [];
let reviews = [];
let adminRecords = [];
let currentUser = null;
let activeRating = 0;

async function fetchInitialData() {
    try {
        let response = await fetch('api.php?action=get_initial_data&t=' + Date.now());
        let data = await response.json();
        if (data) {
            console.log("Database Refresh Successful. Records found:", data.records ? data.records.length : 0);
            if (data.records && data.records.length > 0) {
                console.table(data.records.slice(0, 5)); // Show first 5 for verification
            }
            rooms = data.rooms || [];
            services = data.services || [];
            records = data.records || [];
            adminRecords = data.adminRecords || [];
            reviews = data.reviews || [];
            currentUser = data.currentUser || null;
            
            if (data.debug_customers) {
                console.log("Raw Customer Table Check (Count):", data.debug_customers.length);
                const queryAnya = data.debug_customers.find(c => c.name.toLowerCase().includes("anya"));
                if (queryAnya) console.log("FOUND ANYA in raw table!", queryAnya);
                else console.log("Anya Forger NOT found in live customer table.");
            }
            
            // Sync with legacy localStorage keys for pages that use them
            localStorage.setItem("un_records", JSON.stringify(records));
            localStorage.setItem("un_payment_records", JSON.stringify(data.paymentRecords || []));
            localStorage.setItem("un_rooms", JSON.stringify(rooms));
            localStorage.setItem("un_services", JSON.stringify(services));
            
            renderUI();
        }
    } catch (e) {
        console.error("CRITICAL: Failed to load data from database", e);
    }
}

function initApp() {
    console.log("Urban Nest Application Initializing...");
    const role = localStorage.getItem("userRole"); // No default here
    const badge = document.getElementById("user-badge");
    
    if (badge) {
        badge.innerText = (role === "admin" ? "STAFF ACCESS" : (role === "guest" ? "RESIDENT PORTAL" : "GUEST PREVIEW"));
    }

    const staffDash = document.getElementById("staff-view");
    const guestDash = document.getElementById("guest-view");

    if (staffDash) staffDash.style.display = (role === "admin" ? "block" : "none");
    if (guestDash) guestDash.style.display = (role === "guest" ? "block" : "none");

    // Hide admin-only navigation links
    document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = (role === "admin" ? "list-item" : "none");
    });
    
    // If absolutely no role (Public Gallery), maybe hide some other things
    if (!role) {
        console.log("Public View Mode Active");
    }

    fetchInitialData();
    // Enable automatic background updates every 5 seconds
    setInterval(fetchInitialData, 5000);

    // Scroll Effect for Navbar
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    // Intersection Observer for Animations
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
            }
        });
    }, observerOptions);

    setTimeout(() => {
        document.querySelectorAll('.mgmt-card, .welcome-intro, .table-box').forEach(el => {
            el.classList.add('fade-in');
            observer.observe(el);
        });
    }, 500);
}

function renderUI() {
    if (document.getElementById("roomGrid")) renderRooms();
    if (document.getElementById("customerTable")) renderCustomerTable();
    if (document.getElementById("serviceList")) renderServiceManager();
    // Allow page-specific overrides like payments.html
    if (typeof renderPaymentsPage === "function") renderPaymentsPage();
}

window.onload = initApp;

// Premium Notification System
function showStatusModal(title, msg, isSuccess = true) {
    const statusHtml = `
    <div id="statusModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:10001; backdrop-filter:blur(8px); animation: fadeIn 0.3s ease;">
        <div class="mgmt-card" style="width:450px; padding:60px 40px; border-top: 4px solid ${isSuccess ? '#2ecc71' : '#e74c3c'}; animation: slideUp 0.4s ease-out; background:white;">
            <div style="font-size:3.5rem; margin-bottom:25px; color:${isSuccess ? '#2ecc71' : '#e74c3c'};">${isSuccess ? '✓' : '✕'}</div>
            <h4 style="letter-spacing:3px; color:var(--primary-dark); margin-bottom:20px; font-size:0.75rem; text-transform:uppercase; font-weight:800;">${title}</h4>
            <p style="font-size:1rem; color:#666; margin-bottom:35px; line-height:1.6;">${msg}</p>
            <button onclick="document.getElementById('statusModal').remove()" class="btn-staff-full" style="background:var(--primary-dark); color:white; height:50px; border:none; letter-spacing:2px; cursor:pointer; width:100%;">ACKNOWLEDGE</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', statusHtml);
}

// Custom Modal for Suite Logistics
function showDetails(index) {
    const room = rooms[index];
    if (!room) return;

    // Sanitize input: If name is 'Unknown' or falsy, set to 'No Resident'
    const occupant = (!room.occupantName || room.occupantName === 'Unknown' || room.occupantName === 'null') ? 'Vacant / No Resident' : room.occupantName;
    const occupantId = (!room.occupantId || room.occupantId === 0 || room.occupantId === 'null' || room.occupantId === 'undefined') ? 'N/A' : '#C-' + String(room.occupantId).padStart(4, '0');

    const modalHtml = `
    <div id="detailsModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(8px); animation: fadeIn 0.3s ease;">
        <div class="mgmt-card" style="width:420px; padding:45px; border-top: 4px solid var(--accent-gold); animation: slideUp 0.4s ease-out; background:white;">
            <h4 style="letter-spacing:4px; color:var(--accent-gold); margin-bottom:25px; font-size:0.7rem; text-transform:uppercase; font-weight:800;">Logistics | Suite #${room.id}</h4>
            <div style="margin-bottom:30px; text-align:left; border-left: 2px solid #eee; padding-left: 20px;">
                <p style="font-size:0.65rem; color:#aaa; text-transform:uppercase; margin-bottom:8px; font-weight:700; letter-spacing:1px;">Active Resident</p>
                <p style="font-size:1.2rem; color:var(--primary-dark); font-family:var(--font-serif); font-style:italic;">${occupant}</p>
            </div>
            <div style="margin-bottom:35px; text-align:left; border-left: 2px solid #eee; padding-left: 20px;">
                <p style="font-size:0.65rem; color:#aaa; text-transform:uppercase; margin-bottom:8px; font-weight:700; letter-spacing:1px;">Identification</p>
                <p style="font-size:1.1rem; color:var(--primary-dark); font-weight:700;">${occupantId}</p>
            </div>
            <button onclick="document.getElementById('detailsModal').remove()" class="btn-staff-full" style="background:var(--accent-gold); color:white; height:50px; cursor:pointer; width:100%; border:none; letter-spacing:2px; font-weight:700; text-transform:uppercase;">DISMISS RECORD</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderRooms() {
    const grid = document.getElementById("roomGrid");
    if (!grid) return;
    const role = localStorage.getItem("userRole") || "guest";

    grid.innerHTML = rooms.map((room, i) => {
        const isOccupied = room.status === "Occupied";
        const canCheckout = isOccupied && (role === 'admin' || (currentUser && String(room.occupantId) === String(currentUser.id)));
        
        return `
        <div class="mgmt-card suite-card-premium" style="padding:0; overflow:hidden; text-align:left;">
            <div style="height:250px; background:url('${room.img}') center/cover; position:relative;">
                <span class="status-badge ${isOccupied ? 'status-red' : 'status-green'}" 
                      style="position:absolute; top:20px; right:20px; background:${isOccupied ? '#e74c3c' : '#2ecc71'}; color:white; font-weight:700;">
                      ${room.status.toUpperCase()}
                </span>
            </div>
            <div style="padding:35px;">
                <div style="margin-bottom:15px;">
                    <span style="font-size:0.6rem; font-weight:800; color:var(--accent-gold); letter-spacing:2px; text-transform:uppercase;">Luxury Suite ${room.id}</span>
                </div>
                <h3 style="margin-bottom:5px;">${room.name}</h3>
                <p class="suite-price" style="margin-bottom:25px;">৳${room.price.toLocaleString()} <small style="font-size:0.7rem; color:#888; font-family:var(--font-main);">/ NIGHT</small></p>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${role === 'admin' ? `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button onclick="showDetails(${i})" class="btn-staff-sm" style="width:100%;">DETAILS</button>
                            <button onclick="deleteRoom(${room.id})" class="btn-guest-sm" style="width:100%; color:#e74c3c; border-color:#e74c3c;">DELETE</button>
                        </div>
                        <button onclick="openReviewModal(${i})" class="btn-guest-sm" style="width:100%;">GUEST FEEDBACK</button>
                    ` : (role === 'guest' ? `
                        <div style="display:flex; gap:15px;">
                            ${!isOccupied ? 
                                `<button onclick="openBookingModal(${i})" class="btn-staff-sm" style="flex:2;">RESERVE NOW</button>` : 
                                (canCheckout ? `<button onclick="processCheckout(${room.id})" class="btn-staff-sm" style="flex:2; background:#e74c3c; color:white;">CHECK OUT</button>` : 
                                `<button class="btn-staff-sm" style="flex:2; background:#aaa; cursor:not-allowed; border:none; color:white;" disabled>SUITE OCCUPIED</button>`)
                            }
                            <button onclick="openReviewModal(${i})" class="btn-guest-sm" style="flex:1;">REVIEWS</button>
                        </div>
                    ` : `
                        <div style="display:flex; gap:15px;">
                            <a href="login.html" class="btn-staff-sm" style="flex:2; text-align:center;">LOGIN TO RESERVE</a>
                            <button onclick="openReviewModal(${i})" class="btn-guest-sm" style="flex:1;">REVIEWS</button>
                        </div>
                    `)}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function handleLogin(event, role) {
    event.preventDefault();
    const email = document.getElementById(role + "-email")?.value || document.getElementById(role + "-username")?.value;
    const password = document.getElementById(role + "-password").value;

    const response = await fetch('api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role, username: email, password: password })
    });
    const result = await response.json();
    if (result.status === 'success') {
        localStorage.setItem("userRole", result.role);
        location.href = 'index.html';
    } else {
        showStatusModal("Access Denied", result.message, false);
    }
}

async function handleSignup() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const phone = document.getElementById("reg-phone").value;
    const password = document.getElementById("reg-password").value;

    const response = await fetch('api.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, phone: phone, password: password })
    });
    const result = await response.json();
    if (result.status === "success") {
        localStorage.setItem("userRole", "guest");
        location.href = 'index.html';
    } else {
        showStatusModal("Registration Error", result.message, false);
    }
}

async function openBookingModal(i) {
    const room = rooms[i];
    const role = localStorage.getItem("userRole") || "guest";
    
    if (role !== 'guest') {
        showStatusModal("Access Restricted", "Only registered residents can finalize suite bookings.", false);
        return;
    }

    showModal(`
        <h3 style="font-family:var(--font-serif); font-style:italic; margin-bottom:10px;">Reserve ${room.name}</h3>
        <p style="font-size:0.8rem; color:#888; margin-bottom:25px;">Luxury accommodation at ৳${room.price.toLocaleString()} / night</p>
        
        <div class="input-group">
            <label>Check-in Date</label>
            <input type="date" id="checkin" class="login-field" value="${new_date()}">
        </div>
        <div class="input-group" style="margin-top:15px;">
            <label>Nights of Stay</label>
            <input type="number" id="nights" class="login-field" value="1" min="1">
        </div>
        
        <div style="margin-top:25px; padding:20px; background:#f9f9f9; border-radius:8px;">
            <p style="font-size:0.6rem; font-weight:800; color:#aaa; letter-spacing:1px; margin-bottom:10px;">SELECT ADD-ONS</p>
            <div id="bookingServices">
                ${services.map(s => `
                    <label style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem; cursor:pointer;">
                        <span><input type="checkbox" value="${s.id}" data-price="${s.price}"> ${s.name}</span>
                        <span style="color:var(--accent-gold);">+৳${s.price.toLocaleString()}</span>
                    </label>
                `).join('')}
            </div>
        </div>

        <button onclick="confirmBooking(${i})" class="btn-staff-sm" style="width:100%; margin-top:25px; background:var(--accent-gold); color:white; border:none;">CONFIRM RESIDENCE</button>
    `);
}

function new_date() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

async function confirmBooking(i) {
    const checkin = document.getElementById("checkin").value;
    const nights = document.getElementById("nights").value;
    const svcCheckboxes = document.querySelectorAll("#bookingServices input:checked");
    const selectedServices = Array.from(svcCheckboxes).map(cb => cb.value);

    const response = await fetch('api.php?action=book_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            roomId: rooms[i].id, 
            checkin: checkin, 
            nights: nights,
            services: selectedServices
        })
    });
    
    const result = await response.json();
    if (result.status === 'success') {
        showStatusModal("Booking Confirmed", "Your residence has been initialized. Welcome to Urban Nest.");
        fetchInitialData();
        document.querySelector('.modal').remove();
    } else {
        showStatusModal("Booking Failed", result.message, false);
    }
}

async function processCheckout(roomId) {
    if (confirm(`Finalize Check-out? Unit will be cleaned and reset.`)) {
        await fetch('api.php?action=checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: roomId })
        });
        showStatusModal("Check-out Complete", "The suite has been released and reset to inventory.");
        fetchInitialData();
    }
}

async function addRoom() {
    const name = document.getElementById("roomName").value;
    const price = document.getElementById("roomPrice").value;

    if (!name || !price) {
        showStatusModal("Incomplete Data", "Suite Name and Nightly Rate are mandatory.", false);
        return;
    }

    await fetch('api.php?action=add_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, price: price })
    });
    showStatusModal("Inventory Update", "New luxury suite added to the collection.");
    fetchInitialData();
}

async function deleteRoom(id) {
    if (confirm("Permanently remove this suite from Urban Nest inventory?")) {
        await fetch('api.php?action=delete_room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        showStatusModal("Inventory Update", "Suite successfully removed from local records.");
        fetchInitialData();
    }
}

async function toggleRoomStatus(id) {
    await fetch('api.php?action=toggle_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    });
    fetchInitialData();
}

function renderServiceManager() {
    const list = document.getElementById("serviceList");
    if (!list) return;

    if (services.length === 0) {
        list.innerHTML = `<p style="color: #bbb; text-align: center; padding: 20px;">No services currently configured.</p>`;
        return;
    }

    list.innerHTML = services.map((s, i) => `
        <div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #f4f4f4; align-items:center; transition: 0.3s;">
            <div>
                <span style="font-weight:700; display:block; color: #333;">${s.name}</span>
                <span style="font-size:0.75rem; color:#888;">Standard Charge: ৳${s.price.toLocaleString()}</span>
            </div>
            <button onclick="removeService(${s.id})" 
                    style="color:#e74c3c; background:#fdf2f2; border:1px solid #fee2e2; border-radius: 4px; padding: 5px 12px; cursor:pointer; font-size:0.8rem; font-weight:bold; transition: 0.2s;"
                    onmouseover="this.style.background='#fde2e2'" 
                    onmouseout="this.style.background='#fdf2f2'">
                DELETE
            </button>
        </div>`).join('');
}

async function addService() {
    const nameInput = document.getElementById("svcName");
    const priceInput = document.getElementById("svcPrice");

    if (!nameInput || !priceInput) return;

    const nameValue = nameInput.value.trim();
    const priceValue = parseInt(priceInput.value);

    if (!nameValue || isNaN(priceValue)) {
        showStatusModal("Validation Error", "Please enter a valid Service Name and Price.", false);
        return;
    }

    await fetch('api.php?action=add_service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue, price: priceValue })
    });
    
    nameInput.value = "";
    priceInput.value = "";
    fetchInitialData();
    showStatusModal("Service Created", `${nameValue} has been integrated into the resident menu.`);
}

async function removeService(id) {
    if (confirm(`Are you sure you want to remove this service?`)) {
        await fetch('api.php?action=delete_service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        showStatusModal("Service Updated", "Additional service removed from the catalog.");
        fetchInitialData();
    }
}

function renderCustomerTable() {
    const tbody = document.querySelector("#customerTable tbody");
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">No resident records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((r, i) => `
        <tr>
            <td style="font-weight:700;">#C-${r.customerId.toString().padStart(4, '0')}</td>
            <td>${r.guestName}</td>
            <td style="font-family:monospace; color:var(--text-gray);">${r.phone || 'N/A'}</td>
            <td>${r.suite} <span style="font-size:0.7rem; color:#bbb;">(${r.nights} nights)</span></td>
            <td style="font-weight:800; color:#2ecc71;">৳${r.totalAmount.toLocaleString()}</td>
            <td>
                <div style="display:flex; gap:10px;">
                    ${r.paymentStatus === 'Pending' ? 
                        `<button onclick="approvePayment('${r.id}')" style="color:#2ecc71; border:none; background:none; cursor:pointer; font-weight:bold;">APPROVE</button>` : 
                        `<span style="color:#aaa; font-size:0.7rem; font-weight:bold;">${r.paymentStatus.toUpperCase()}</span>`
                    }
                </div>
            </td>
        </tr>`).join('');
}

async function approvePayment(id) {
    if (confirm("Approve this resident's payment?")) {
        try {
            const response = await fetch('api.php?action=approve_payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showStatusModal("Bill Settled", "The resident's payment has been officially processed and recorded.");
                await fetchInitialData();
                setTimeout(() => window.location.reload(), 1500); 
            } else {
                showStatusModal("Processing Error", result.message || "Failed to approve payment.", false);
            }
        } catch (e) {
            console.error("Payment Approval Error:", e);
            showStatusModal("Network Error", "Could not connect to the financial management system.", false);
        }
    }
}

async function removeRecord(id) {
    if (confirm("Archive this guest record permanently?")) {
        await fetch('api.php?action=archive_record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        showStatusModal("Archive Updated", "Guest record moved to historical archives.");
        fetchInitialData();
    }
}

function openReviewModal(i) {
    activeRating = 0; // Reset rating state for new modal
    const roomReviews = reviews.filter(r => r.suite === rooms[i].name);
    
    const listHTML = roomReviews.map(r => `
        <div style="border-bottom:1px solid #eee; padding:12px 0; text-align:left;">
            <div style="color:#f1c40f; margin-bottom:5px;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            <p style="font-size:0.8rem; font-style:italic; color:#555;">"${r.comment}"</p>
        </div>`).join('') || "<p style='color:#ccc; padding:20px 0;'>No reviews yet for this suite.</p>";

    const role = localStorage.getItem("userRole") || "guest";
    
    showModal(`
        <h3 style="font-family:var(--font-serif); font-style:italic; margin-bottom:15px;">Resident Feedback</h3>
        <p style="font-size:0.7rem; color:var(--accent-gold); letter-spacing:2px; font-weight:700; margin-bottom:20px;">${rooms[i].name.toUpperCase()}</p>
        <div style="max-height:180px; overflow-y:auto; border-bottom:1px solid #eee;">${listHTML}</div>
        
        ${role === 'guest' ? `
            <div style="margin-top:25px; background:#fcfcfc; padding:25px; border:1px solid #eee;">
                <p style="font-size:0.6rem; font-weight:800; color:#888; margin-bottom:15px; letter-spacing:2px;">RATE YOUR RESIDENCE</p>
                <div style="font-size:2.2rem; cursor:pointer; color:#ddd; margin-bottom:15px; letter-spacing:8px;">
                    ${[1,2,3,4,5].map(n => `<span onclick="setStar(${n})" class="star-btn" style="transition:0.3s; display:inline-block;">★</span>`).join('')}
                </div>
                <textarea id="revText" class="login-field" placeholder="Share your experience..." style="height:80px; width:100%;"></textarea>
                <button onclick="saveReview(${i})" class="btn-staff-full" style="width:100%; margin-top:20px; background:var(--primary-dark); color:white; border:none; cursor:pointer;">SUBMIT FEEDBACK</button>
            </div>
        ` : `
            <div style="margin-top:20px; background:#f4f4f4; padding:20px; text-align:center; color:#888; border:1px dashed #ccc;">
                <p style="font-size:0.65rem; font-weight:800; letter-spacing:2px;">STAFF MODE</p>
                <small>Internal feedback is currently locked for administrators.</small>
            </div>
        `}`);
}

function setStar(n) {
    activeRating = n;
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach((s, i) => {
        s.style.color = i < n ? '#f1c40f' : '#ddd';
        s.style.transform = i < n ? 'scale(1.1)' : 'scale(1)';
    });
}

async function saveReview(i) {
    const comment = document.getElementById("revText").value;
    
    if (!activeRating) {
        showStatusModal("Rating Required", "Please select a star rating before submitting your feedback.", false);
        return;
    }

    await fetch('api.php?action=add_review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            roomId: rooms[i].id, 
            rating: activeRating, 
            comment: comment || "Exceptional stay!" 
        })
    });

    showStatusModal("Feedback Recorded", "Your review has been successfully submitted. We appreciate your feedback.");
    fetchInitialData();
    document.querySelector('.modal').remove();
}

function showModal(content) {
    const existing = document.querySelector('.modal');
    if (existing) existing.remove();

    const m = document.createElement('div');
    m.className = 'modal';
    
    m.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); display: flex;
        justify-content: center; align-items: center; z-index: 1000;
        animation: fadeIn 0.3s ease; backdrop-filter: blur(8px);
    `;

    m.innerHTML = `
        <div class="modal-content" style="background:#fff; padding:45px; width:95%; max-width:440px; max-height:90vh; overflow-y:auto; position:relative; box-shadow:0 30px 60px rgba(0,0,0,0.4); border-top: 5px solid var(--accent-gold);">
            <span onclick="this.parentElement.parentElement.remove()" style="position:absolute; right:20px; top:15px; cursor:pointer; font-size:1.8rem; color:#bbb; transition:0.3s;" onmouseover="this.style.color='var(--accent-gold)'" onmouseout="this.style.color='#bbb'">&times;</span>
            ${content}
        </div>`;
    document.body.appendChild(m);
}

// End of cleaned Urban Nest script.
