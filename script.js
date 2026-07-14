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
const consentCheckbox = document.getElementById('consent');
const consentLabel = document.querySelector('.consent-label');
const submitButton = form.querySelector('button[type="submit"]');
const toastContainer = document.getElementById('toastContainer');

function showToast({ type = 'success', title, text, duration = 5000 }) {
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.setAttribute('role', 'status');

	const icon = document.createElement('span');
	icon.className = 'toast-icon';
	icon.textContent = type === 'success' ? '✓' : '!';
	icon.setAttribute('aria-hidden', 'true');

	const body = document.createElement('div');
	body.className = 'toast-body';
	body.innerHTML = `<p class="toast-title"></p><p class="toast-text"></p>`;
	body.querySelector('.toast-title').textContent = title;
	body.querySelector('.toast-text').textContent = text;

	const closeBtn = document.createElement('button');
	closeBtn.className = 'toast-close';
	closeBtn.type = 'button';
	closeBtn.setAttribute('aria-label', 'Закрыть уведомление');
	closeBtn.textContent = '×';

	toast.append(icon, body, closeBtn);
	toastContainer.appendChild(toast);

	requestAnimationFrame(() => toast.classList.add('toast-visible'));

	let dismissTimer;
	function dismiss() {
		clearTimeout(dismissTimer);
		toast.classList.remove('toast-visible');
		toast.classList.add('toast-leaving');
		toast.addEventListener('transitionend', () => toast.remove(), { once: true });
	}

	closeBtn.addEventListener('click', dismiss);
	dismissTimer = setTimeout(dismiss, duration);
}

function setFieldError(fieldName, message) {
	const input = document.getElementById(fieldName);
	if (!input) return;

	if (fieldName === 'consent') {
		consentLabel.classList.add('invalid');
	} else {
		input.classList.add('invalid');
	}

	const container = input.closest('.field');
	if (!container) return;
	let errorEl = container.querySelector('.field-error-text');
	if (!errorEl) {
		errorEl = document.createElement('p');
		errorEl.className = 'field-error-text';
		container.appendChild(errorEl);
	}
	errorEl.textContent = message;
}

function clearFieldErrors() {
	form.querySelectorAll('.field-error-text').forEach((el) => el.remove());
	form.querySelectorAll('input.invalid, textarea.invalid').forEach((el) =>
		el.classList.remove('invalid')
	);
	if (consentLabel) consentLabel.classList.remove('invalid');
}

form.addEventListener('submit', async (event) => {
	event.preventDefault();
	clearFieldErrors();

	const requiredFields = form.querySelectorAll(
		'input[required]:not([type="checkbox"]), textarea[required]'
	);
	let isValid = true;

	requiredFields.forEach((field) => {
		if (!field.value.trim()) {
			setFieldError(field.id, 'Заполните это поле');
			isValid = false;
		}
	});

	if (consentCheckbox && !consentCheckbox.checked) {
		setFieldError('consent', 'Нужно поставить галочку согласия');
		isValid = false;
	}

	if (!isValid) return;

	const payload = {
		name: form.name.value.trim(),
		phone: form.phone.value.trim(),
		message: form.message.value.trim(),
		consent: consentCheckbox.checked,
	};

	// submitButton.disabled = true;
	// const originalLabel = submitButton.textContent;
	// submitButton.textContent = 'Отправка...';

	try {
		const response = await fetch('/api/contact', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			let body = null;
			try {
				body = await response.json();
			} catch (parseErr) {
				body = null;
			}

			const detail = body && body.detail ? body.detail : null;
			const fieldErrors = (detail && detail.errors) || {};
			const hasFieldErrors = Object.keys(fieldErrors).length > 0;

			Object.entries(fieldErrors).forEach(([field, message]) =>
				setFieldError(field, message)
			);

			showToast({
				type: 'error',
				title: hasFieldErrors ? 'Проверьте форму' : 'Не удалось отправить',
				text:
					(detail && detail.message) || 'Попробуйте ещё раз или позвоните нам напрямую.',
			});
			return;
		}

		form.reset();
		clearFieldErrors();
		showToast({
			type: 'success',
			title: 'Заявка отправлена',
			text: 'Спасибо! Мы свяжемся с вами в ближайшее время.',
		});
	} catch (err) {
		showToast({
			type: 'error',
			title: 'Не удалось отправить',
			text: 'Проверьте подключение к интернету и попробуйте ещё раз.',
		});
	} finally {
		// submitButton.disabled = false;
		// submitButton.textContent = originalLabel;
	}
});

form.querySelectorAll('input[required]:not([type="checkbox"]), textarea[required]').forEach(
	(field) => {
		field.addEventListener('input', () => {
			field.classList.remove('invalid');
			const container = field.closest('.field');
			const errorEl = container && container.querySelector('.field-error-text');
			if (errorEl) errorEl.remove();
		});
	}
);

if (consentCheckbox) {
	consentCheckbox.addEventListener('change', () => {
		if (consentCheckbox.checked) {
			consentLabel.classList.remove('invalid');
			const container = consentCheckbox.closest('.field');
			const errorEl = container && container.querySelector('.field-error-text');
			if (errorEl) errorEl.remove();
		}
	});
}

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

(function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110604711', 'ym');

    ym(110604711, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
