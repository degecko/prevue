<?php

$base = __DIR__;
$changeLog = file_get_contents("$base/src/chrome/options.html");

preg_match('#<ul id="changelog">.*?<aside>([\d.]+)</aside>#s', $changeLog, $res);

isset($res[1]) or die('Cannot fetch previous version!');

$newVersion = $res[1];
$oldVersion = json_decode(file_get_contents("$base/src/chrome/manifest.json"))->version;

// Make sure the new version is larger than the previous.
if (version_compare($newVersion, $oldVersion) < 0) {
    die('The new version needs to be larger than the previous.');
}

file_exists("$base/builds") or mkdir("$base/builds");

foreach (['chrome', 'firefox'] as $browser) {
    echo "Handling $browser...\n";

    $contents = file_get_contents($path = "$base/src/$browser/manifest.json");
    $contents = preg_replace('/"version": "[^"]+",/', '"version": "' . $newVersion . '",', $contents);

    // Update the new version in the manifest files.
    file_put_contents($path, $contents);

    echo "\tnew version OK\n";

    // Create the zip file for the current browser.
    exec("cd $base/src/$browser && zip -r ../../builds/$browser-$newVersion.zip ./");

    echo "\tZIP file OK\n\n";
}
