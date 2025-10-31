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

export const IntOrUndefinedEnv = (v: string | undefined): number | undefined => {
    if (!v) return undefined
    const num = +v
    if (isNaN(num) || !Number.isInteger(num)) return undefined
    return num
}

export type EnvCacher = (key: string, value: string) => void

export const chooseEnv = (key: string, dbEnv: Record<string, string | undefined>, defaultValue: string, addToDb?: EnvCacher): string => {
    const fromProcess = process.env[key]
    if (fromProcess) {
        if (fromProcess !== dbEnv[key] && addToDb) addToDb(key, fromProcess)
        return fromProcess
    }
    return dbEnv[key] || defaultValue
}

export const chooseEnvInt = (key: string, dbEnv: Record<string, string | undefined>, defaultValue: number, addToDb?: EnvCacher): number => {
    const v = IntOrUndefinedEnv(chooseEnv(key, dbEnv, defaultValue.toString(), addToDb))
    if (v === undefined) return defaultValue
    return v
}

export const chooseEnvBool = (key: string, dbEnv: Record<string, string | undefined>, defaultValue: boolean, addToDb?: EnvCacher): boolean => {
    const v = chooseEnv(key, dbEnv, defaultValue.toString(), addToDb)
    return v.toLowerCase() === 'true'
}