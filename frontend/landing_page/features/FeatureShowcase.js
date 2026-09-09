/**
 * PrivCloud — Feature Showcase Interactive Section (FeatureShowcase.js)
 * High-performance standard JS (React.createElement) — Eliminates runtime Babel compilation overhead.
 */

(function () {
  'use strict';

  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    return;
  }

  const { useState, useEffect, useRef, createElement: h } = React;
  const SUPABASE_ASSETS_URL = "https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets";

  const featuresData = [
    {
      number: "01",
      badge: "File System",
      title: "File & Folder Management",
      headline: "Total control over your files and directory trees.",
      description: "Organize, rename, move, and compress entire folders in milliseconds with native desktop precision and zero upload bottlenecks.",
      chips: [
        { icon: "📁", label: "Directory Browser" },
        { icon: "📦", label: "One-Click ZIP" },
        { icon: "⚡", label: "Bulk Multi-Select" },
        { icon: "📊", label: "Instant Metadata" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/01-file-management.jpg`,
      accent: "#0284c7",
      gradient: "linear-gradient(135deg, #0284c7 0%, #0072ff 100%)",
      glow: "rgba(2, 132, 199, 0.25)",
      icon: "📁"
    },
    {
      number: "02",
      badge: "Fast Ingestion",
      title: "Upload & Ingestion System",
      headline: "High-speed chunked uploads with zero drops.",
      description: "Drag and drop massive files or nested hierarchies with resilient multi-part transfers, upload staging, and real-time progress monitoring.",
      chips: [
        { icon: "🚀", label: "Chunked Transfer" },
        { icon: "📂", label: "Preserve Folders" },
        { icon: "⚡", label: "Drag & Drop Anywhere" },
        { icon: "📊", label: "Live Queue Meter" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/02-upload-system.jpg`,
      accent: "#7c3aed",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      glow: "rgba(124, 58, 237, 0.25)",
      icon: "📤"
    },
    {
      number: "03",
      badge: "Media & Docs",
      title: "In-Browser Preview & Media Suite",
      headline: "Instant 4K playback and document inspection.",
      description: "Stream 4K video and audio, explore high-res photo galleries, read PDFs, and inspect syntax-highlighted code directly in your browser.",
      chips: [
        { icon: "🎬", label: "4K Media Player" },
        { icon: "🔍", label: "Zoomable Gallery" },
        { icon: "📄", label: "Native PDF Viewer" },
        { icon: "💻", label: "Code & Markdown" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/03-media-suite.jpg`,
      accent: "#e11d48",
      gradient: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
      glow: "rgba(225, 29, 72, 0.25)",
      icon: "👁️"
    },
    {
      number: "04",
      badge: "Collaboration",
      title: "Smart Sharing & Collaboration",
      headline: "Share securely with passcode & auto-expiry.",
      description: "Generate protected download links, create dropboxes for client uploads, and pair mobile devices instantly with dynamic QR codes.",
      chips: [
        { icon: "🔒", label: "Passcode Protection" },
        { icon: "⏱️", label: "Timed Auto-Expiry" },
        { icon: "📱", label: "Instant QR Pairing" },
        { icon: "📥", label: "Upload Dropboxes" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/04-smart-sharing.jpg`,
      accent: "#0d9488",
      gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
      glow: "rgba(13, 148, 136, 0.25)",
      icon: "🔗"
    },
    {
      number: "05",
      badge: "Storage Control",
      title: "Storage Analytics & Quotas",
      headline: "Real-time capacity insights and proactive quotas.",
      description: "Gain complete visibility into disk distribution across file types and establish quota safeguards before storage limits are hit.",
      chips: [
        { icon: "📊", label: "Visual Breakdown" },
        { icon: "⚡", label: "Real-Time Capacity" },
        { icon: "🛡️", label: "Exhaustion Guard" },
        { icon: "⚙️", label: "Custom Quotas" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/05-storage-analytics.jpg`,
      accent: "#ea580c",
      gradient: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
      glow: "rgba(234, 88, 12, 0.25)",
      icon: "📊"
    },
    {
      number: "06",
      badge: "Instant Discovery",
      title: "Search, Organization & Navigation",
      headline: "Find anything across deep hierarchies in milliseconds.",
      description: "Navigate with interactive breadcrumbs, star favorites for instant 1-click access, and filter files with live spotlight search.",
      chips: [
        { icon: "🔍", label: "Spotlight Search" },
        { icon: "⭐", label: "Starred Favorites" },
        { icon: "🧭", label: "Smart Breadcrumbs" },
        { icon: "📐", label: "Grid & List Views" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/06-search-navigation.jpg`,
      accent: "#db2777",
      gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
      glow: "rgba(219, 39, 119, 0.25)",
      icon: "🔍"
    },
    {
      number: "07",
      badge: "Customization",
      title: "User Experience & Interface",
      headline: "Adaptive responsive design built for every device.",
      description: "Enjoy a tailored personal cloud experience with persisted theme settings, responsive mobile interfaces, and contextual toast alerts.",
      chips: [
        { icon: "🎨", label: "Theme Personalization" },
        { icon: "📱", label: "Mobile Responsive" },
        { icon: "🔔", label: "Contextual Toasts" },
        { icon: "⚙️", label: "Account Settings" }
      ],
      image: `${SUPABASE_ASSETS_URL}/features/07-user-experience.jpg`,
      accent: "#0284c7",
      gradient: "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)",
      glow: "rgba(2, 132, 199, 0.25)",
      icon: "🎨"
    }
  ];

  function FeatureShowcase() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const sectionRef = useRef(null);
    const containerRef = useRef(null);
    const centerMockupRef = useRef(null);

    useEffect(() => {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const sectionEl = sectionRef.current;
      const containerEl = containerRef.current;
      if (!sectionEl || !containerEl) return;

      const totalFeatures = featuresData.length;
      const scrollDistance = totalFeatures * window.innerHeight * 1.15;

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionEl,
            start: "top top",
            end: `+=${scrollDistance}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            onUpdate: (self) => {
              const rawProgress = self.progress;
              const newIndex = Math.min(
                totalFeatures - 1,
                Math.max(0, Math.floor(rawProgress * totalFeatures * 0.999))
              );
              setActiveIndex(newIndex);
            }
          }
        });

        featuresData.forEach((feat, i) => {
          if (i < totalFeatures - 1) {
            const stepTime = i + 1;
            const currentImg = `#feature-img-${i}`;
            const nextImg = `#feature-img-${i + 1}`;

            tl.to(currentImg, {
              opacity: 0,
              scale: 0.88,
              y: -25,
              rotateX: 6,
              filter: "blur(4px)",
              duration: 0.5,
              ease: "power2.inOut"
            }, stepTime);

            tl.fromTo(nextImg, {
              opacity: 0,
              scale: 1.12,
              y: 30,
              rotateX: -6,
              filter: "blur(5px)"
            }, {
              opacity: 1,
              scale: 1,
              y: 0,
              rotateX: 0,
              filter: "blur(0px)",
              duration: 0.5,
              ease: "power2.out"
            }, stepTime + 0.1);

            const currentContent = `#feature-content-${i}`;
            const nextContent = `#feature-content-${i + 1}`;

            tl.to(currentContent, {
              opacity: 0,
              y: -20,
              filter: "blur(3px)",
              duration: 0.4,
              ease: "power2.in"
            }, stepTime);

            tl.fromTo(nextContent, {
              opacity: 0,
              y: 25,
              filter: "blur(3px)"
            }, {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.45,
              ease: "power2.out"
            }, stepTime + 0.15);

            const nextChips = `#feature-content-${i + 1} .showcase-spec-chip`;
            tl.fromTo(nextChips, {
              opacity: 0,
              y: 12,
              scale: 0.95
            }, {
              opacity: 1,
              y: 0,
              scale: 1,
              stagger: 0.04,
              duration: 0.35,
              ease: "power2.out"
            }, stepTime + 0.25);
          }
        });
      }, sectionRef);

      return () => {
        ctx.revert();
      };
    }, []);

    const handleMouseMove = (e) => {
      if (!centerMockupRef.current) return;
      const rect = centerMockupRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: -(y * 6).toFixed(2),
        y: (x * 8).toFixed(2)
      });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    const activeFeature = featuresData[activeIndex];

    return h('div', {
      className: 'showcase-scroll-wrapper',
      ref: sectionRef,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave
    },
      h('div', { className: 'showcase-pinned-stage', ref: containerRef },
        h('div', {
          className: 'showcase-ambient-glow primary-glow',
          style: {
            background: `radial-gradient(circle, ${activeFeature.glow} 0%, rgba(224, 242, 254, 0) 70%)`
          }
        }),
        h('div', { className: 'showcase-grid-overlay' }),
        h('header', { className: 'showcase-header' },
          h('h2', { className: 'showcase-main-title' },
            'Engineered for ',
            h('span', {
              className: 'title-gradient-word',
              style: { backgroundImage: activeFeature.gradient }
            }, 'Simplicity & Power')
          )
        ),
        h('div', { className: 'showcase-columns-grid' },
          // Left column
          h('aside', { className: 'showcase-left-nav' },
            h('div', { className: 'showcase-active-name-wrapper' },
              h('span', {
                className: 'showcase-feature-counter-tag',
                style: { color: activeFeature.accent }
              },
                `0${activeIndex + 1} `,
                h('span', { className: 'counter-slash' }, '/'),
                ' 07'
              ),
              h('h3', { className: 'showcase-active-feature-name' }, activeFeature.title)
            )
          ),
          // Center column
          h('main', { className: 'showcase-center-visual' },
            h('div', {
              className: 'showcase-mockup-studio',
              ref: centerMockupRef,
              style: {
                transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                '--mockup-glow': activeFeature.glow,
                '--mockup-accent': activeFeature.accent
              }
            },
              h('div', { className: 'studio-frame-shell' },
                h('div', { className: 'studio-topbar' },
                  h('div', { className: 'studio-controls' },
                    h('span', { className: 'control-dot close' }),
                    h('span', { className: 'control-dot minimize' }),
                    h('span', { className: 'control-dot expand' })
                  ),
                  h('div', { className: 'studio-address-capsule' },
                    h('img', {
                      src: `${SUPABASE_ASSETS_URL}/logo.png`,
                      alt: 'PrivCloud',
                      style: { width: '15px', height: '15px', objectFit: 'contain', borderRadius: '3px' }
                    }),
                    h('span', { className: 'capsule-host' }, 'privcloud.local'),
                    h('span', { className: 'capsule-path' }, `/${activeFeature.badge.toLowerCase().replace(/\\s+/g, '-')}`)
                  ),
                  h('div', { className: 'studio-status-pill' },
                    h('span', { className: 'status-live-beacon' }),
                    h('span', { className: 'status-label' }, 'Engine Active')
                  )
                ),
                h('div', { className: 'studio-image-screen' },
                  featuresData.map((feature, idx) =>
                    h('div', {
                      key: feature.number,
                      id: `feature-img-${idx}`,
                      className: `studio-image-slide ${idx === 0 ? 'visible-initially' : ''}`
                    },
                      h('img', {
                        src: feature.image,
                        alt: feature.title,
                        className: 'studio-img-asset',
                        loading: idx === 0 ? 'eager' : 'lazy'
                      }),
                      h('div', {
                        className: 'studio-floating-tag',
                        style: { background: feature.gradient }
                      },
                        h('span', { className: 'tag-icon' }, feature.icon),
                        h('span', { className: 'tag-title' }, feature.badge)
                      )
                    )
                  ),
                  h('div', { className: 'studio-screen-glare' })
                )
              )
            )
          ),
          // Right column
          h('aside', { className: 'showcase-right-details' },
            h('div', { className: 'showcase-content-viewport' },
              featuresData.map((feature, idx) =>
                h('div', {
                  key: feature.number,
                  id: `feature-content-${idx}`,
                  className: `showcase-detail-pane ${idx === 0 ? 'visible-initially' : ''}`
                },
                  h('div', { className: 'detail-meta-header' },
                    h('span', {
                      className: 'detail-category-pill',
                      style: { background: feature.gradient }
                    }, feature.badge)
                  ),
                  h('h3', { className: 'detail-headline' }, feature.headline),
                  h('p', { className: 'detail-summary' }, feature.description),
                  h('div', { className: 'detail-separator' }),
                  h('div', { className: 'showcase-specs-grid' },
                    feature.chips.map((chip, cIdx) =>
                      h('div', { key: cIdx, className: 'showcase-spec-chip' },
                        h('span', { className: 'spec-chip-icon' }, chip.icon),
                        h('span', { className: 'spec-chip-label' }, chip.label)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  // Mount the React Component
  const rootElement = document.getElementById('feature-showcase-root');
  if (rootElement && typeof ReactDOM !== 'undefined') {
    const root = ReactDOM.createRoot(rootElement);
    root.render(h(FeatureShowcase));
  }
})();
