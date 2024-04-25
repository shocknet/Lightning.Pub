import { globby } from 'globby'
import { setupNetwork } from './networkSetup.js'
import { Describe, SetupTest, teardown, TestBase } from './testBase.js'

type TestModule = {
    ignore?: boolean
    dev?: boolean
    default: (T: TestBase) => Promise<void>
}
let failures = 0
const getDescribe = (fileName: string): Describe => {
    return (message, failure) => {
        if (failure) {
            failures++
            console.error(redConsole, fileName, ": FAILURE ", message, resetConsole)
        } else {
            console.log(greenConsole, fileName, ":", message, resetConsole)
        }
    }
}

const start = async () => {
    await setupNetwork()
    const files = await globby(["**/*.spec.js", "!**/node_modules/**"])
    const modules: { file: string, module: TestModule }[] = []
    let devModule = -1
    for (const file of files) {
        const module = await import(`./${file.slice("build/src/tests/".length)}`) as TestModule
        modules.push({ module, file })
        if (module.dev) {
            console.log("dev module found", file)
            if (devModule !== -1) {
                throw new Error("there are multiple dev modules")
            }
            devModule = modules.length - 1
        }
    }
    if (devModule !== -1) {
        console.log("running dev module")
        await runTestFile(modules[devModule].file, modules[devModule].module)
    } else {
        console.log("running all tests")
        for (const { file, module } of modules) {
            await runTestFile(file, module)
        }
    }
    console.log(failures)
    if (failures) {
        throw new Error("there have been " + failures + " failures in all tests")
    } else {
        console.log(greenConsole, "there have been 0 failures in all tests", resetConsole)
    }

}

const runTestFile = async (fileName: string, mod: TestModule) => {
    console.log(fileName)
    const d = getDescribe(fileName)
    if (mod.ignore) {
        d("-----ignoring this file-----")
        return
    }
    if (mod.dev) {
        d("-----running only this file-----")
    }
    const T = await SetupTest(d)
    try {
        d("test starting")
        await mod.default(T)
        d("test finished")
        await teardown(T)
    } catch (e: any) {
        d(e, true)
        await teardown(T)
    }
    if (mod.dev) {
        d("dev mod is not allowed to in CI, failing for precaution", true)
    }
}


const greenConsole = "\x1b[32m"
const redConsole = "\x1b[31m"
const resetConsole = "\x1b[0m"
start()