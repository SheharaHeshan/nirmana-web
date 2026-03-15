const DEFAULT_PROJECTS = [
    { id: 1, title: "Ocean View Villa", type: "Residential", finish: "Titanium Finish", country: "Sri Lanka", desc: "Premium titanium floor finish providing a sleek and durable surface.", images: ["img/img1.jpeg", "img/img2.jpeg", "img/img3.jpeg"] },
    { id: 2, title: "Galle Fort Boutique", type: "Commercial", finish: "Polished Concrete", country: "Sri Lanka", desc: "Industrial-chic polished concrete suitable for high foot traffic.", images: ["img/img2.jpeg", "img/img1.jpeg", "img/img6.jpeg"] },
    { id: 3, title: "Sunset Apartment Complex", type: "Residential", finish: "Epoxy Coating", country: "Australia", desc: "Long-lasting and seamless epoxy coating for modern residential spaces.", images: ["img/img3.jpeg", "img/img4.jpeg", "img/img5.jpeg"] },
    { id: 4, title: "Southern Heights", type: "Corporate", finish: "Seamless Terrazzo", country: "UAE", desc: "Luxurious seamless terrazzo, providing a robust corporate environment.", images: ["img/img4.jpeg", "img/img6.jpeg", "img/img7.jpeg"] },
];

const DEFAULT_SECTORS = [
    { id: 1, name: "Residential" },
    { id: 2, name: "Commercial" },
    { id: 3, name: "Corporate" },
    { id: 4, name: "Industrial" }
];

const DEFAULT_FINISHES = [
    { id: 1, name: "Titanium Finish" },
    { id: 2, name: "Polished Concrete" },
    { id: 3, name: "Epoxy Coating" },
    { id: 4, name: "Seamless Terrazzo" }
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

function getSectors() {
    let stored = localStorage.getItem('nirmana_sectors');
    if (!stored) {
        localStorage.setItem('nirmana_sectors', JSON.stringify(DEFAULT_SECTORS));
        return DEFAULT_SECTORS;
    }
    return JSON.parse(stored);
}

function saveSectors(sectors) {
    localStorage.setItem('nirmana_sectors', JSON.stringify(sectors));
}

function getFinishes() {
    let stored = localStorage.getItem('nirmana_finishes');
    if (!stored) {
        localStorage.setItem('nirmana_finishes', JSON.stringify(DEFAULT_FINISHES));
        return DEFAULT_FINISHES;
    }
    return JSON.parse(stored);
}

function saveFinishes(finishes) {
    localStorage.setItem('nirmana_finishes', JSON.stringify(finishes));
}
