#!/bin/bash
# Dev helper script to reset wizard config state for testing first-run flow.
# Submitting setup or finishing a restore sets WIZARD_CONFIGURED. Delete that
# flag and restart to see first-run defaults again. WIZARD_NON_BLOCKING can
# leave the placeholder wallet app in place; first run follows this flag.

DB_FILE="${DATABASE_FILE:-db.sqlite}"
if [ ! -f "$DB_FILE" ]; then
    echo "Database file not found at $DB_FILE"
    echo "Set DATABASE_FILE env var if your DB is elsewhere"
    exit 1
fi

echo "Resetting wizard config settings in database..."
sqlite3 "$DB_FILE" <<EOF
DELETE FROM admin_settings WHERE env_name IN (
    'DEFAULT_APP_NAME',
    'NOSTR_RELAYS', 
    'DISABLE_LIQUIDITY_PROVIDER',
    'BACKUP_CLOUD_ENABLED',
    'BACKUP_SFTP_ENABLED',
    'BACKUP_SFTP_HOST',
    'BACKUP_SFTP_PORT',
    'BACKUP_SFTP_USER',
    'BACKUP_SFTP_PASS',
    'BACKUP_SFTP_HOST_FINGERPRINT',
    'WIZARD_CONFIGURED'
);
EOF

if [ $? -eq 0 ]; then
    echo "Wizard config settings cleared from database."
    echo "Restart the service to see the first-run wizard flow again."
else
    echo "Failed to reset wizard settings. Make sure sqlite3 is installed."
    exit 1
fi

