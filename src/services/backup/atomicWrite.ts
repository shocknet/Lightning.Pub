// BACKUP: Atomic local replace — write a sibling .part, fsync, then rename over the dest.
// An interrupted write leaves the previous dest in place (or a .part the restore ignores).

import fs from 'fs'
import path from 'path'

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
}
