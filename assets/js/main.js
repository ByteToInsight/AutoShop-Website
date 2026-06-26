document.addEventListener('DOMContentLoaded', function () {
    initScrollReveal();
    initAccordions();
    initProductCards();
    initThumbnailGallery();
    initInputEffects();
    initMobileMenu();
    initSearchToggle();
});

function initScrollReveal() {
    if (!window.CSS.supports('animation-timeline', 'view()')) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'none';
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => {
            el.classList.add('reveal-init');
            observer.observe(el);
        });
    }
}

function initAccordions() {
    const toggles = document.querySelectorAll('[data-toggle-accordion]');
    toggles.forEach(btn => {
        btn.addEventListener('click', function () {
            const target = document.querySelector(this.dataset.toggleAccordion);
            if (target) {
                const items = target.closest('.accordion-group')?.querySelectorAll('.accordion-item') || [];
                items.forEach(item => {
                    if (item !== target) item.classList.remove('active');
                });
                target.classList.toggle('active');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    const stepButtons = document.querySelectorAll('[data-step]');
    stepButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const step = parseInt(this.dataset.step);
            if (window.toggleStep) window.toggleStep(step);
        });
    });
}

function initProductCards() {
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mousedown', () => { card.style.transform = 'scale(0.98)'; });
        card.addEventListener('mouseup', () => { card.style.transform = 'scale(1)'; });
        card.addEventListener('mouseleave', () => { card.style.transform = 'scale(1)'; });
    });
}

function initThumbnailGallery() {
    const thumbs = document.querySelectorAll('[data-thumb-gallery]');
    const mainImg = document.querySelector('[data-main-image]');
    if (!mainImg) return;
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const src = thumb.dataset.thumbSrc || thumb.querySelector('img')?.src;
            const alt = thumb.dataset.thumbAlt || thumb.querySelector('img')?.getAttribute('data-alt');
            if (src) {
                mainImg.src = src;
                if (alt) mainImg.setAttribute('data-alt', alt);
            }
            thumbs.forEach(t => t.classList.remove('border-primary'));
            thumb.classList.add('border-primary');
        });
    });
}

function initInputEffects() {
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('focus', () => {
            const label = input.closest('.field-group')?.querySelector('label');
            if (label) label.classList.add('text-primary');
        });
        input.addEventListener('blur', () => {
            const label = input.closest('.field-group')?.querySelector('label');
            if (label) label.classList.remove('text-primary');
        });
    });
}

function toggleStep(stepNumber) {
    const items = document.querySelectorAll('.accordion-item');
    items.forEach((item, index) => {
        if (index + 1 === stepNumber) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            item.classList.remove('active');
        }
    });
}

function togglePaymentFields(activeId) {
    ['upi-fields', 'card-fields'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const active = document.getElementById(activeId);
    if (active) active.classList.remove('hidden');
}

function showLoadingState(skeletonId, contentId, delay) {
    const skeletons = document.getElementById(skeletonId);
    const grid = document.getElementById(contentId);
    if (skeletons && grid) {
        setTimeout(() => {
            skeletons.classList.add('hidden');
            grid.classList.remove('hidden');
            grid.classList.add('animate-fade-in');
        }, delay || 1200);
    }
}

function showSuccessOverlay() {
    const overlay = document.getElementById('success-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    }
}

function getCart() {
    try { return JSON.parse(localStorage.getItem('autoshop_cart')) || []; }
    catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem('autoshop_cart', JSON.stringify(cart));
    updateCartBadge();
}

function addToCart(product) {
    if (!window._isAuthenticated) {
        const current = window.location.href;
        sessionStorage.setItem('cart_redirect', current);
        const toast = document.getElementById('auth-toast') || createAuthToast();
        toast.classList.remove('hidden');
        setTimeout(() => window.location.href = 'login.html?redirect=' + encodeURIComponent(current), 800);
        return;
    }
    const cart = getCart();
    const existing = cart.findIndex(item => item.slug === product.slug);
    if (existing > -1) {
        cart[existing].quantity = (cart[existing].quantity || 1) + 1;
    } else {
        cart.push({ id: product.id, slug: product.slug, name: product.name, price: product.price, image_url: product.image_url, quantity: 1 });
    }
    saveCart(cart);
    showCartAnimation();
}

function createAuthToast() {
    const toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[90] bg-surface-container-high border border-primary/30 rounded-2xl px-8 py-5 shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-fade-in';
    toast.innerHTML = '<span class="material-symbols-outlined text-primary" style="font-variation-settings:\'FILL\'1;">login</span><div><p class="font-headline-md text-headline-md text-on-surface text-sm font-semibold">Sign in required</p><p class="text-on-surface-variant text-sm">Please log in to add items to your cart.</p></div>';
    document.body.appendChild(toast);
    return toast;
}

function showCartAnimation() {
    const badge = document.querySelector('#cart-badge');
    if (!badge) return;
    badge.classList.remove('cart-bounce');
    void badge.offsetWidth;
    badge.classList.add('cart-bounce');
    const fly = document.createElement('span');
    fly.className = 'cart-fly';
    fly.textContent = '+1';
    const cartIcon = badge.closest('a') || badge.parentElement;
    if (cartIcon) {
        cartIcon.appendChild(fly);
        setTimeout(() => fly.remove(), 800);
    }
}

function removeFromCart(slug) {
    const cart = getCart().filter(item => item.slug !== slug);
    saveCart(cart);
}

function updateCartBadge() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const badges = document.querySelectorAll('#cart-badge');
    badges.forEach(badge => {
        if (total > 0) {
            badge.textContent = total;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
}

function initMobileMenu() {
    const menuBtns = document.querySelectorAll('[data-toggle-menu]');
    if (!menuBtns.length) return;
    let sidebar = document.getElementById('sidebar');
    let overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'sidebar';
        const pages = [
            { label: 'Home', icon: 'home', href: 'index.html' },
            { label: 'Shop', icon: 'storefront', href: 'shop.html' },
            { label: 'About', icon: 'info', href: 'about.html' },
            { label: 'Blog', icon: 'article', href: 'blog.html' },
            { label: 'Contact', icon: 'call', href: 'contact.html' },
            { label: 'Dashboard', icon: 'person', href: 'dashboard.html' },
            { label: 'Cart', icon: 'shopping_bag', href: 'cart.html' },
            { label: 'Wishlist', icon: 'favorite', href: 'wishlist.html' },
            { label: 'FAQ', icon: 'help', href: 'faq.html' },
        ];
        sidebar.innerHTML = '<div class="flex items-center justify-between mb-8"><h2 class="text-xl font-bold text-on-surface uppercase tracking-tighter">AUTOSHOP</h2><span class="material-symbols-outlined cursor-pointer text-on-surface-variant" id="sidebar-close">close</span></div><nav>' +
            pages.map(p => `<a href="${p.href}"><span class="material-symbols-outlined">${p.icon}</span> ${p.label}</a>`).join('') +
            '</nav>';
        document.body.prepend(sidebar);
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        document.body.prepend(overlay);
        document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }
    menuBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });
    });
}

function initSearchToggle() {
    const searchBtns = document.querySelectorAll('[data-toggle-search]');
    if (!searchBtns.length) return;
    let overlay = document.getElementById('search-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'search-overlay';
        overlay.innerHTML = '<span class="close-btn material-symbols-outlined" id="search-close">close</span><div class="search-container"><form id="search-form"><input type="text" id="search-input" placeholder="Search products..." autofocus/></form></div>';
        document.body.appendChild(overlay);
        document.getElementById('search-close').addEventListener('click', closeSearch);
        overlay.addEventListener('click', function(e) { if (e.target === this) closeSearch(); });
        document.getElementById('search-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const q = document.getElementById('search-input').value.trim();
            if (q) window.location.href = 'shop.html?search=' + encodeURIComponent(q);
            closeSearch();
        });
    }
    function closeSearch() {
        overlay.classList.remove('open');
    }
    searchBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            overlay.classList.add('open');
            setTimeout(() => document.getElementById('search-input')?.focus(), 100);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    updateCartBadge();
});

async function checkAuthState() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        window._isAuthenticated = data.authenticated;
        const links = document.querySelectorAll('#auth-link');
        links.forEach(link => {
            if (data.authenticated) {
                link.textContent = data.name || data.email;
                link.href = data.is_admin ? 'admin.html' : 'dashboard.html';
            } else {
                link.textContent = 'Sign In';
                link.href = 'login.html';
            }
        });
    } catch (e) {
        window._isAuthenticated = false;
        const links = document.querySelectorAll('#auth-link');
        links.forEach(link => {
            link.textContent = 'Sign In';
            link.href = 'login.html';
        });
    }
}
