/**
 * PrivCloud - Feature Showcase Orchestrator & Dynamic Enhancements
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check GSAP & ScrollTrigger readiness
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        console.log("✅ GSAP ScrollTrigger registered for Feature Showcase.");
    }
});
