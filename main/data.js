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
        html += `
            <div class="project-card" style="cursor: pointer;" onclick="window.location.href='project-details.html?id=${project.id}'">
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

    // We can replace the paragraph content if we have a specific container
    // We'll target the text paragraph by looking for the one right after the title
    const aboutContainer = document.querySelector('.about-content');
    if (aboutContainer && data.about.story) {
        // Try finding paragraphs
        const paragraphs = aboutContainer.querySelectorAll('p:not(.footprint-title)');
        if (paragraphs.length > 0) {
            paragraphs[0].textContent = data.about.story;
        }
    }
}

async function renderContactSettings() {
    const data = await getAllData();
    if (!data || !data.contact) return;

    const contactList = document.querySelector('.contact-list');
    if (contactList) {
        contactList.innerHTML = `
            <li>
                <i class="fas fa-map-marker-alt text-red"></i>
                <span>${data.contact.address}</span>
            </li>
            <li>
                <i class="fas fa-phone-alt text-red"></i>
                <span>${data.contact.phone}</span>
            </li>
            <li>
                <i class="fas fa-envelope text-red"></i>
                <span><a href="mailto:${data.contact.email}" style="color: inherit; text-decoration: none;">${data.contact.email}</a></span>
            </li>
        `;
    }
}

async function renderVendorsSection() {
    const data = await getAllData();
    if (!data || !data.vendors) return;

    const vendorsGrid = document.querySelector('.vendors-grid');
    if (vendorsGrid && data.vendors.length > 0) {
        let html = '';
        data.vendors.forEach(vendor => {
            let logoHtml = vendor.logo_url 
                ? `<img src="${vendor.logo_url}" alt="${vendor.name}" style="height: 40px; margin-bottom: 10px; border-radius: 4px;">` 
                : `<div style="height: 40px; margin-bottom: 10px;"></div>`;

            html += `
                <div class="vendor-card" style="text-align: center;">
                    ${logoHtml}
                    <h3 class="vendor-name">${vendor.name}</h3>
                    <p>${vendor.material}</p>
                </div>
            `;
        });
        vendorsGrid.innerHTML = html;
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    renderAboutSection();
    renderContactSettings();
    renderVendorsSection();
});
