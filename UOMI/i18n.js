/* ═══════════════════════════════════════════════════════════════════════════
   UOMI — Internationalisation (EN · IT · ES)
   Exposes window.UOMI_I18N = { t, getLang, setLang, apply }
   Language persisted in localStorage under 'uomi-lang'.
═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Translation dictionary ─────────────────────────────────────────── */
  var T = {
    en: {
      /* Nav */
      'nav.home':    'Home',
      'nav.shop':    'Shop',
      'nav.about':   'About',
      'nav.contact': 'Contact',

      /* Index */
      'index.kicker':       'UOMI Ceramic Art',
      'index.h1':           'Clay that moves,<br />souls that dance.',
      'index.lead':         'Handcrafted ceramics to wear, display, and live with.<br />Each one unrepeatable and unique.',
      'index.cta':          'View collection',
      'index.welcome-pre':  'Welcome to U',
      'index.welcome-post': 'MI',
      'index.welcome-sub':  'Browse Home, Shop, About and Contact.',

      /* Shop */
      'shop.title':  'Collection',
      'shop.sub':    'Three pieces. Each one unrepeatable.',
      'shop.buy':    'Buy Now',
      'shop.sold':   'Sold',
      'shop.footer': '&copy; {year} UOMI. All rights reserved. &middot; Payments by Stripe.',

      /* About */
      'about.scroll':  'Scroll down',
      'about.title':   'About UOMI',
      'about.intro':   'Created by a small man with big hands.',
      'about.prose1':  'UOMI is a ceramic art studio. Every piece \u2014 wall compositions, wearable objects, collectibles \u2014 is made by hand, in small batches, with full attention to texture and detail.',
      'about.prose2':  'The process blends hand shaping and glaze formulation with something less tangible: the attempt to hold a feeling still, to give movement a shape, to make something that feels as alive as the hands that made it. A slow work in the fastest reality we have ever lived.',

      /* Contact */
      'contact.title': 'Contact & Custom Orders',
      'contact.text':  'Reach out on Instagram',

      /* Footer */
      'footer.rights': '&copy; {year} UOMI. All rights reserved.',

      /* Newsletter popup */
      'nl.title':          'Stay in the loop',
      'nl.sub':            'Be the first to know about new pieces and studio news.',
      'nl.email':          'Email *',
      'nl.name':           'Name *',
      'nl.country':        'Country *',
      'nl.dob':            'Date of Birth *',
      'nl.sex':            'Sex *',
      'nl.sex.male':       'Male',
      'nl.sex.female':     'Female',
      'nl.sex.special':    'Special',
      'nl.sex.rather':     "I'd rather not say",
      'nl.submit':         'Subscribe',
      'nl.submitting':     'Subscribing\u2026',
      'nl.skip':           'No thanks',
      'nl.success':        'Thank you for subscribing!',
      'nl.duplicate':      'This email is already subscribed.',
      'nl.err.email':      'Please enter a valid email address.',
      'nl.err.name':       'Please enter your name.',
      'nl.err.country':    'Please select your country.',
      'nl.err.dob':        'Please enter your date of birth.',
      'nl.err.sex':        'Please select an option for sex.',
      'nl.err.connection': 'Connection error. Please try again.',
      'nl.err.timeout':    'Request timed out. Please try again.',
    },

    it: {
      'nav.home':    'Home',
      'nav.shop':    'Negozio',
      'nav.about':   'Chi siamo',
      'nav.contact': 'Contatto',

      'index.kicker':       'UOMI Arte Ceramica',
      'index.h1':           'Argilla che si muove,<br />anime che danzano.',
      'index.lead':         'Ceramiche artigianali da indossare, esporre e vivere.<br />Ognuna irripetibile e unica.',
      'index.cta':          'Vedi la collezione',
      'index.welcome-pre':  'Benvenuto a U',
      'index.welcome-post': 'MI',
      'index.welcome-sub':  'Esplora Home, Negozio, Chi siamo e Contatto.',

      'shop.title':  'Collezione',
      'shop.sub':    'Tre pezzi. Ognuno irripetibile.',
      'shop.buy':    'Acquista ora',
      'shop.sold':   'Esaurito',
      'shop.footer': '&copy; {year} UOMI. Tutti i diritti riservati. &middot; Pagamenti tramite Stripe.',

      'about.scroll':  'Scorri in basso',
      'about.title':   'Chi siamo',
      'about.intro':   'Creato da un uomo piccolo con grandi mani.',
      'about.prose1':  'UOMI \u00e8 uno studio di arte ceramica. Ogni pezzo \u2014 composizioni murali, oggetti indossabili, da collezione \u2014 \u00e8 fatto a mano, in piccoli lotti, con piena attenzione alla texture e al dettaglio.',
      'about.prose2':  'Il processo unisce la modellazione a mano e la formulazione delle smaltature con qualcosa di meno tangibile: il tentativo di fermare un\u2019emozione, di dare forma al movimento, di creare qualcosa che senta la vita delle mani che l\u2019hanno fatto. Un lavoro lento nella realt\u00e0 pi\u00f9 veloce che abbiamo mai vissuto.',

      'contact.title': 'Contatto & Ordini su Misura',
      'contact.text':  'Scrivici su Instagram',

      'footer.rights': '&copy; {year} UOMI. Tutti i diritti riservati.',

      'nl.title':          'Rimani aggiornato',
      'nl.sub':            'Sii il primo a scoprire i nuovi pezzi e le novit\u00e0 dello studio.',
      'nl.email':          'Email *',
      'nl.name':           'Nome *',
      'nl.country':        'Paese *',
      'nl.dob':            'Data di nascita *',
      'nl.sex':            'Sesso *',
      'nl.sex.male':       'Uomo',
      'nl.sex.female':     'Donna',
      'nl.sex.special':    'Altro',
      'nl.sex.rather':     'Preferisco non dirlo',
      'nl.submit':         'Iscriviti',
      'nl.submitting':     'Iscrizione\u2026',
      'nl.skip':           'No grazie',
      'nl.success':        "Grazie per l'iscrizione!",
      'nl.duplicate':      '\u00c8 gi\u00e0 iscritto con questa email.',
      'nl.err.email':      'Inserisci un indirizzo email valido.',
      'nl.err.name':       'Inserisci il tuo nome.',
      'nl.err.country':    'Seleziona il tuo paese.',
      'nl.err.dob':        'Inserisci la tua data di nascita.',
      'nl.err.sex':        'Seleziona un\u2019opzione per il sesso.',
      'nl.err.connection': 'Errore di connessione. Riprova.',
      'nl.err.timeout':    'Richiesta scaduta. Riprova.',
    },

    es: {
      'nav.home':    'Inicio',
      'nav.shop':    'Tienda',
      'nav.about':   'Nosotros',
      'nav.contact': 'Contacto',

      'index.kicker':       'UOMI Arte Cer\u00e1mica',
      'index.h1':           'Arcilla que se mueve,<br />almas que bailan.',
      'index.lead':         'Cer\u00e1mica artesanal para usar, exhibir y convivir.<br />Cada una irrepetible y \u00fanica',
      'index.cta':          'Ver colecci\u00f3n',
      'index.welcome-pre':  'Bienvenido a U',
      'index.welcome-post': 'MI',
      'index.welcome-sub':  'Explora Inicio, Tienda, Nosotros y Contacto.',

      'shop.title':  'Colecci\u00f3n',
      'shop.sub':    'Tres piezas. Cada una irrepetible.',
      'shop.buy':    'Comprar',
      'shop.sold':   'Vendido',
      'shop.footer': '&copy; {year} UOMI. Todos los derechos reservados. &middot; Pagos por Stripe.',

      'about.scroll':  'Desl\u00edzate hacia abajo',
      'about.title':   'Sobre UOMI',
      'about.intro':   'Creado por un hombre peque\u00f1o con manos grandes.',
      'about.prose1':  'UOMI es un estudio de arte cer\u00e1mica. Cada pieza \u2014 composiciones de pared, objetos para usar, coleccionables \u2014 est\u00e1 hecha a mano, en peque\u00f1os lotes, con total atenci\u00f3n a la textura y el detalle.',
      'about.prose2':  'El proceso combina el modelado a mano y la formulaci\u00f3n de esmaltes con algo menos tangible: el intento de detener un sentimiento, de darle forma al movimiento, de crear algo que se sienta tan vivo como las manos que lo hicieron. Un trabajo lento en la realidad m\u00e1s r\u00e1pida que hemos vivido.',

      'contact.title': 'Contacto & Pedidos Especiales',
      'contact.text':  'Cont\u00e1ctanos en Instagram',

      'footer.rights': '&copy; {year} UOMI. Todos los derechos reservados.',

      'nl.title':          'Mant\u00e9nte informado',
      'nl.sub':            'S\u00e9 el primero en conocer las nuevas piezas y novedades del estudio.',
      'nl.email':          'Email *',
      'nl.name':           'Nombre *',
      'nl.country':        'Pa\u00eds *',
      'nl.dob':            'Fecha de nacimiento *',
      'nl.sex':            'Sexo *',
      'nl.sex.male':       'Masculino',
      'nl.sex.female':     'Femenino',
      'nl.sex.special':    'Especial',
      'nl.sex.rather':     'Prefiero no decir',
      'nl.submit':         'Suscribirme',
      'nl.submitting':     'Suscribiendo\u2026',
      'nl.skip':           'No gracias',
      'nl.success':        '\u00a1Gracias por suscribirte!',
      'nl.duplicate':      'Este email ya est\u00e1 suscrito.',
      'nl.err.email':      'Por favor ingresa un email v\u00e1lido.',
      'nl.err.name':       'Por favor ingresa tu nombre.',
      'nl.err.country':    'Por favor selecciona tu pa\u00eds.',
      'nl.err.dob':        'Por favor ingresa tu fecha de nacimiento.',
      'nl.err.sex':        'Por favor selecciona una opci\u00f3n para sexo.',
      'nl.err.connection': 'Error de conexi\u00f3n. Por favor intenta de nuevo.',
      'nl.err.timeout':    'La solicitud expir\u00f3. Por favor intenta de nuevo.',
    }
  };

  /* ── State ──────────────────────────────────────────────────────────── */
  var LS_KEY      = 'uomi-lang';
  var LANG_LABELS = { en: 'EN', it: 'IT', es: 'ES' };
  var LANG_NAMES  = { en: 'English', it: 'Italiano', es: 'Espa\u00f1ol' };
  var _lang       = localStorage.getItem(LS_KEY) || 'en';
  if (!T[_lang]) _lang = 'en';

  /* ── Core helpers ───────────────────────────────────────────────────── */
  function t(key) {
    return (T[_lang] && T[_lang][key]) || (T.en && T.en[key]) || key;
  }

  function getLang() { return _lang; }

  function setLang(lang) {
    if (!T[lang]) return;
    _lang = lang;
    localStorage.setItem(LS_KEY, lang);
    document.documentElement.lang = lang;
    applyToDOM();
    updateSwitcherUI();
  }

  /* ── DOM application ────────────────────────────────────────────────── */
  function applyToDOM() {
    var year = new Date().getFullYear();

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html')).replace(/\{year\}/g, year);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  /* ── Language switcher ──────────────────────────────────────────────── */
  function updateSwitcherUI() {
    var btn = document.getElementById('lang-switcher-btn');
    if (btn) btn.textContent = LANG_LABELS[_lang];
    document.querySelectorAll('.lang-option').forEach(function (el) {
      el.classList.toggle('lang-active', el.getAttribute('data-lang') === _lang);
    });
  }

  function injectSwitcher() {
    var nav = document.querySelector('header .nav');
    if (!nav || document.getElementById('lang-switcher')) return;

    var wrapper = document.createElement('div');
    wrapper.id        = 'lang-switcher';
    wrapper.className = 'lang-switcher';

    var btn = document.createElement('button');
    btn.id        = 'lang-switcher-btn';
    btn.className = 'lang-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Language');
    btn.textContent = LANG_LABELS[_lang];

    var menu = document.createElement('ul');
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'listbox');

    ['en', 'it', 'es'].forEach(function (lang) {
      var li  = document.createElement('li');
      var opt = document.createElement('button');
      opt.className = 'lang-option' + (lang === _lang ? ' lang-active' : '');
      opt.setAttribute('data-lang', lang);
      opt.setAttribute('role', 'option');
      opt.textContent = LANG_NAMES[lang];
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        setLang(lang);
        closeMenu();
      });
      li.appendChild(opt);
      menu.appendChild(li);
    });

    function openMenu() {
      wrapper.classList.add('lang-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      wrapper.classList.remove('lang-open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      wrapper.classList.contains('lang-open') ? closeMenu() : openMenu();
    });
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    nav.appendChild(wrapper);
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  function boot() {
    injectSwitcher();
    applyToDOM();
    document.documentElement.lang = _lang;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ── Public API ─────────────────────────────────────────────────────── */
  window.UOMI_I18N = { t: t, getLang: getLang, setLang: setLang, apply: applyToDOM };
})();
