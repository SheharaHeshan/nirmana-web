/* script.js */

document.addEventListener('DOMContentLoaded', () => {

    function showCustomAlert(title, message, isSuccess = true) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        const box = document.createElement('div');
        box.className = 'custom-alert-box';
        
        const icon = document.createElement('i');
        icon.className = isSuccess ? 'fas fa-check-circle custom-alert-icon' : 'fas fa-exclamation-circle custom-alert-icon';
        if (isSuccess) {
            icon.style.color = '#4CAF50'; // Green for success
        }
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'custom-alert-title';
        titleEl.textContent = title;
        
        const messageEl = document.createElement('p');
        messageEl.className = 'custom-alert-message';
        messageEl.textContent = message;
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary custom-alert-btn';
        btn.textContent = 'OK';
        
        box.appendChild(icon);
        box.appendChild(titleEl);
        box.appendChild(messageEl);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
        
        const closeAlert = () => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        };
        
        btn.addEventListener('click', closeAlert);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAlert();
        });
    }

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Update active nav link based on scroll position
        updateActiveNavLink();
    });

    // Mobile Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const icon = hamburger.querySelector('i');

    function toggleMenu() {
        mobileMenu.classList.toggle('active');
        if (mobileMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            // Prevent body scrolling
            document.body.style.overflow = 'hidden';
            // Also add background styling to navbar when menu is open so it stays visible
            navbar.classList.add('scrolled');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            document.body.style.overflow = 'auto';
            if (window.scrollY <= 50) {
                navbar.classList.remove('scrolled');
            }
        }
    }

    hamburger.addEventListener('click', toggleMenu);

    // Close menu when a link is clicked
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Highlight active section in navbar
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-link');

    function updateActiveNavLink() {
        let current = '';
        const navHeight = navbar.offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - navHeight - 150)) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            // Ignore for btn-solid to avoid overriding its specific style
            if (item.getAttribute('href') === `#${current}` && !item.classList.contains('btn-solid')) {
                item.classList.add('active');
            }
        });
    }

    // Form Submission Details
    const form = document.getElementById('contactForm');

    if (!form) {
        console.error('contactForm not found');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('submit intercepted');

        try {
            const formData = new FormData(form);

            const response = await fetch('https://email-sender.sheshan.workers.dev', {
                method: 'POST',
                body: formData
            });

            console.log('response status:', response.status);

            if (response.ok) {
                showCustomAlert('Success!', 'Thank you! Your message has been sent to us.', true);
                form.reset();
            } else {
                const text = await response.text();
                console.error('server returned error:', text);
                showCustomAlert('Error!', 'Something went wrong. Please try again.', false);
            }
        } catch (err) {
            console.error('fetch error:', err);
            showCustomAlert('Error!', 'Request failed. Please check your connection.', false);
        }
    });

    // Make project cards clickable for detailed view
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Prevent double firing if the inner link was clicked
            if (e.target.closest('.view-project')) {
                e.preventDefault();
            }
            window.location.href = `project-details.html?id=${index + 1}`;
        });
    });
});
