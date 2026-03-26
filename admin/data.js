/* Modified data.js - Linked to Cloudflare Worker & D1/R2 */

const BASE_URL = 'https://admin-handler.sheshan.workers.dev/api';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    refreshAdminDashboard();
});

window.adminDataCache = null;

// Helper to refresh all tables and dropdowns
async function refreshAdminDashboard() {
    const data = await getAllData();
    if (data) {
        window.adminDataCache = data;
        renderProjects(data.projects, data.sectors, data.finishes);
        renderSectors(data.sectors);
        renderFinishes(data.finishes);
        renderVendors(data.vendors);
        renderServices(data.services || []);
        renderGlobalReach(data.global_reach || []);
        renderInquiries(data.inquiries || []);
        populateForms(data.about, data.contact);
        
        // Load Analytics after main data
        refreshDashboardAnalytics();
    }
}

// --- API CORE FETCHERS ---

async function getAllData() {
    try {
        const response = await fetch(`${BASE_URL}/all`);
        return await response.json();
    } catch (err) {
        console.error("Failed to fetch data:", err);
    }
}

// --- ANALYTICS & CHARTS ---
let trafficChart = null;
let geoChart = null;
let lastAnalyticsData = null;

async function refreshDashboardAnalytics() {
    try {
        const response = await fetch(`${BASE_URL}/analytics`);
        const analytics = await response.json();
        lastAnalyticsData = analytics;
        
        // Update Stats
        document.getElementById('stat-projects').innerText = analytics.projectsCount || 0;
        document.getElementById('stat-inquiries').innerText = analytics.inquiriesCount || 0;
        document.getElementById('stat-visits').innerText = (analytics.totalVisits || 0).toLocaleString();
        document.getElementById('stat-vendors').innerText = window.adminDataCache?.vendors?.length || 0;
        
        renderCharts(analytics);
        renderCountryList(analytics.countries);
    } catch (err) {
        console.error("Failed to fetch analytics:", err);
    }
}

function renderCharts(data) {
    const ctxTraffic = document.getElementById('trafficChart')?.getContext('2d');
    const ctxGeo = document.getElementById('geoChart')?.getContext('2d');
    
    if (!ctxTraffic || !ctxGeo) return;

    const period = document.getElementById('traffic-period').value;
    const trafficData = data.traffic[period];
    
    // Traffic Chart (Line)
    if (trafficChart) trafficChart.destroy();
    trafficChart = new Chart(ctxTraffic, {
        type: 'line',
        data: {
            labels: trafficData.map(d => d.label),
            datasets: [{
                label: 'Visits',
                data: trafficData.map(d => d.visits),
                borderColor: '#E63946',
                backgroundColor: 'rgba(230, 57, 70, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#E63946',
                pointBorderColor: '#fff',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Geo Chart (Doughnut)
    if (geoChart) geoChart.destroy();
    geoChart = new Chart(ctxGeo, {
        type: 'doughnut',
        data: {
            labels: data.countries.map(c => c.name),
            datasets: [{
                data: data.countries.map(c => c.visits),
                backgroundColor: ['#E63946', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'],
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            cutout: '70%'
        }
    });
}

function updateTrafficChart() {
    if (lastAnalyticsData) renderCharts(lastAnalyticsData);
}

function renderCountryList(countries) {
    const list = document.getElementById('country-list');
    if (!list) return;
    list.innerHTML = countries.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <img src="https://flagcdn.com/${c.code.toLowerCase()}.svg" style="width: 20px; border-radius: 2px;">
                <span>${c.name}</span>
            </div>
            <span style="font-weight: 600;">${c.visits}</span>
        </div>
    `).join('');
}

// --- PROJECT ACTIONS (D1 + R2) ---

async function saveProject(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // If edit mode, the hidden input 'id' will be automatically picked up by FormData because of name="id" in index.html.
    const id = document.getElementById('project-id').value;

    // Example of separating them
    const featureFileInput = document.getElementById('feature-image-file');
    if (featureFileInput && featureFileInput.files[0]) {
        formData.append('primary_image', featureFileInput.files[0]);
    }

    const galleryFileInput = document.getElementById('gallery-images-file');
    if (galleryFileInput && galleryFileInput.files.length > 0) {
        for (let i = 0; i < galleryFileInput.files.length; i++) {
            formData.append('gallery_images', galleryFileInput.files[i]);
        }
    }

    // Provide existing images just in case the server handles them
    if (typeof currentFeatureImage !== 'undefined') {
        if (currentFeatureImage && currentFeatureImage.startsWith('http')) {
            formData.append('existing_primary', currentFeatureImage);
        }
        if (typeof currentGalleryImages !== 'undefined' && currentGalleryImages.length > 0) {
            const existingGalleries = currentGalleryImages.filter(img => img.startsWith('http'));
            formData.append('existing_gallery', JSON.stringify(existingGalleries));
        }
    }

    try {
        const response = await fetch(`${BASE_URL}/projects`, {
            method: 'POST',
            body: formData // Sends files to R2 and text to D1
        });
        if (response.ok) {
            if (typeof resetForm === 'function') resetForm();
            refreshAdminDashboard();
            showNotification("Project saved successfully!", 'success');
        } else {
            let errText = "Unknown error";
            try { errText = await response.text(); } catch (e) {}
            showNotification(`Status: ${response.status}<br><br>Details:<br>${errText}`, 'error');
        }
    } catch (err) {
        showNotification("Exception details:<br>" + err.message, 'error');
    }
}

async function deleteProject(id) {
    if (!confirm("Are you sure? This will also delete images from R2.")) return;
    await fetch(`${BASE_URL}/projects?id=${id}`, { method: 'DELETE' });
    refreshAdminDashboard();
}

// --- SECTOR & FINISH ACTIONS ---

async function saveSector(event) {
    event.preventDefault();
    const id = document.getElementById('sector-id').value;
    const name = document.getElementById('sector-name').value;

    await fetch(`${BASE_URL}/sectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
    });
    if (typeof resetSectorForm === 'function') resetSectorForm();
    refreshAdminDashboard();
}

async function saveFinish(event) {
    event.preventDefault();
    const id = document.getElementById('finish-id').value;
    const name = document.getElementById('finish-name').value;

    await fetch(`${BASE_URL}/finishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
    });
    if (typeof resetFinishForm === 'function') resetFinishForm();
    refreshAdminDashboard();
}

async function deleteSector(id) {
    if (!confirm("Are you sure you want to delete this sector?")) return;
    try {
        await fetch(`${BASE_URL}/sectors?id=${id}`, { method: 'DELETE' });
        refreshAdminDashboard();
    } catch (err) {
        alert("Error deleting sector.");
    }
}

async function deleteFinish(id) {
    if (!confirm("Are you sure you want to delete this finish?")) return;
    try {
        await fetch(`${BASE_URL}/finishes?id=${id}`, { method: 'DELETE' });
        refreshAdminDashboard();
    } catch (err) {
        alert("Error deleting finish.");
    }
}

// --- VENDOR ACTIONS ---

async function saveVendor(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = document.getElementById('vendor-id').value;
    const hasLogo = document.getElementById('vendor-has-logo').checked;
    if (id) {
        formData.append('id', id);
        if (!hasLogo) {
            formData.append('remove_logo', 'true');
        }
    }

    await fetch(`${BASE_URL}/vendors`, {
        method: 'POST',
        body: formData
    });
    showNotification("Vendor saved successfully!", 'success');
    if (typeof cancelVendorEdit === 'function') {
        cancelVendorEdit();
    } else {
        form.reset();
        document.getElementById('vendor-id').value = '';
        document.getElementById('vendor-logo-group').style.display = 'none';
        const logoCheckbox = document.getElementById('vendor-has-logo');
        if (logoCheckbox) logoCheckbox.checked = false;
    }
    refreshAdminDashboard();
}

async function deleteVendor(id) {
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    try {
        await fetch(`${BASE_URL}/vendors?id=${id}`, { method: 'DELETE' });
        showNotification("Vendor deleted successfully!", 'success');
        refreshAdminDashboard();
    } catch (err) {
        showNotification("Error deleting vendor: " + err.message, 'error');
    }
}

function editVendor(vId) {
    const v = window.adminDataCache.vendors.find(x => x.id === vId);
    if (!v) return;
    
    document.getElementById('vendor-id').value = v.id;
    document.getElementById('vendor-name').value = v.name;
    document.getElementById('vendor-material').value = v.material;
    
    document.getElementById('vendor-form-title').textContent = 'Edit Vendor';
    const submitBtn = document.getElementById('vendor-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Vendor';
    const cancelBtn = document.getElementById('vendor-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    
    const logoCheckbox = document.getElementById('vendor-has-logo');
    const logoGroup = document.getElementById('vendor-logo-group');
    const previewContainer = document.getElementById('vendor-logo-preview-container');
    const previewImg = document.getElementById('vendor-logo-preview');
    
    if (logoCheckbox && logoGroup) {
        if (v.logo_url) {
            logoCheckbox.checked = true;
            logoGroup.style.display = 'block';
            if (previewContainer && previewImg) {
                previewContainer.style.display = 'block';
                previewImg.src = v.logo_url;
            }
        } else {
            logoCheckbox.checked = false;
            logoGroup.style.display = 'none';
            if (previewContainer && previewImg) {
                previewContainer.style.display = 'none';
                previewImg.src = '';
            }
        }
    }
    document.getElementById('vendors-section').scrollIntoView({ behavior: 'smooth' });
}

// --- ABOUT ACTIONS ---
async function saveAbout(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append('story', document.getElementById('about-story').value);
    formData.append('years_experience', document.getElementById('years-exp').value);
    
    const fileInput = document.getElementById('about-image-file');
    if (fileInput.files[0]) {
        formData.append('about_image', fileInput.files[0]);
    }
    formData.append('remove_image', document.getElementById('remove-about-image').value);

    try {
        await fetch(`${BASE_URL}/about`, {
            method: 'POST',
            body: formData
        });
        showNotification("About information updated!", 'success');
        refreshAdminDashboard();
    } catch (err) {
        showNotification("Error updating about info", 'error');
    }
}

function previewAboutImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.getElementById('about-image-preview-container');
            const preview = document.getElementById('about-image-preview');
            preview.src = e.target.result;
            container.style.display = 'block';
            document.getElementById('remove-about-image').value = "false";
        };
        reader.readAsDataURL(file);
    }
}

function removeAboutImage() {
    document.getElementById('about-image-file').value = "";
    document.getElementById('about-image-preview-container').style.display = 'none';
    document.getElementById('about-image-preview').src = "";
    document.getElementById('remove-about-image').value = "true";
}

// --- CONTACT ACTIONS ---
async function saveContact(event) {
    event.preventDefault();
    const data = {
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        whatsapp_number: document.getElementById('contact-whatsapp').value,
        whatsapp_message: document.getElementById('contact-whatsapp-message').value,
        address: document.getElementById('contact-address').value
    };
    try {
        await fetch(`${BASE_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showNotification("Contact information updated!", 'success');
        refreshAdminDashboard();
    } catch (e) {
        showNotification("Error saving contact info", 'error');
    }
}

// --- SERVICES SECTION ---
async function saveService(event) {
    event.preventDefault();
    const id = document.getElementById('service-id').value;
    const title = document.getElementById('service-title').value;
    const description = document.getElementById('service-description').value;
    const icon_class = document.getElementById('service-icon').value;

    const data = { 
        id: id ? parseInt(id) : null, 
        title, 
        description, 
        icon_class: icon_class.trim() || getAutoIcon(title) 
    };

    try {
        await fetch(`${BASE_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        showNotification(id ? "Service updated!" : "Service added!", 'success');
        cancelServiceEdit();
        refreshAdminDashboard();
    } catch (err) {
        showNotification("Error saving service", 'error');
    }
}

async function deleteService(id) {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
        await fetch(`${BASE_URL}/services?id=${id}`, { method: 'DELETE' });
        showNotification("Service deleted!", 'success');
        refreshAdminDashboard();
    } catch (err) {
        showNotification("Error deleting service", 'error');
    }
}

function editService(id) {
    const s = window.adminDataCache.services.find(x => x.id === id);
    if (!s) return;
    document.getElementById('service-id').value = s.id;
    document.getElementById('service-title').value = s.title;
    document.getElementById('service-description').value = s.description;
    document.getElementById('service-icon').value = s.icon_class || "";
    
    document.getElementById('service-form-title').innerText = "Edit Service";
    document.getElementById('service-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
    document.getElementById('service-cancel-btn').style.display = 'inline-block';
}

function cancelServiceEdit() {
    document.getElementById('service-id').value = "";
    document.getElementById('service-title').value = "";
    document.getElementById('service-description').value = "";
    document.getElementById('service-icon').value = "";
    
    document.getElementById('service-form-title').innerText = "Add Service";
    document.getElementById('service-submit-btn').innerHTML = '<i class="fas fa-plus"></i> Add Service';
    document.getElementById('service-cancel-btn').style.display = 'none';
}

function renderServices(services) {
    const tbody = document.getElementById('services-list');
    if (!tbody) return;
    tbody.innerHTML = services.map(s => {
        const icon = s.icon_class || getAutoIcon(s.title);
        return `
            <tr>
                <td style="font-size: 1.5rem; color: var(--primary);"><i class="${icon}"></i></td>
                <td style="font-weight: 600;">${s.title}</td>
                <td>${s.description.substring(0, 50)}${s.description.length > 50 ? '...' : ''}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="editService(${s.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function getAutoIcon(title) {
    const t = title.toLowerCase();
    if (t.includes('titanium')) return 'fas fa-layer-group';
    if (t.includes('wash')) return 'fas fa-water';
    if (t.includes('clay')) return 'fab fa-modx';
    if (t.includes('sand')) return 'fas fa-wind';
    if (t.includes('granular')) return 'fas fa-cubes';
    if (t.includes('cement')) return 'fas fa-border-none';
    if (t.includes('concrete')) return 'fas fa-gem';
    if (t.includes('paint')) return 'fas fa-paint-roller';
    if (t.includes('water')) return 'fas fa-fill-drip';
    return 'fas fa-star';
}

// --- GLOBAL REACH ACTIONS ---
async function saveReach(event) {
    event.preventDefault();
    const id = document.getElementById('reach-id').value;
    const country_name = document.getElementById('reach-country').value;
    const description = document.getElementById('reach-role').value;

    const data = { id: id ? parseInt(id) : null, country_name, description };

    try {
        await fetch(`${BASE_URL}/global-reach`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showNotification(id ? "Location updated!" : "Location added!", 'success');
        cancelReachEdit();
        refreshAdminDashboard();
    } catch (e) {
        showNotification("Error saving location", 'error');
    }
}

async function deleteReach(id) {
    if (!confirm("Delete this location?")) return;
    try {
        await fetch(`${BASE_URL}/global-reach?id=${id}`, { method: 'DELETE' });
        showNotification("Location deleted!", 'success');
        refreshAdminDashboard();
    } catch (e) {
        showNotification("Error deleting location", 'error');
    }
}

function editReach(id) {
    const r = window.adminDataCache.global_reach.find(x => x.id === id);
    if (!r) return;
    document.getElementById('reach-id').value = r.id;
    document.getElementById('reach-country').value = r.country_name;
    document.getElementById('reach-role').value = r.description;
    
    document.getElementById('reach-form-title').innerText = "Edit Location";
    document.getElementById('reach-submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
    document.getElementById('reach-cancel-btn').style.display = 'inline-block';
}

function cancelReachEdit() {
    document.getElementById('reach-id').value = "";
    document.getElementById('reach-country').value = "";
    document.getElementById('reach-role').value = "";
    
    document.getElementById('reach-form-title').innerText = "Add Location";
    document.getElementById('reach-submit-btn').innerHTML = '<i class="fas fa-plus"></i> Add Location';
    document.getElementById('reach-cancel-btn').style.display = 'none';
}

function renderGlobalReach(reach) {
    const tbody = document.getElementById('reach-list');
    if (!tbody) return;
    tbody.innerHTML = reach.map(r => {
        const flagUrl = getFlagUrl(r.country_name);
        return `
            <tr>
                <td><img src="${flagUrl}" style="width: 32px; border-radius: 2px; border: 1px solid #eee;"></td>
                <td style="font-weight: 600;">${r.country_name}</td>
                <td>${r.description}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="editReach(${r.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteReach(${r.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function getFlagUrl(country) {
    const flagMap = {
        'Sri Lanka': 'lk', 'Maldives': 'mv', 'USA': 'us', 
        'UK': 'gb', 'Australia': 'au', 'UAE': 'ae', 'India': 'in'
    };
    const code = flagMap[country] || 'un';
    return `https://flagcdn.com/${code.toLowerCase()}.svg`;
}

// --- RENDERING LOGIC (UI UPDATES) ---

function renderProjects(projects, sectors, finishes) {
    const tbody = document.getElementById('admin-project-list');
    if (!tbody) return;
    tbody.innerHTML = projects.map(p => {
        const sector = sectors.find(s => s.id === p.sector_id)?.name || 'N/A';
        const finish = finishes.find(f => f.id === p.finish_id)?.name || 'N/A';
        let thumb = "https://placehold.co/50x50?text=Img";
        if (p.primary_image) {
            thumb = p.primary_image;
        } else {
            try {
                const arr = JSON.parse(p.gallery_images || "[]");
                if (arr && arr.length > 0) thumb = arr[0];
            } catch (e) {}
        }

        return `
            <tr>
                <td><img src="${thumb}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.src='https://placehold.co/50x50?text=No+Img'"></td>
                <td><strong>${p.title}</strong></td>
                <td>${p.country || 'N/A'}</td>
                <td>${sector}</td>
                <td>${finish}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="editProject(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    // Also update the Sector and Finish Dropdowns in the Project Form
    const sectorSelect = document.getElementById('type');
    const finishSelect = document.getElementById('finish');
    
    if (sectorSelect) {
        sectorSelect.innerHTML = '<option value="">Select Sector</option>' + 
            sectors.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        sectorSelect.setAttribute('name', 'sector_id');
    }
    
    if (finishSelect) {
        finishSelect.innerHTML = '<option value="">Select Finish</option>' + 
            finishes.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        finishSelect.setAttribute('name', 'finish_id');
    }
}

function renderSectors(sectors) {
    const tbody = document.getElementById('sector-list');
    if (!tbody) return;
    tbody.innerHTML = sectors.map(s => `
        <tr>
            <td>${s.name}</td>
            <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="editSector(${s.id}, '${s.name}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteSector(${s.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderFinishes(finishes) {
    const tbody = document.getElementById('finish-list');
    if (!tbody) return;
    tbody.innerHTML = finishes.map(f => `
        <tr>
            <td>${f.name}</td>
            <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="editFinish(${f.id}, '${f.name}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteFinish(${f.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}


function renderVendors(vendors) {
    const tbody = document.getElementById('vendor-list');
    if (!tbody) return;
    tbody.innerHTML = vendors.map(v => {
        let logoContent = v.logo_url 
            ? `<img src="${v.logo_url}" style="height: 60px; max-width: 100px; border-radius: 4px; object-fit: contain; background: #f9f9f9; padding: 5px; border: 1px solid #eee;">`
            : `<div style="width: 50px; height: 50px; background: #E2E8F0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.65rem; font-weight: 500;">N/A</div>`;
        return `
            <tr>
                <td>${logoContent}</td>
                <td>${v.name}</td>
                <td>${v.material}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="editVendor(${v.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteVendor(${v.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function populateForms(about, contact) {
    if (about) {
        document.getElementById('about-story').value = about.story || "";
        document.getElementById('years-exp').value = about.years_experience || "";
        
        if (about.about_image) {
            const container = document.getElementById('about-image-preview-container');
            const preview = document.getElementById('about-image-preview');
            preview.src = about.about_image;
            container.style.display = 'block';
            document.getElementById('remove-about-image').value = "false";
        } else {
            document.getElementById('about-image-preview-container').style.display = 'none';
        }
    }
    if (contact) {
        document.getElementById('contact-email').value = contact.email || "";
        document.getElementById('contact-phone').value = contact.phone || "";
        document.getElementById('contact-whatsapp').value = contact.whatsapp_number || "";
        document.getElementById('contact-whatsapp-message').value = contact.whatsapp_message || "";
        document.getElementById('contact-address').value = contact.address || "";
    }
}
function renderInquiries(inquiries) {
    const tbody = document.getElementById('inquiry-list');
    if (!tbody) return;
    tbody.innerHTML = inquiries.map(i => {
        const date = new Date(i.created_at).toLocaleDateString();
        return `
            <tr>
                <td style="color: var(--text-muted); font-size: 0.85rem;">${date}</td>
                <td style="font-weight: 600;">${i.name}</td>
                <td><span style="background: #E0F2FE; color: #0369A1; padding: 2px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: 600;">${i.service || 'N/A'}</span></td>
                <td title="${i.message}">${i.message.substring(0, 40)}${i.message.length > 40 ? '...' : ''}</td>
            </tr>
        `;
    }).join('');
}
// --- GLOBAL NOTIFICATION ---
function showNotification(message, type = 'success') {
    let overlay = document.getElementById('global-notification-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-notification-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.animation = 'fadeIn 0.2s ease';
        document.body.appendChild(overlay);

        const card = document.createElement('div');
        card.id = 'global-notification-card';
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '0.75rem';
        card.style.padding = '2rem';
        card.style.maxWidth = '400px';
        card.style.width = '90%';
        card.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
        card.style.textAlign = 'center';
        card.style.position = 'relative';
        overlay.appendChild(card);
    }
    
    const card = document.getElementById('global-notification-card');
    const color = type === 'error' ? '#EF4444' : '#10B981';
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    
    card.innerHTML = `
        <i class="fas ${icon}" style="font-size: 3rem; color: ${color}; margin-bottom: 1rem;"></i>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: #0F172A; margin-bottom: 0.5rem;">${type === 'error' ? 'Error' : 'Success'}</h3>
        <div style="color: #64748B; font-size: 0.875rem; margin-bottom: 1.5rem; word-break: break-word; max-height: 200px; overflow-y: auto; text-align: left; background: #F8FAFC; padding: 10px; border-radius: 6px; border: 1px solid #E2E8F0;">${message}</div>
        <button onclick="document.getElementById('global-notification-overlay').remove()" style="background-color: ${color}; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s; width: 100%;">Close</button>
    `;
}