/**
 * PrivCloud - About Section & Footer Enhancements
 */

document.addEventListener('DOMContentLoaded', () => {
    // Dynamic footer year
    const copyEl = document.querySelector('.footer-copy');
    if (copyEl) {
        const currentYear = new Date().getFullYear();
        copyEl.innerHTML = `&copy; ${currentYear} PrivCloud. All rights reserved.`;
    }

    // Avatar 3D tilt micro-interaction
    const avatar = document.querySelector('.about-me-avatar-img');
    if (avatar) {
        avatar.addEventListener('mousemove', (e) => {
            const rect = avatar.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            avatar.style.transform = `scale(1.08) rotate(${x * 0.05}deg)`;
        });

        avatar.addEventListener('mouseleave', () => {
            avatar.style.transform = 'scale(1) rotate(0deg)';
        });
    }
});
