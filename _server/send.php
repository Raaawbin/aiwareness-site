<?php
/**
 * AIwareness contact form handler.
 *
 * Runs on the STRATO webspace at https://forms.aiwareness.space/send.php.
 * The website itself is static (GitHub Pages); its contact form posts here,
 * and this script emails the message to hello@aiwareness.space.
 * Setup steps: see README.md in this folder.
 */

declare(strict_types=1);

const MAIL_TO   = 'hello@aiwareness.space';
const MAIL_FROM = 'hello@aiwareness.space';   // must be an address on our own domain, or STRATO rejects it
const SITE      = 'https://aiwareness.space';
const ALLOWED_ORIGINS = ['https://aiwareness.space', 'https://www.aiwareness.space'];
const TOPICS = ['Talks and education', 'Organisational development', 'Coaching for individuals', 'Something else'];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type');
}
header('Vary: Origin');
header('X-Content-Type-Options: nosniff');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

/** Answer the browser: JSON for the site's script, a small page if JavaScript was off. */
function finish(int $status, bool $ok, string $error = ''): void
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $title = $ok ? 'Thank you · Danke' : 'Something went wrong · Das hat nicht geklappt';
    $text  = $ok
        ? 'Your message is on its way to us. Deine Nachricht ist bei uns angekommen.'
        : 'Please write to us directly. Bitte schreib uns direkt: <a href="mailto:' . MAIL_TO . '">' . MAIL_TO . '</a>';
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>' . $title . '</title>'
       . '<body style="font:17px/1.6 system-ui,sans-serif;background:#0A0A0B;color:#F5F5F7;max-width:560px;margin:15vh auto;padding:0 20px">'
       . '<h1 style="font-size:26px">' . $title . '</h1><p>' . $text . '</p>'
       . '<p><a style="color:#C9A6FF" href="' . SITE . '/contact">Back to aiwareness.space</a></p></body>';
    exit;
}

function cut(string $value, int $max): string
{
    return function_exists('mb_substr') ? mb_substr($value, 0, $max, 'UTF-8') : substr($value, 0, $max);
}

/** One line of text: no line breaks, so nothing can be smuggled into mail headers. */
function line(string $value, int $max): string
{
    return cut(trim(preg_replace('/[\r\n\t]+/', ' ', $value) ?? ''), $max);
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method !== 'POST') {
    finish(405, false, 'method');
}
if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) {
    finish(403, false, 'origin');
}

// Spam traps: a hidden field people never fill in, and forms sent faster than a person can type.
// Bots get a friendly "ok" so they do not retry; nothing is sent.
$trap    = trim((string) ($_POST['website'] ?? ''));
$elapsed = (int) ($_POST['elapsed'] ?? 0);
if ($trap !== '' || ($elapsed > 0 && $elapsed < 3000)) {
    finish(200, true);
}

$name      = line((string) ($_POST['name'] ?? ''), 120);
$email     = line((string) ($_POST['email'] ?? ''), 160);
$company   = line((string) ($_POST['company'] ?? ''), 160);
$topic     = line((string) ($_POST['topic'] ?? ''), 60);
$challenge = cut(trim(str_replace("\r\n", "\n", (string) ($_POST['challenge'] ?? ''))), 6000);
$lang      = ($_POST['lang'] ?? '') === 'de' ? 'de' : 'en';

if (!in_array($topic, TOPICS, true)) {
    $topic = 'Something else';
}
if ($name === '' || $challenge === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    finish(422, false, 'invalid');
}

$subject = 'Website contact: ' . $topic . ' · ' . $name;
$body = "New message from the contact form on aiwareness.space\n"
      . "=====================================================\n\n"
      . "Name:           " . $name . "\n"
      . "Email:          " . $email . "\n"
      . "Company & role: " . ($company !== '' ? $company : '(not given)') . "\n"
      . "Topic:          " . $topic . "\n"
      . "Site language:  " . strtoupper($lang) . "\n\n"
      . "Message:\n" . $challenge . "\n\n"
      . "Reply to this email to answer " . $name . " directly.\n";

$encode = function (string $text): string {
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
};
$replyName = str_replace(['"', '<', '>', '\\'], '', $name);

$headers = implode("\r\n", [
    'From: ' . $encode('AIwareness Website') . ' <' . MAIL_FROM . '>',
    'Reply-To: ' . $encode($replyName) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$sent = @mail(MAIL_TO, $encode($subject), $body, $headers, '-f' . MAIL_FROM);

finish($sent ? 200 : 500, $sent, $sent ? '' : 'mail');
