<?php
/**
 * AIwareness contact form handler
 * Receives the contact form POST and emails it to hello@aiwareness.space
 * Upload this file to the SAME folder as contact.html.
 */

header('Content-Type: application/json; charset=utf-8');

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Remove line breaks so they can't be used to inject extra email headers
function clean_line($v) {
    return trim(str_replace(["\r", "\n"], ' ', (string) $v));
}

$name      = clean_line($_POST['name'] ?? '');
$email     = clean_line($_POST['email'] ?? '');
$company   = clean_line($_POST['company'] ?? '');
$challenge = trim((string) ($_POST['challenge'] ?? ''));
$message   = trim((string) ($_POST['message'] ?? ''));
$honeypot  = trim((string) ($_POST['_hp'] ?? ''));

// Spam honeypot: real users never fill this hidden field.
// Pretend success so bots don't retry, but send nothing.
if ($honeypot !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

// Validate the essentials
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $challenge === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please add your name, a valid email, and your challenge.']);
    exit;
}

$to      = 'hello@aiwareness.space';
$subject = 'New discovery call request from ' . $name;

$body  = "New contact request from aiwareness.space\n";
$body .= "==========================================\n\n";
$body .= "Name:          " . $name . "\n";
$body .= "Email:         " . $email . "\n";
$body .= "Company / role:" . ($company !== '' ? ' ' . $company : ' —') . "\n\n";
$body .= "Challenge they face:\n";
$body .= $challenge . "\n\n";
$body .= "Anything else:\n";
$body .= ($message !== '' ? $message : '—') . "\n";

// From must be an address on your own domain or Strato may reject it.
$from = 'hello@aiwareness.space';

$headers  = "From: AIwareness Website <" . $from . ">\r\n";
$headers .= "Reply-To: " . $name . " <" . $email . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'The mail server could not send the message.']);
}
