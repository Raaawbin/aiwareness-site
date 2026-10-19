# Contact form: STRATO setup

The website runs on GitHub Pages, which cannot run server code. The contact form therefore posts to `send.php` on our STRATO webspace, and that script emails the message to hello@aiwareness.space. GitHub Pages does not publish folders starting with `_`, so this folder stays private.

Address the site expects: **https://forms.aiwareness.space/send.php** (set in `_src/pages/contact.html`, form `action`).

## One-time setup in STRATO

1. **Log in** to the STRATO customer area and open the package that holds aiwareness.space (it also holds the email inbox and the webspace the old site ran on).
2. **Create the subdomain.** Under Domains (Domainverwaltung), choose aiwareness.space and create the subdomain (Subdomain anlegen) `forms`. Point it to a folder on the webspace, for example `/forms`. Do not change the settings of aiwareness.space or www.aiwareness.space: they point to GitHub Pages.
3. **Turn on SSL for the subdomain.** Under security (SSL-Verwaltung), assign the included certificate to forms.aiwareness.space. The website is https, so the form can only send to an https address.
4. **Upload `send.php`** into that folder (`/forms`), either with an SFTP app such as Cyberduck or FileZilla (access data under SFTP/Zugänge in the customer area) or with STRATO's web file manager.
5. **Check that it runs:** open https://forms.aiwareness.space/send.php in a browser. A dark page saying "Something went wrong · Das hat nicht geklappt" is correct here: it means PHP and SSL work and the script refuses a plain page visit.
6. **Send a real test** from https://aiwareness.space/contact once the site is pushed, then look for it in the hello@aiwareness.space inbox (and the spam folder, the first time).
7. **Data processing agreement:** make sure the agreement with STRATO (Auftragsverarbeitungsvertrag, AVV) is concluded in the customer area. The privacy policy (section 3) says it is.

Until steps 2 to 4 are done, the form tells visitors that sending did not work and offers to open their own email app with the message filled in, so nothing is lost.

## How the script protects the inbox

- Only accepts posts from aiwareness.space (and www).
- A hidden field that people never see; bots that fill it in get a friendly reply and nothing is sent.
- Forms sent faster than 3 seconds after the page opened are treated the same way.
- Checks name, email and message, keeps line breaks out of email headers, and limits field lengths.
- The visitor's address is set as Reply-To, so answering the email answers them.

## Changing something

- Recipient or sender: `MAIL_TO` and `MAIL_FROM` at the top of `send.php` (the sender must be an address on our own domain).
- Topics in the dropdown: keep `TOPICS` in `send.php` in line with the `<option value>` list in `_src/pages/contact.html`.
- After editing `send.php`, upload it to STRATO again. The copy in this folder is the source.
