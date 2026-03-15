const DEFAULT_PROJECTS = [
    { id: 1, title: "Ocean View Villa", type: "Residential", finish: "Titanium Finish", country: "Sri Lanka", desc: "Premium titanium floor finish providing a sleek and durable surface.", images: ["img/img1.jpeg", "img/img2.jpeg", "img/img3.jpeg"] },
    { id: 2, title: "Galle Fort Boutique", type: "Commercial", finish: "Polished Concrete", country: "Sri Lanka", desc: "Industrial-chic polished concrete suitable for high foot traffic.", images: ["img/img2.jpeg", "img/img1.jpeg", "img/img6.jpeg"] },
    { id: 3, title: "Sunset Apartment Complex", type: "Residential", finish: "Epoxy Coating", country: "Australia", desc: "Long-lasting and seamless epoxy coating for modern residential spaces.", images: ["img/img3.jpeg", "img/img4.jpeg", "img/img5.jpeg"] },
    { id: 4, title: "Southern Heights", type: "Corporate", finish: "Seamless Terrazzo", country: "UAE", desc: "Luxurious seamless terrazzo, providing a robust corporate environment.", images: ["img/img4.jpeg", "img/img6.jpeg", "img/img7.jpeg"] },
];


function getProjects() {
    let stored = localStorage.getItem('nirmana_projects');
    if (!stored) {
        localStorage.setItem('nirmana_projects', JSON.stringify(DEFAULT_PROJECTS));
        return DEFAULT_PROJECTS;
    }
    return JSON.parse(stored);
}

function saveProjects(projects) {
    localStorage.setItem('nirmana_projects', JSON.stringify(projects));
}

function getProjectById(id) {
    const projects = getProjects();
    return projects.find(p => p.id === parseInt(id));
}

function renderProjectsGrid(containerId, limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const projects = getProjects();
    const displayProjects = limit ? projects.slice(0, limit) : projects;

    let html = '';
    displayProjects.forEach(project => {
        let mainImage = project.images && project.images.length > 0 ? project.images[0] : 'img/img1.jpeg';
        html += `
            <div class="project-card" style="cursor: pointer;" onclick="window.location.href='project-details.html?id=${project.id}'">
                <img src="${mainImage}" alt="${project.title}">
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

// Updated data.js functions
const API_URL = "https://admin-handler.sheshan.workers.dev/api";

// --- SECTOR FUNCTIONS ---

async function getSectors() {
    const res = await fetch(`${API_URL}/sectors`);
    return await res.json();
}

async function saveSector() {
    const idVal = document.getElementById('sector-id').value;
    const name = document.getElementById('sector-name').value;

    const method = idVal ? 'PUT' : 'POST';
    const payload = idVal ? { id: parseInt(idVal), name } : { name };

    await fetch(`${API_URL}/sectors`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    resetSectorForm();
    renderSectors(); // Re-render table
}

async function deleteSector(id) {
    if (confirm("Delete this sector?")) {
        await fetch(`${API_URL}/sectors?id=${id}`, { method: 'DELETE' });
        renderSectors();
    }
}

// --- FINISH FUNCTIONS ---

async function getFinishes() {
    const res = await fetch(`${API_URL}/finishes`);
    return await res.json();
}

async function saveFinish() {
    const idVal = document.getElementById('finish-id').value;
    const name = document.getElementById('finish-name').value;

    const method = idVal ? 'PUT' : 'POST';
    const payload = idVal ? { id: parseInt(idVal), name } : { name };

    await fetch(`${API_URL}/finishes`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    resetFinishForm();
    renderFinishes();
}

async function deleteFinish(id) {
    if (confirm("Delete this finish type?")) {
        await fetch(`${API_URL}/finishes?id=${id}`, { method: 'DELETE' });
        renderFinishes();
    }
}

// --- UPDATED RENDER FUNCTIONS (Must be async) ---

async function renderSectors() {
    const sectors = await getSectors();
    const tbody = document.getElementById('sector-list');
    const selectEl = document.getElementById('type');

    let tHtml = '';
    let sHtml = '<option value="">Select a sector type</option>';

    sectors.forEach(s => {
        tHtml += `
            <tr>
                <td>${s.name}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="editSector(${s.id}, '${s.name}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSector(${s.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        sHtml += `<option value="${s.name}">${s.name}</option>`;
    });

    if (tbody) tbody.innerHTML = tHtml || '<tr><td colspan="2">No sectors.</td></tr>';
    if (selectEl) selectEl.innerHTML = sHtml;
}

async function renderFinishes() {
    const finishes = await getFinishes();
    const tbody = document.getElementById('finish-list');
    const selectEl = document.getElementById('finish');

    let tHtml = '';
    let fHtml = '<option value="">Select a finish type</option>';

    finishes.forEach(f => {
        tHtml += `
            <tr>
                <td>${f.name}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="editFinish(${f.id}, '${f.name}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFinish(${f.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        fHtml += `<option value="${f.name}">${f.name}</option>`;
    });

    if (tbody) tbody.innerHTML = tHtml || '<tr><td colspan="2">No finishes.</td></tr>';
    if (selectEl) selectEl.innerHTML = fHtml;
}
