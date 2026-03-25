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
        populateForms(data.about, data.contact);
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

// --- ABOUT & CONTACT ACTIONS ---

async function updateAbout(event) {
    event.preventDefault();
    const data = {
        story: document.getElementById('about-story').value,
        years_experience: document.getElementById('years-exp').value,
        completed_projects: document.getElementById('projects-count').value
    };
    await fetch(`${BASE_URL}/about`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    showNotification("About info updated!", 'success');
}

async function updateContact(event) {
    event.preventDefault();
    const data = {
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        address: document.getElementById('contact-address').value
    };
    await fetch(`${BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    showNotification("Contact info updated!", 'success');
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
        document.getElementById('about-story').value = about.story;
        document.getElementById('years-exp').value = about.years_experience;
        document.getElementById('projects-count').value = about.completed_projects;
    }
    if (contact) {
        document.getElementById('contact-email').value = contact.email;
        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-address').value = contact.address;
    }
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