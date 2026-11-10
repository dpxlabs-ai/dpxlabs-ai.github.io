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
  const live = document.getElementById('send-live');
  const again = document.getElementById('write-again');
  const send = form.querySelector('.send');
  const sendLabel = send.querySelector('span');
  const restLabel = sendLabel.textContent;
  const group = document.getElementById('f-reason');
  const radios = Array.from(form.querySelectorAll('input[name="_subject"]'));
  const message = form.elements.message;
  const TIMEOUT = 15000;

  // The plain-POST fallback returns to this page, wherever it is served from.
  const next = form.querySelector('input[name="_next"]');
  if (next && /^https?:$/.test(location.protocol)) next.value = location.origin + location.pathname + '#sent';

  // Arriving from that redirect: hand focus to the confirmation.
  if (location.hash === '#sent') sent.focus({ preventScroll: true });

  // Validation is ours from here. `required` on a radio also reports the whole
  // untouched group as invalid, so the group's aria-required carries it instead.
  form.noValidate = true;
  radios.forEach((r) => r.removeAttribute('required'));

  // The message field grows with its text. Browsers with `field-sizing` do this in CSS.
  if (!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'))) {
    const grow = () => { message.style.height = 'auto'; message.style.height = message.scrollHeight + 1 + 'px'; };
    message.addEventListener('input', grow);
    window.addEventListener('resize', grow);
    grow();
  }

  const fields = [
    {
      el: group,
      focus: () => radios[0],
      error: () => (radios.some((r) => r.checked) ? '' : 'Choose a reason for writing.'),
    },
    { el: form.elements.name, error: (el) => (el.value.trim() ? '' : 'Enter your name.') },
    {
      el: form.elements.email,
      error: (el) =>
        !el.value.trim() ? 'Enter an email address so we can reply.'
          : el.validity.typeMismatch ? 'Check the email address. It looks incomplete.' : '',
    },
    { el: message, error: (el) => (el.value.trim() ? '' : 'Add a message before sending.') },
  ];
  fields.forEach((f) => {
    f.out = document.getElementById('err-' + f.el.id.slice(2));
    const clear = () => { if (f.out.textContent) show(f, ''); };
    f.el.addEventListener('input', clear);
    f.el.addEventListener('change', clear);
  });

  function show(f, text) {
    f.out.textContent = text;
    if (text) f.el.setAttribute('aria-invalid', 'true');
    else f.el.removeAttribute('aria-invalid');
  }

  function validate() {
    let first = null;
    fields.forEach((f) => {
      const text = f.error(f.el);
      show(f, text);
      if (text && !first) first = f;
    });
    if (first) {
      // Focus the control, then bring its error into view: the message must be on screen.
      (first.focus ? first.focus() : first.el).focus({ preventScroll: true });
      first.out.scrollIntoView({ block: 'center' });
    }
    return !first;
  }

  function busy(on) {
    // Hold the width so the label swap does not move the rule.
    send.style.minWidth = on ? send.getBoundingClientRect().width + 'px' : '';
    sendLabel.textContent = on ? 'Sending…' : restLabel;
    live.textContent = on ? 'Sending your message.' : '';
    // aria-disabled, not disabled: a disabled button drops keyboard focus.
    if (on) { send.setAttribute('aria-disabled', 'true'); form.setAttribute('aria-busy', 'true'); }
    else { send.removeAttribute('aria-disabled'); form.removeAttribute('aria-busy'); }
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

  // "Write another message": back to an empty form.
  again.addEventListener('click', (e) => {
    e.preventDefault();
    form.reset();
    fields.forEach((f) => show(f, ''));
    status.textContent = '';
    message.style.height = '';
    wrap.classList.remove('is-sent');
    if (location.hash === '#sent') history.replaceState(null, '', location.pathname + location.search);
    radios[0].focus({ preventScroll: true });
    wrap.scrollIntoView({ block: 'start' });
  });

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
