# Backups and Restore

Lightning.Pub can automatically save an encrypted backup of your accounts, balances, and Lightning recovery information. You can use the managed backup service, your own SFTP server, or a local folder.

**Keep your node's 24-word recovery phrase somewhere safe and offline. Without it, you cannot decrypt these backups.** Anyone with the phrase can decrypt your backup and, when using the default login, access your managed backup account.

## What Is Backed Up?

- User accounts and their saved balances.
- Applications and their connection keys, settings, offers, products, and access permissions.
- Your Lightning wallet's address count and channel recovery backup.

This is not a full copy of your node. Payment history is not included, and recovering channel funds does not mean reopening the channels as they were. See [Limits and Precautions](#limits-and-precautions) before relying on a restore.

## Enable Backups

In the setup wizard, choose a backup option and finish setup:

| Option | What You Need |
|---|---|
| Managed backup | Your node's recovery phrase. Pub handles the server account automatically. |
| Your own SFTP server | A server address, SSH port, and writable SFTP account. Keep its login details if you supply your own username or password. |
| Manual backups | You are responsible for keeping a usable backup yourself. Choosing this option does not create an automatic remote backup. |

Pub must have the node's recovery phrase to create backups. This is normally the case when Pub created or restored the wallet. Connecting Pub to an existing LND wallet does not give it that wallet's phrase.

When you restore a node, the wizard keeps its saved backup choice. Finishing setup does not automatically switch a restored node from manual to managed backups.

### Managed Backup

The managed service is `backup.lightning.pub`. Pub derives the encryption key and an SFTP login key from your recovery phrase, so there is no separate backup password to remember. The backup contents are encrypted before they leave your node.

Pub checks the server's identity automatically. If you see a server identity or host-key error, do not bypass it; resolve the error before continuing.

The service has a **10 MiB storage allowance per node**. Leave room for updates: new backup files must fit before the old ones can be removed. Running out of space leaves the previous backup in place, but your latest changes will not have been saved.

### Your Own SFTP Server

Use a dedicated account on an OpenSSH SFTP server. The account must be able to upload, list, rename, and delete files in its starting folder. Pub requires the server to support safely replacing a file; if it reports that the server is incompatible, use a compatible OpenSSH server.

Record the server address, port, username, and password somewhere you can access during recovery. Also record its **host-key fingerprint**, which identifies the SSH server. On the SFTP server, an administrator can obtain it with:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

The key filename may differ on your server. Verify the fingerprint with the server's administrator, then enter it in Pub. Custom-server restore requires a fingerprint; merely knowing the password is not enough to verify the server's identity.

If you leave the username or password unset, Pub uses a value derived from the node's recovery phrase for that field. Your server account must accept those credentials. Supplying your own login does not change backup encryption: you still need the recovery phrase to restore.

### Local Copy

To also write backups to a local folder, set this in Pub's environment:

```dotenv
BACKUP_LOCAL_PATH=/path/to/backups
```

The folder must be writable by Pub. For a container or appliance, use a persistent mounted location, not a temporary container directory.

**A backup on the same disk is not protection against disk failure.** Keep a remote copy or copy the complete backup folder to separate storage while Pub is stopped.

### Environment Settings

If you configure Pub without the wizard, these are the available settings:

| Setting | Purpose |
|---|---|
| `BACKUP_CLOUD_ENABLED=true` | Enable managed backups. |
| `BACKUP_SFTP_ENABLED=true` | Enable backups to your own SFTP server. |
| `BACKUP_SFTP_HOST` | Your SFTP server address. |
| `BACKUP_SFTP_PORT` | SSH port; defaults to `22`. |
| `BACKUP_SFTP_USER` / `BACKUP_SFTP_PASS` | Your login, if not using the phrase-derived values. |
| `BACKUP_SFTP_HOST_FINGERPRINT` | Your server's verified `SHA256:...` fingerprint. |
| `BACKUP_LOCAL_PATH` | Folder for a local backup copy. |

Environment settings take precedence over the wizard and dashboard. Setting any remote-backup option in the environment locks changes to the remote destination in the UI. Local copies are configured through the environment only.

## When Backups Run

- Pub attempts a complete backup on startup and when remote backups are enabled.
- During normal use, changes are grouped together and saved about 30 seconds after the latest change. Continuous activity can delay the start of an update for up to five minutes; uploading takes additional time.
- Pub also attempts a final backup during a normal shutdown.
- Temporary failures are retried. A power loss or forced shutdown can still lose changes that have not reached the backup destination.

**Enabling backups is not proof that an upload succeeded.** Check Pub's logs for upload errors, connection failures, or a full destination. If you use several destinations, success on one does not mean the others are up to date.

## Restore a Node

On Start9 or Umbrel, use the app's setup wizard. For a direct installation, enable the wizard with `WIZARD=true` before starting Pub, or use the command-line restore below instead of starting normal service.

1. **Stop the original Pub instance**, if it still exists. Do not restore from a backup folder or account that another node is still updating. Do not run the original and recovered Lightning wallets at the same time.
2. Start Pub with a fresh database and an LND instance that has no wallet. Do not create a new wallet before restoring. If you are retrying an interrupted restore, keep its existing database and LND wallet instead.
3. Open the setup wizard and choose **Restore Backup**, or **Retry Restore** if a previous attempt was interrupted.
4. Enter the original node's 24-word recovery phrase and choose where the backup is stored.
5. For your own SFTP server, enter its address, port, verified host-key fingerprint, and any custom login. For a local backup, enter the folder path **on the Pub machine**, not on the computer running your browser.
6. Start the restore and wait for it to finish. Pub restores the accounts, initializes the Lightning wallet, submits channel recovery information, and checks the restored settings before allowing normal service to start.
7. After success, review the restored settings and backup destination before completing setup. Channel recovery and access to recovered funds may take longer than the wizard's restore operation.

A local backup is a **folder containing `manifest.json` and the encrypted `.enc` files it names**, not a `db.sqlite` file. Keep those files together. Do not rename them, mix files from different backups, or copy individual files while Pub is writing backups.

### If Restore Fails

| Message or Problem | What to Check |
|---|---|
| No backup found | Check the recovery phrase, selected account or folder, and that the complete backup is present. |
| Login rejected | For managed backups, confirm you used the original phrase. For your own server, check the login you used for uploads. |
| Host-key mismatch | Verify the server's identity with its administrator. Do not disable the check just to proceed. |
| Connection error or timeout | Check the server address, port, network access, and server availability, then retry. |
| Corrupt or unreadable backup | Make sure the files belong together and the phrase is correct. Do not replace individual files with files from another backup. |
| Settings validation error | Correct the configuration identified in the error, including conflicting environment settings, then retry. Restart Pub if you change its environment. Pub remains in recovery mode until the settings are valid. |

An interrupted restore normally offers **Retry Restore**. Use the same phrase, keep the same LND wallet connected, and leave the backup source available. Retries still read the backup source even after accounts have already been imported.

Do not delete recovery files or reset the wallet just to clear an error. If Pub says the recovery cannot be resumed, follow its reset instructions only when you intend to abandon that attempt and start over. Stop the running recovery process before using the command-line restore tool.

## Limits and Precautions

- **Keep the recovery phrase.** Custom SFTP passwords cannot replace it, and the managed service cannot decrypt your backup for you.
- **Backups are not a payment history archive.** Payments that were in progress when the backup was taken are not automatically refunded during restore, because their final status may not be known.
- **Review automatic debit permissions after recovery.** Permissions survive, but records of recent spending and previously used debit requests do not. A third party may therefore receive a fresh spending allowance within a period it had already used, and previously used requests may be accepted again. Revoke permissions you do not want active before allowing third-party debits again.
- **Large custom-server backups have an additional limit.** Remote restore currently refuses any single file over 64 MiB, even if your SFTP server accepted the upload. The managed service's smaller storage allowance does not apply to custom servers. Local restore does not use this download limit.
- **Keep the wizard private.** It has no separate login and is intended for the protected appliance network provided by Start9 or Umbrel. Do not expose its port directly to the public internet.

The account data is encrypted, but `manifest.json`, the file listing used to locate it, is not. A backup destination can see filenames and sizes, not the encrypted account contents. Protect custom-server login details separately from your recovery phrase.

## Command-Line Restore

For operators running Pub directly, the command-line tool is an alternative to the wizard. Stop the existing Pub process first. The destination must still meet the fresh-database and empty-wallet requirements above, unless this is a retry of an interrupted restore.

Managed backup:

```bash
node build/src/index.js restore --phrase "<24-word recovery phrase>" --source cloud
```

Your own SFTP server:

```bash
node build/src/index.js restore --phrase "<24-word recovery phrase>" --source ftp \
  --ftp-host sftp.example.com --ftp-port 22 \
  --ftp-host-fingerprint "SHA256:<verified fingerprint>" \
  --ftp-user "<username>" --ftp-pass "<password>"
```

Omit both login options if the server uses Pub's phrase-derived login.

Local folder:

```bash
node build/src/index.js restore --phrase "<24-word recovery phrase>" --source local \
  --local-path /path/to/backups
```

**Command-line caution:** your recovery phrase is passed as a process argument and may also be saved in shell history. Use the wizard if you are not comfortable managing that exposure.
