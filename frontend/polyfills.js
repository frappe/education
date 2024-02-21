// polyfill of groupBy method
if (! ('groupBy' in Object)) {
    Object.prototype.groupBy = function (obj,fn) {
        if (typeof fn !== 'function') throw new Error(`${fn} should be a function`)
        Object.keys(obj).reduce((acc,key) => {
            const group = fn(obj[key])
            if (!acc[group]) {
                acc[group] = []
            }
            acc[group].push(obj[key])
            return acc
        },{})
    }
}