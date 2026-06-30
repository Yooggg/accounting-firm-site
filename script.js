const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link, .nav-menu .btn, .footer-links a');

function closeMenu() {
	hamburger.classList.remove('active');
	navMenu.classList.remove('open');
	document.body.classList.remove('menu-open');
	hamburger.setAttribute('aria-expanded', 'false');
	hamburger.setAttribute('aria-label', 'Открыть меню');
}

hamburger.addEventListener('click', () => {
	const isOpen = navMenu.classList.toggle('open');
	hamburger.classList.toggle('active', isOpen);
	document.body.classList.toggle('menu-open', isOpen);
	hamburger.setAttribute('aria-expanded', String(isOpen));
	hamburger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});

navLinks.forEach((link) => link.addEventListener('click', closeMenu));

document.querySelectorAll('.details-link').forEach((button) => {
	button.addEventListener('click', () => {
		const card = button.closest('.service-card');
		const isOpen = card.classList.toggle('open');
		button.textContent = isOpen ? 'Свернуть' : 'Подробнее';
	});
});

const form = document.getElementById('contactForm');
const successMessage = document.getElementById('successMessage');

form.addEventListener('submit', (event) => {
	event.preventDefault();
	const requiredFields = form.querySelectorAll('[required]');
	let isValid = true;

	requiredFields.forEach((field) => {
		const empty = !field.value.trim();
		field.classList.toggle('invalid', empty);
		if (empty) isValid = false;
	});

	if (!isValid) {
		successMessage.classList.remove('show');
		return;
	}

	form.reset();
	successMessage.classList.add('show');
});

form.querySelectorAll('[required]').forEach((field) => {
	field.addEventListener('input', () => field.classList.remove('invalid'));
});

const sections = document.querySelectorAll('main section[id]');
const menuLinks = document.querySelectorAll('.nav-link');

const navObserver = new IntersectionObserver(
	(entries) => {
		entries.forEach((entry) => {
			if (!entry.isIntersecting) return;
			menuLinks.forEach((link) => {
				link.classList.toggle(
					'active',
					link.getAttribute('href') === `#${entry.target.id}`
				);
			});
		});
	},
	{ rootMargin: '-35% 0px -55% 0px', threshold: 0.01 }
);

sections.forEach((section) => navObserver.observe(section));

const fadeObserver = new IntersectionObserver(
	(entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add('visible');
				fadeObserver.unobserve(entry.target);
			}
		});
	},
	{ threshold: 0.12 }
);

document.querySelectorAll('.fade-in').forEach((element) => fadeObserver.observe(element));
