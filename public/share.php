<?php
declare(strict_types=1);

// Social crawlers read this HTML without running the game's JavaScript.
$employees = [
    'sebastian' => 'Sebastian', 'yaroslav' => 'Yaroslav',
    'juan-ignacio' => 'Juan Ignacio', 'erez' => 'Erez',
    'luis' => 'Luis', 'nenad' => 'Nenad', 'elad' => 'Elad',
    'rotem' => 'Rotem', 'tal' => 'Tal', 'jason' => 'Jason', 'aldo' => 'Aldo',
];
$locations = [
    'office' => 'SMALL OFFICE', 'call_center' => 'CALL-CENTER IT',
    'sysadmin' => 'SYSADMIN', 'tech_lead' => 'TECH LEAD',
    'datacenter' => 'AWS DATACENTER', 'manager' => 'MANAGER',
];

$raw = $_GET['report'] ?? null;
$report = is_string($raw) && strlen($raw) <= 1000 ? json_decode($raw, true) : null;
$valid = is_array($report)
    && isset($report['employee'], $report['location'], $report['won'])
    && is_string($report['employee']) && array_key_exists($report['employee'], $employees)
    && is_string($report['location']) && array_key_exists($report['location'], $locations)
    && is_bool($report['won']);
foreach (['rating', 'score', 'kills', 'seconds', 'incidents', 'integrity'] as $key) {
    $valid = $valid && isset($report[$key]) && is_int($report[$key]) && $report[$key] >= 0;
}
$valid = $valid && (!isset($report['productivity']) ||
    (is_int($report['productivity']) && $report['productivity'] >= 0));
if (!$valid) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Invalid performance report.';
    exit;
}
foreach (['rating' => 3, 'score' => 99999999, 'kills' => 99999999,
          'seconds' => 99999999, 'incidents' => 3, 'integrity' => 100] as $key => $max) {
    $report[$key] = min($report[$key], $max);
}
if (!$report['won']) $report['rating'] = 0;
$report['productivity'] = min($report['productivity'] ?? 100, 100);

$employee = $employees[$report['employee']];
$location = $locations[$report['location']];
$outcome = $report['won'] ? 'Shift complete' : 'Shift interrupted';
$title = "$employee's Hitechist performance report · $location";
$description = "$outcome · Score {$report['score']} · {$report['incidents']}/3 incidents resolved · {$report['integrity']}% systems integrity · {$report['productivity']}% productivity.";
$duration = sprintf('%02d:%02d', intdiv($report['seconds'], 60), $report['seconds'] % 60);
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
if (!preg_match('/^[a-zA-Z0-9.-]+(?::[0-9]+)?$/', $host)) $host = 'localhost';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$script = $_SERVER['SCRIPT_NAME'] ?? '/share.php';
$base = rtrim(str_replace('\\', '/', dirname($script)), '/') . '/';
$canonical = "$scheme://$host$base" . 'share.php?' . http_build_query(['report' => json_encode($report)]);
$image = "$scheme://$host$base" . 'assets/' . ($report['won'] ? 'victory' : 'facepalm') . '.png';
$escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101b1c">
  <title><?= $escape($title) ?></title>
  <meta name="description" content="<?= $escape($description) ?>">
  <meta property="og:type" content="website">
  <meta property="og:url" content="<?= $escape($canonical) ?>">
  <meta property="og:title" content="<?= $escape($title) ?>">
  <meta property="og:description" content="<?= $escape($description) ?>">
  <meta property="og:image" content="<?= $escape($image) ?>">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= $escape($title) ?>">
  <meta name="twitter:description" content="<?= $escape($description) ?>">
  <meta name="twitter:image" content="<?= $escape($image) ?>">
  <style>
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; padding: 24px; display: grid; place-items: center; background: #101b1c; color: #e7ebdb; font: 15px system-ui, sans-serif; }
    main { width: min(100%, 580px); }
    small, dt { color: #a4bd91; font: 11px ui-monospace, monospace; letter-spacing: .05em; }
    h1 { margin: 14px 0 6px; font-size: clamp(32px, 7vw, 54px); line-height: 1; }
    p { color: #b6c5a9; }
    article { margin: 24px 0; padding: 22px; border: 1px solid #71915d; background: #152a25; }
    article strong { color: #b7f58e; }
    .result { margin: 12px 0 0; padding-bottom: 16px; border-bottom: 1px solid #476448; color: #b7f58e; font: 14px ui-monospace, monospace; }
    dl { margin: 16px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    dd { margin: 6px 0 0; color: #e7ebdb; font: 20px ui-monospace, monospace; }
    a { display: inline-block; padding: 13px 18px; border: 1px solid #b7f58e; color: #b7f58e; text-decoration: none; font: 12px ui-monospace, monospace; }
  </style>
</head>
<body>
  <main>
    <small>ROOT ACCESS / HITECHIST</small>
    <h1>Employee performance report.</h1>
    <p><?= $escape($employee) ?> · <?= $escape($location) ?></p>
    <article>
      <small>SHIFT EVALUATION</small>
      <div class="result"><?= $escape(strtoupper($outcome)) ?><?= $report['won'] ? ' · ' . str_repeat('★', $report['rating']) . str_repeat('☆', 3 - $report['rating']) : ' · REVIEW REQUIRED' ?></div>
      <dl>
        <div><dt>SCORE</dt><dd><?= $report['score'] ?></dd></div>
        <div><dt>INCIDENTS RESOLVED</dt><dd><?= $report['incidents'] ?> / 3</dd></div>
        <div><dt>PROCESSES KILLED</dt><dd><?= $report['kills'] ?></dd></div>
        <div><dt>SYSTEMS INTEGRITY</dt><dd><?= $report['integrity'] ?>%</dd></div>
        <div><dt>PRODUCTIVITY</dt><dd><?= $report['productivity'] ?>%</dd></div>
        <div><dt>TIME ON CALL</dt><dd><?= $duration ?></dd></div>
      </dl>
    </article>
    <a href="./">PLAY ROOT ACCESS ↗</a>
  </main>
</body>
</html>
