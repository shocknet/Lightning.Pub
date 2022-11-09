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