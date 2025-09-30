// Main JavaScript for Landing Page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializePage();
    setupEventListeners();
    addScrollEffects();
});

function initializePage() {
    // Hide loading screen after page loads
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('active');
        }
    }, 500);

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupEventListeners() {
    // Try Demo button click handler
    const tryDemoBtn = document.getElementById('tryDemoBtn');
    if (tryDemoBtn) {
        tryDemoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Show loading
            const loading = document.getElementById('loading');
            if (loading) {
                loading.classList.add('active');
            }
            
            // Simulate loading time for better UX
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        });
    }

    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

function addScrollEffects() {
    // Header background effect on scroll
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.backdropFilter = 'blur(20px)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        }
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards for animation
    const elementsToAnimate = document.querySelectorAll('.feature-card');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
}

// Utility function to show loading
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('active');
    }
}

// Utility function to hide loading
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('active');
    }
}

// Add some interactive particles to the hero background
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 4 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = 'rgba(102, 126, 234, 0.3)';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${Math.random() * 10 + 10}s ease-in-out infinite`;
        particle.style.animationDelay = Math.random() * 5 + 's';
        
        hero.appendChild(particle);
    }
}

// Initialize particles
setTimeout(createParticles, 1000);