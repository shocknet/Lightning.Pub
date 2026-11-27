export const supportedClinkVersion = '1'

export const clinkVersionsFromTags = (tags?: string[][]) =>
    (tags ?? []).filter(t => t[0] === 'clink_version').map(t => t[1])

export const isSupportedClinkEvent = (tags?: string[][]) => {
    const versions = clinkVersionsFromTags(tags)
    return versions.length === 0 || versions.every(v => v === supportedClinkVersion)
}
