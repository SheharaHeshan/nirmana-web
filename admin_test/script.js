const fileInput = document.getElementById('fileInput');
const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('emptyState');

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

fileInput.addEventListener('change', function(e) {
    const files = e.target.files;

    if (files.length > 0) {
        emptyState.style.display = 'none';
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        
        reader.onload = function(event) {
            const card = document.createElement('div');
            card.className = 'image-card';
            
            const img = document.createElement('img');
            img.src = event.target.result;
            img.alt = file.name;
            
            const info = document.createElement('div');
            info.className = 'image-info';
            
            const name = document.createElement('span');
            name.className = 'image-name';
            name.textContent = file.name;
            name.title = file.name;
            
            const size = document.createElement('span');
            size.className = 'image-size';
            size.textContent = formatBytes(file.size);
            
            info.appendChild(name);
            info.appendChild(size);
            
            card.appendChild(img);
            card.appendChild(info);
            
            gallery.prepend(card); // Add new images at the top
        };

        reader.readAsDataURL(file);
    });

    // Reset input so the same files can be selected again if needed
    fileInput.value = '';
});
