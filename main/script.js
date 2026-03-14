/* script.js */

document.addEventListener('DOMContentLoaded', () => {
    
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
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
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
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // Since there is no backend, we just alert a success message
            alert("Thank you for your message! Our team will get back to you shortly.");
            form.reset();
        });
    }

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
