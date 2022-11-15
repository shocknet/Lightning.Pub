import { globby } from 'globby'
type Describe = (message: string, failure?: boolean) => void

type TestModule = {
    ignore?: boolean
    setup?: () => Promise<void>
    default: (describe: Describe) => Promise<void>
    teardown?: () => Promise<void>
}
const start = async () => {

    const files = await globby("**/*.spec.ts")
    for (const file of files) {
        const module = await import(`./${file}`) as TestModule
        await runTestFile(file, module)
    }

}


const runTestFile = async (fileName: string, mod: TestModule) => {
    if (mod.ignore) {
        return
    }
    const d = getDescribe(fileName)
    try {
        if (mod.setup) {
            d("setup started")
            await mod.setup()
        }
        d("tests starting")
        await mod.default(d)
        d("tests finished")
        if (mod.teardown) {
            await mod.teardown()
            d("teardown finished")
        }
    } catch (e: any) {
        d("FAILURE", true)
        d(e, true)
    }
}

const getDescribe = (fileName: string): Describe => {
    return (message, failure) => {
        if (failure) {
            console.error(redConsole, fileName, ":", message, resetConsole)
        } else {
            console.log(greenConsole, fileName, ":", message, resetConsole)
        }
    }
}
const greenConsole = "\x1b[32m"
const redConsole = "\x1b[31m"
const resetConsole = "\x1b[0m"
start()