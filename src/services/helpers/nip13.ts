export const countLeadingZeroBits = (hexId: string): number => {
    const id = hexId.toLowerCase()
    let bits = 0
    for (const ch of id) {
        const nibble = parseInt(ch, 16)
        if (Number.isNaN(nibble)) {
            return 0
        }
        if (nibble === 0) {
            bits += 4
            continue
        }
        bits += Math.clz32(nibble) - 28
        break
    }
    return bits
}

export const parseNip13Nonce = (tags: string[][] | undefined): { counter: string, targetDifficulty: number } | null => {
    const nonce = tags?.find(t => t[0] === "nonce")
    if (!nonce || nonce.length < 3) {
        return null
    }
    const targetDifficulty = Number(nonce[2])
    if (!Number.isInteger(targetDifficulty) || targetDifficulty < 0) {
        return null
    }
    return { counter: nonce[1] || "", targetDifficulty }
}

export const enrollPowSatisfied = (eventId: string, tags: string[][] | undefined, requiredBits: number): boolean => {
    if (requiredBits <= 0) {
        return true
    }
    const nonce = parseNip13Nonce(tags)
    if (!nonce || nonce.targetDifficulty < requiredBits) {
        return false
    }
    return countLeadingZeroBits(eventId) >= nonce.targetDifficulty
}
