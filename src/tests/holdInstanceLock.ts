import { acquirePubInstanceLock } from '../services/storage/instanceLock.js'

const databaseFile = process.env.PUB_LOCK_DB
if (!databaseFile) {
    process.stderr.write('PUB_LOCK_DB is required\n')
    process.exit(2)
}

try {
    acquirePubInstanceLock(databaseFile)
    process.stdout.write('held\n')
    setInterval(() => { }, 1 << 30)
} catch {
    process.stdout.write('busy\n')
    process.exit(1)
}
