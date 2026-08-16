/* ============================================================================
   EMAIL SIGNUP — posts straight to a Google Form, without leaving the site.

   ONE THING TO DO BEFORE THIS WORKS INLINE
   ----------------------------------------
   Replace ENTRY_ID below with the field ID of the email question on the form.
   To find it, which takes about a minute:

     1. Open the form in edit mode at forms.google.com
     2. Click the three dots at the top right, choose "Get pre-filled link"
     3. Type anything into the email box, click "Get link", then "Copy link"
     4. The copied URL contains something like  entry.1234567890=test
     5. Paste that whole "entry.1234567890" string below, in place of the zeros

   Until that is done nothing breaks. The form simply opens the Google Form in
   a new tab instead of submitting in place, so the signup still works from the
   moment you upload it.
   ============================================================================ */

var SUBSCRIBE_CONFIG = {
  ENTRY_ID: "entry.0000000000",
  ACTION: "https://docs.google.com/forms/d/e/1FAIpQLSe_JK7mMhB26eB4ZyvHbMGyQZ_dnlMOALBl6vLxD6i7dlpJQQ/formResponse",
  FORM_URL: "https://forms.gle/DyNfm29uA9AKYYPd6"
};

(function () {
  var cfg = SUBSCRIBE_CONFIG;
  var configured = /^entry\.\d+$/.test(cfg.ENTRY_ID) && cfg.ENTRY_ID !== "entry.0000000000";

  function looksLikeEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  }

  function track(label) {
    if (typeof gtag === "function") {
      gtag("event", "subscribe", { event_category: "engagement", event_label: label });
    }
  }

  function init() {
    var forms = document.querySelectorAll(".subscribe-form");
    Array.prototype.forEach.call(forms, function (form) {
      var input = form.querySelector(".subscribe-input");
      var button = form.querySelector(".subscribe-btn");
      var msg = form.querySelector(".subscribe-msg");

      function say(text, isError) {
        if (!msg) return;
        msg.textContent = text;
        msg.classList.toggle("is-error", !!isError);
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var value = input ? input.value.trim() : "";

        if (!looksLikeEmail(value)) {
          say("That does not look like an email address. Please check it and try again.", true);
          if (input) input.focus();
          return;
        }

        if (!configured) {
          // Field ID not set yet — hand off to the Google Form rather than fail silently.
          track("redirect_to_form");
          window.open(cfg.FORM_URL, "_blank", "noopener");
          say("Opening the signup form in a new tab.");
          return;
        }

        if (button) { button.disabled = true; button.textContent = "Sending…"; }
        say("");

        var body = new FormData();
        body.append(cfg.ENTRY_ID, value);

        fetch(cfg.ACTION, { method: "POST", mode: "no-cors", body: body })
          .then(function () {
            // no-cors gives an opaque response, so success cannot be read back.
            form.innerHTML =
              '<p class="subscribe-msg">Thank you — you are on the list. ' +
              'You will hear from this address only when something new is published.</p>';
            track("submitted");
          })
          .catch(function () {
            if (button) { button.disabled = false; button.textContent = "Notify me"; }
            say("That did not go through. You can sign up directly at " + cfg.FORM_URL, true);
            track("failed");
          });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
