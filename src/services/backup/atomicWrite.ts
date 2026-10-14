// BACKUP: Durable local writes.
// Shard files are created once under their final name and fsynced.
// The manifest is a sibling .part, fsync, then rename, so an interrupted write
// leaves the previous manifest in place (or a .part the restore ignores).
// Directory fsync makes those names durable before a later manifest can point at them.

import fs from 'fs'
import path from 'path'

/** fsync a directory so newly created or renamed entries survive a power loss. */
export function fsyncDirectory(dir: string): void {
    let fd: number | undefined
    try {
        fd = fs.openSync(dir, 'r')
        fs.fsyncSync(fd)
    } catch (err: any) {
        // Some platforms cannot fsync a directory. A data error still fails the publish.
        const code = err?.code
        if (code !== 'EINVAL' && code !== 'EPERM' && code !== 'EBADF' && code !== 'ENOTSUP' && code !== 'ENOSYS') {
            throw err
        }
    } finally {
        if (fd !== undefined) fs.closeSync(fd)
    }
}

/** Create a new file, fsync its bytes, and fail if the name already exists. */
export function writeNewDurableFile(dest: string, data: Buffer): void {
    const dir = path.dirname(dest)
    fs.mkdirSync(dir, { recursive: true })
    const fd = fs.openSync(dest, 'wx')
    try {
        fs.writeFileSync(fd, data)
        fs.fsyncSync(fd)
    } finally {
        fs.closeSync(fd)
    }
}

export function atomicWriteFile(dest: string, data: Buffer): void {
    const dir = path.dirname(dest)
    fs.mkdirSync(dir, { recursive: true })
    const part = `${dest}.part`
    const fd = fs.openSync(part, 'w')
    try {
        fs.writeFileSync(fd, data)
        fs.fsyncSync(fd)
    } finally {
        fs.closeSync(fd)
    }
    fs.renameSync(part, dest)
    fsyncDirectory(dir)
}
