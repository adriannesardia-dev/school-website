// --- UI MANAGER (Para sa Auto-Clear ng Fields) ---
        const ui = {
            clearFields(ids) {
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.value = "";
                });
            },
            show(id) {
                const sections = ['regSection', 'verifySection', 'loginSection', 'studentView', 'adminView'];
                sections.forEach(s => document.getElementById(s).classList.add('hidden'));
                document.getElementById(id).classList.remove('hidden');
                document.getElementById('policyNotice').style.display = (id === 'regSection' || id === 'loginSection') ? 'block' : 'none';
            },
            goToRegister() {
                this.clearFields(['regName', 'regEmail', 'regPass', 'inputOTP']);
                this.show('regSection');
            },
            goToLogin() {
                this.clearFields(['loginEmail', 'loginPass', 'inputOTP']);
                this.show('loginSection');
            }
        };
        // Override default alert to modal
        window.alert = function(message) {
        const modal = document.getElementById('customModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalMessage');

        // Default
        title.innerText = "Notice";
        title.style.color = "var(--accent)";

        // Auto-detect message type
        if (message.toLowerCase().includes("account created")) {
        title.innerText = "✅ Account Created";
        title.style.color = "var(--success)";
        } 
        else if (message.toLowerCase().includes("logout")) {
        title.innerText = "👋 Logged Out";
        title.style.color = "var(--warning)";
        } 
        else if (message.toLowerCase().includes("maling") || message.toLowerCase().includes("error")) {
        title.innerText = "❌ Error";
        title.style.color = "var(--danger)";
        }

        body.innerText = message;
        modal.classList.remove('hidden');
        };

        // pag mag close na ang modal
        function closeModal() {
        document.getElementById('customModal').classList.add('hidden');
        }

        let deleteTargetId = null;

        function openDeleteModal(id) {
            deleteTargetId = id;
            document.getElementById('deleteModal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            deleteTargetId = null;
            document.getElementById('deleteModal').classList.add('hidden');
        }

        function confirmDelete() {
            if (deleteTargetId !== null) {
                booking.deleteRequest(deleteTargetId);
            }
            closeDeleteModal();
        }

        // --- AUTH LOGIC ---
        class Auth {
            constructor() {
                this.users = JSON.parse(localStorage.getItem('users')) || [];
                this.tempUser = null;
                this.currentOTP = null;
            }

            register() {
                const name = document.getElementById('regName').value;
                const email = document.getElementById('regEmail').value;
                const pass = document.getElementById('regPass').value;
                const role = document.getElementById('regRole').value;

                if(!name || !email || !pass) return alert("Paki-fill up lahat ng fields!");

                this.currentOTP = Math.floor(1000 + Math.random() * 9000);
                this.tempUser = { name, email, pass, role, lastLogin: Date.now() };
                
                document.getElementById('generatedOTP').innerText = this.currentOTP;
                ui.clearFields(['inputOTP']); // Clear OTP input para sa bagong subok
                ui.show('verifySection');
            }

            verify() {
    const input = document.getElementById('inputOTP').value;
    if(input == this.currentOTP) {

        // Tama OTP
        this.users.push(this.tempUser);
        localStorage.setItem('users', JSON.stringify(this.users));
        alert("Account Created! Maaari ka nang mag-login.");
        ui.goToLogin();
    } else {
        // Mali ang imong OTP, GINIRIT BAGU
        this.currentOTP = Math.floor(1000 + Math.random() * 9000);

        document.getElementById('generatedOTP').innerText = this.currentOTP;
        document.getElementById('inputOTP').value = "";

        alert("Maling code! Bagong OTP ang na-generate.");
    }
}

            login() {
                const email = document.getElementById('loginEmail').value;
                const pass = document.getElementById('loginPass').value;
                const userIndex = this.users.findIndex(u => u.email === email && u.pass === pass);

                if(userIndex !== -1) {
                    this.users[userIndex].lastLogin = Date.now();
                    localStorage.setItem('users', JSON.stringify(this.users));
                    localStorage.setItem('session', JSON.stringify(this.users[userIndex]));
                    this.checkSession();
                } else {
                    alert("Maling email o password.");
                }
            }

            logout() {
                localStorage.removeItem('session');
                alert("Naka-logout ka na.");
                ui.goToLogin(); // Balik sa simula at linis ng inputs
            }

            checkSession() {
                const session = JSON.parse(localStorage.getItem('session'));
                if(session) {
                    if(session.role === 'student') {
                        document.getElementById('studentName').innerText = session.name;
                        ui.show('studentView');
                        booking.renderStudent(session.name);
                    } else {
                        ui.show('adminView');
                        booking.renderAdmin();
                        this.renderUserList();
                    }
                }
            }

            renderUserList() {
                const list = document.getElementById('userList');
                const students = this.users.filter(u => u.role === 'student');
                list.innerHTML = students.length ? '' : '<p style="font-size:12px; color:gray;">Walang student accounts.</p>';
                students.forEach(u => {
                    const days = Math.floor((Date.now() - u.lastLogin) / (1000 * 60 * 60 * 24));
                    list.innerHTML += `
                        <div class="user-item">
                            <span><b>${u.name}</b><br><small>${days} days inactive</small></span>
                            ${days >= 365 ? `<button class="btn-void" onclick="auth.voidAccount('${u.email}')">VOID</button>` : `<span style="color:green; font-size:11px;">Active</span>`}
                        </div>
                    `;
                });
            }

            voidAccount(email) {
                if(confirm("Sigurado ka bang i-vo-void ang account na ito?")) {
                    this.users = this.users.filter(u => u.email !== email);
                    localStorage.setItem('users', JSON.stringify(this.users));
                    let reqs = JSON.parse(localStorage.getItem('requests')) || [];
                    localStorage.setItem('requests', JSON.stringify(reqs.filter(r => r.studentEmail !== email)));
                    this.renderUserList();
                    booking.renderAdmin();
                }
            }
        }

        // --- BOOKING LOGIC ---
        class Booking {
            constructor() {
                this.requests = JSON.parse(localStorage.getItem('requests')) || [];
            }
            
            deleteRequest(id) {
            this.requests = this.requests.filter(r => r.id !== id);
            localStorage.setItem('requests', JSON.stringify(this.requests));
            this.renderAdmin();
        }

            submit() {
                const session = JSON.parse(localStorage.getItem('session'));
                const date = document.getElementById('reqDate').value;
                if(!date) return alert("Pumili ng petsa!");

                const newReq = {
                    id: Date.now(),
                    studentName: session.name,
                    studentEmail: session.email,
                    doc: document.getElementById('docType').value,
                    date: date,
                    status: 'Pending'
                };
                this.requests.push(newReq);
                localStorage.setItem('requests', JSON.stringify(this.requests));
                this.renderStudent(session.name);
                alert("Request Sent! Hintayin ang update ng admin.");
            }

            updateStatus(id, newStatus) {
                this.requests = this.requests.map(r => r.id === id ? {...r, status: newStatus} : r);
                localStorage.setItem('requests', JSON.stringify(this.requests));
                this.renderAdmin();
            }

            renderStudent(name) {
                const list = document.getElementById('studentStatusList');
                list.innerHTML = this.requests.filter(r => r.studentName === name).map(r => `
                    <div class="card"><span class="badge ${r.status.toLowerCase()}">${r.status}</span>
                    <b>${r.doc}</b><br><small>Schedule: ${r.date}</small></div>
                `).reverse().join('');
            }

            renderAdmin() {
                const list = document.getElementById('adminList');
                list.innerHTML = this.requests.length ? '' : '<p style="text-align:center; color:gray;">Walang requests.</p>';
                this.requests.slice().reverse().forEach(r => {
                    list.innerHTML += `
                        <div class="card">
                            <b>${r.studentName}</b> - ${r.doc}
                            <select onchange="booking.updateStatus(${r.id}, this.value)" style="margin-top:10px; font-size:12px;">
                                <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Processing" ${r.status === 'Processing' ? 'selected' : ''}>Processing</option>
                                <option value="Ready" ${r.status === 'Ready' ? 'selected' : ''}>Ready for Pickup</option>
                                <option value="Released" ${r.status === 'Released' ? 'selected' : ''}>Released</option>
                                <option value="Rejected" ${r.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                            <button 
                            onclick="openDeleteModal(${r.id})"
                            style="
                                margin-top:8px;
                                background: var(--danger);
                                color: white;
                                font-size: 11px;
                                padding: 8px;
                                border-radius: 6px;
                                border: none;
                                width: 100%;
                            ">
                            Delete Request
                        </button>

                        </div>
                    `;
                });
            }
        }

        const auth = new Auth();
        const booking = new Booking();
        window.onload = () => auth.checkSession();