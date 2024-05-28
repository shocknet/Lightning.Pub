export const EnvMustBeNonEmptyString = (name: string): string => {
    const env = process.env[name]
    if (!env) throw new Error(`${name} ENV must be non empty`)
    return env
}
export const EnvMustBeInteger = (name: string): number => {
    const env = EnvMustBeNonEmptyString(name)
    if (isNaN(+env) || !Number.isInteger(+env)) {
        throw new Error(`${name} ENV must be an integer number`);
    }
    return +env
}
export const EnvCanBeInteger = (name: string, defaultValue = 0): number => {
    const env = process.env[name]
    if (!env) {
        return defaultValue
    }
    const envNum = +env
    if (isNaN(envNum) || !Number.isInteger(envNum)) {
        throw new Error(`${name} ENV must be an integer number or nothing`);
    }
    return envNum
}
export const EnvCanBeBoolean = (name: string): boolean => {
    const env = process.env[name]
    if (!env) return false
    return env.toLowerCase() === 'true'
}