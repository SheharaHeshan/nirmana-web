const BASE_URL = 'https://admin-handler.sheshan.workers.dev/api';
let globalDataCache = null;

async function getAllData() {
    if (globalDataCache) return globalDataCache;
    try {
        const res = await fetch(`${BASE_URL}/all`);
        const data = await res.json();
        globalDataCache = data;
        return data;
    } catch (err) {
        console.error("Failed to load data from API", err);
        return { projects: [], sectors: [], finishes: [], about: {}, contact: {} };
    }
}

async function getProjects() {
    const data = await getAllData();
    if (!data || !data.projects) return [];
    
    // Format projects to easily match what the frontend expects
    return data.projects.map(p => {
        let gal = [];
        try { gal = JSON.parse(p.gallery_images || "[]"); } catch(e) {}
        
        const sectorName = data.sectors.find(s => s.id === p.sector_id)?.name || 'N/A';
        const finishName = data.finishes.find(f => f.id === p.finish_id)?.name || 'N/A';
        
        return {
            id: p.id,
            title: p.title,
            type: sectorName,
            finish: finishName,
            country: p.country || '',
            desc: p.description,
            // Provide a reliable primary image
            primary_image: p.primary_image || (gal.length > 0 ? gal[0] : 'https://placehold.co/800x600?text=No+Image'),
            // Gallery holds all images including primary for sliders if needed
            images: [p.primary_image, ...gal].filter(Boolean)
        };
    });
}

async function getProjectById(id) {
    const projects = await getProjects();
    return projects.find(p => p.id === parseInt(id));
}

async function renderProjectsGrid(containerId, limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Loading State
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin fa-2x"></i> <p style="margin-top: 10px;">Loading projects...</p></div>';

    const projects = await getProjects();
    const displayProjects = limit ? projects.slice(0, limit) : projects;

    if (displayProjects.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><p>No projects found.</p></div>';
        return;
    }

    let html = '';
    displayProjects.forEach(project => {
        let mainImage = project.primary_image;
        
        let countryBadge = '';
        if (project.country) {
            const flagMap = {
                'Sri Lanka': 'lk', 'Maldives': 'mv', 'USA': 'us', 
                'UK': 'gb', 'Australia': 'au', 'UAE': 'ae'
            };
            const code = flagMap[project.country] || 'un';
            countryBadge = `
                <div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.65); color: #fff; padding: 5px 12px; border-radius: 25px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px); letter-spacing: 0.5px; z-index: 2; border: 1px solid rgba(255,255,255,0.1);">
                    <img src="https://flagcdn.com/${code}.svg" alt="${project.country} flag" style="width: 16px; height: 12px; border-radius: 2px; object-fit: cover;">
                    ${project.country.toUpperCase()}
                </div>
            `;
        }
        
        html += `
            <div class="project-card" style="cursor: pointer; position: relative;" onclick="window.location.href='project-details.html?id=${project.id}'">
                ${countryBadge}
                <img src="${mainImage}" alt="${project.title}" style="object-fit: cover; width: 100%; aspect-ratio: 4/3;">
                <div class="project-info">
                    <h3>${project.title}</h3>
                    <p>${project.type} • ${project.finish}</p>
                    <a href="project-details.html?id=${project.id}" class="view-project" onclick="event.stopPropagation();"><i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function renderAboutSection() {
    const data = await getAllData();
    if (!data || !data.about) return;

    // Update Experience Badge
    const expBadge = document.querySelector('.experience-badge .num');
    if (expBadge) expBadge.textContent = data.about.years_experience;

    // Update Image
    const aboutImg = document.querySelector('.about-image');
    if (aboutImg && data.about.about_image) {
        aboutImg.src = data.about.about_image;
    }

    // Update Story
    const aboutContent = document.querySelector('.about-content p');
    if (aboutContent && data.about.story) {
        aboutContent.textContent = data.about.story;
    }

    // Render Global Reach
    const reachContainer = document.querySelector('.footprint-locations');
    if (reachContainer && data.global_reach && data.global_reach.length > 0) {
        reachContainer.innerHTML = data.global_reach.map(r => {
            const flagMap = { 
                'Sri Lanka': 'lk', 'Maldives': 'mv', 'USA': 'us', 
                'UK': 'gb', 'Australia': 'au', 'UAE': 'ae', 'India': 'in' 
            };
            const code = flagMap[r.country_name] || 'un';
            return `
                <div class="location-item">
                    <img src="https://flagcdn.com/${code.toLowerCase()}.svg" alt="${r.country_name} Flag" class="location-flag">
                    <div class="location-info">
                        <span class="location-country">${r.country_name}</span>
                        <span class="location-role">${r.description}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

async function renderContactSettings() {
    const data = await getAllData();
    if (!data || !data.contact) return;

    const emailEl = document.getElementById('contact-email-text');
    if (emailEl) emailEl.innerHTML = `<a href="mailto:${data.contact.email}" style="color: inherit; text-decoration: none;">${data.contact.email}</a>`;

    const addressEl = document.getElementById('contact-address-text');
    if (addressEl) addressEl.textContent = data.contact.address;

    const phoneContainer = document.getElementById('contact-phone-container');
    if (phoneContainer && data.contact.phone) {
        // Split by comma OR newline to be flexible for the admin
        const numbers = data.contact.phone.replace(/,/g, '\n').split('\n').map(n => n.trim()).filter(Boolean);
        phoneContainer.innerHTML = numbers.map(num => `
            <a href="tel:${num.replace(/\s+/g, '')}" style="color: inherit; text-decoration: none; display: block;">${num}</a>
        `).join('');
    }
}

async function renderServicesSection() {
    const data = await getAllData();
    if (!data || !data.services || data.services.length === 0) return;

    const servicesGrid = document.querySelector('.services-grid');
    if (servicesGrid) {
        servicesGrid.innerHTML = data.services.map(service => `
            <div class="service-card">
                <i class="${service.icon_class} service-icon"></i>
                <h3 class="service-title">${service.title}</h3>
                <p class="service-desc">${service.description}</p>
            </div>
        `).join('');
    }
}

async function renderVendorsSection() {
    const data = await getAllData();
    if (!data || !data.vendors || data.vendors.length === 0) return;

    const container = document.getElementById('vendors-grid-container');
    if (container) {
        const slides = data.vendors.map(vendor => {
            const logo = vendor.logo_url 
                ? `<img src="${vendor.logo_url}" alt="${vendor.name}">` 
                : `<div style="height: 80px; display: flex; align-items: center;"><i class="fas fa-truck fa-3x"></i></div>`;
            
            return `
                <div class="vendor-scroller-card">
                    ${logo}
                    <h3>${vendor.name}</h3>
                    <p>${vendor.material}</p>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="vendors-marquee">
                <div class="vendors-track">
                    ${slides}
                    ${slides}
                </div>
            </div>
        `;
    }
}
async function initInquiryForm() {
    const data = await getAllData();
    const select = document.getElementById('contact-service-select');
    if (select && data.services) {
        select.innerHTML = '<option value="" disabled selected>Select Service</option>' + 
            data.services.map(s => `<option value="${s.title}">${s.title}</option>`).join('');
    }

    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // 1. Enter Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
            
            const formData = new FormData(form);
            const payload = {
                name: formData.get('fullName'),
                email: formData.get('email'),
                service: formData.get('service'), 
                message: formData.get('projectDetails')
            };

            // Ensure Email Worker gets consistent field names
            formData.append('name', payload.name);
            formData.append('message', payload.message);
            formData.append('floorType', payload.service);

            try {
                // Run both requests in parallel for speed
                const [d1Promise, emailPromise] = [
                    fetch(`${BASE_URL}/inquiry`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }),
                    fetch('https://email-sender.sheshan.workers.dev', {
                        method: 'POST',
                        body: formData
                    })
                ];

                const [d1Res, emailRes] = await Promise.all([d1Promise, emailPromise]);

                // 2. Exit Loading State
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;

                if (d1Res.ok || emailRes.ok) {
                    showModernAlert('Message Sent!', 'Thank you! We have received your inquiry. Our experts will get back to you shortly.', 'success');
                    form.reset();
                } else {
                    throw new Error('Server Error');
                }
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                showModernAlert('Oops!', 'There was a connection issue. Please try again in a moment.', 'error');
            }
        });
    }
}

function showModernAlert(title, message, type = 'success') {
    const overlay = document.createElement('div');
    overlay.style = `
        position: fixed; top:0; left:0; width:100%; height:100%; 
        background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; animation: fadeIn 0.3s ease;
    `;
    
    const color = type === 'success' ? '#10B981' : '#EF4444';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    
    const card = document.createElement('div');
    card.style = `
        background: white; padding: 2.5rem; border-radius: 1.5rem;
        max-width: 420px; width: 90%; text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        transform: translateY(20px); transition: transform 0.3s ease;
    `;
    
    card.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <i class="fas ${icon}" style="font-size: 4rem; color: ${color};"></i>
        </div>
        <h3 style="font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 0.75rem; text-transform: uppercase;">${title}</h3>
        <p style="color: #64748b; margin-bottom: 2rem; line-height: 1.6;">${message}</p>
        <button id="close-alert-btn" style="
            background: #1e293b; color: white; border: none; 
            padding: 1rem 2rem; border-radius: 0.75rem; 
            font-weight: 700; width: 100%; cursor: pointer;
            transition: transform 0.2s;
        ">CONTINUE</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => card.style.transform = 'translateY(0)', 10);

    const close = () => {
        card.style.transform = 'translateY(20px)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#close-alert-btn').onclick = close;
    overlay.onclick = (e) => { if(e.target === overlay) close(); };
}
// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    renderAboutSection();
    renderContactSettings();
    renderVendorsSection();
    renderServicesSection();
    initInquiryForm();
});
