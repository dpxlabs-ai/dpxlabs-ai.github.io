/* Contact form — validation, the FormSubmit AJAX send, and the sent state.
 * Without this script the form still works: a plain POST, the browser's own
 * validation, and FormSubmit's redirect back to contact.html#sent. */
(function () {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form || !window.fetch || !window.FormData) return;

  const wrap = form.closest('.form-wrap');
  const sent = document.getElementById('sent');
  const status = document.getElementById('form-status');
  const send = form.querySelector('.send');
  const sendLabel = send.querySelector('span');
  const restLabel = sendLabel.textContent;
  const group = document.getElementById('f-reason');
  const TIMEOUT = 15000;

  // The plain-POST fallback returns to this page, wherever it is served from.
  const next = form.querySelector('input[name="_next"]');
  if (next && /^https?:$/.test(location.protocol)) next.value = location.origin + location.pathname + '#sent';

  // Arriving from that redirect: hand focus to the confirmation.
  if (location.hash === '#sent') sent.focus({ preventScroll: true });

  form.noValidate = true;

  const fields = [
    {
      el: group,
      focus: () => form.querySelector('input[name="_subject"]'),
      error: () => (form.querySelector('input[name="_subject"]:checked') ? '' : 'Choose a reason for writing.'),
    },
    { el: form.elements.name, error: (el) => (el.value.trim() ? '' : 'Enter your name.') },
    {
      el: form.elements.email,
      error: (el) =>
        !el.value.trim() ? 'Enter an email address so we can reply.'
          : el.validity.typeMismatch ? 'Check the email address. It looks incomplete.' : '',
    },
    { el: form.elements.message, error: (el) => (el.value.trim() ? '' : 'Write a message.') },
  ];
  fields.forEach((f) => {
    f.out = document.getElementById('err-' + f.el.id.slice(2));
    const clear = () => { if (f.out.textContent) show(f, ''); };
    f.el.addEventListener('input', clear);
    f.el.addEventListener('change', clear);
  });

  function show(f, message) {
    f.out.textContent = message;
    if (message) f.el.setAttribute('aria-invalid', 'true');
    else f.el.removeAttribute('aria-invalid');
  }

  function validate() {
    let first = null;
    fields.forEach((f) => {
      const message = f.error(f.el);
      show(f, message);
      if (message && !first) first = f;
    });
    if (first) (first.focus ? first.focus() : first.el).focus();
    return !first;
  }

  function busy(on) {
    sendLabel.textContent = on ? 'Sending' : restLabel;
    // aria-disabled, not disabled: a disabled button drops keyboard focus.
    if (on) send.setAttribute('aria-disabled', 'true');
    else send.removeAttribute('aria-disabled');
  }

  function showSent() {
    wrap.classList.add('is-sent');
    sent.scrollIntoView({ block: 'center' });
    sent.focus({ preventScroll: true });
  }

  function showFailure() {
    status.innerHTML = 'The message was not sent. Your text is still in the form. Try again, or write to '
      + '<a href="mailto:dpxlabs@diphyx.com">dpxlabs@diphyx.com</a>.';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (send.getAttribute('aria-disabled') === 'true') return;
    status.textContent = '';
    if (!validate()) return;

    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = typeof value === 'string' ? value.trim() : value; });
    // A filled honeypot is a bot. FormSubmit would drop it; skip the request and say nothing.
    if (data._honey) { showSent(); return; }
    delete data._next;
    data._replyto = data.email;

    const abort = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => abort && abort.abort(), TIMEOUT);
    busy(true);
    fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: abort ? abort.signal : undefined,
    })
      .then((res) => res.json().catch(() => ({})).then((body) => {
        // FormSubmit answers { success: "true" | "false", message }.
        if (!res.ok || body.success === false || body.success === 'false') throw new Error(body.message || res.status);
        showSent();
      }))
      .catch(showFailure)
      .then(() => { clearTimeout(timer); busy(false); });
  });
})();
