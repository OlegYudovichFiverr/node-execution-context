const { isUndefined } = require('../lib');
const { EXCLUDED_ASYNC_TYPES } = require('./constants');

/**
 * Returns proper context ref for a given trigger id.
 * @param {ExecutionContext} parentContext - The parent context triggered the init
 * @param {Number} triggerAsyncId - The current triggerAsyncId
 */
const getContextRef = (parentContext, triggerAsyncId) => (
    isUndefined(parentContext.ref) ? triggerAsyncId : parentContext.ref
);

/**
 * Suspends map entry removal using next tick queue
 * @param {ExecutionContextMap} map - The execution context map
 * @param {Number} id - The async id to remove
 */
const suspendedDelete = (map, id) => process.nextTick(
    () => map.delete(id)
);

/**
 * The "async_hooks" init hook callback, used to initialize sub process of the main context
 * Processes without any parent context will be ignored.
 * @param {ExecutionContextMap} executionContextMap - The execution context map
 * @returns init-hook(asyncId: Number, type: String, triggerAsyncId:Number)
 */
const init = (executionContextMap) => (asyncId, type, triggerAsyncId) => {
        const parentContext = executionContextMap.get(triggerAsyncId);

        if (!parentContext || EXCLUDED_ASYNC_TYPES.has(type)) return;

        const ref = getContextRef(parentContext, triggerAsyncId);

        // Setting child process entry as ref to parent context
        executionContextMap.set(asyncId, {
            ref
        });

        const { context = {}, children = [] } = executionContextMap.get(ref);

        // Adding current async as child to parent context in order to control cleanup better
        executionContextMap.set(ref, {
            context,
            children: [...children, asyncId]
        });
};

/**
 * Notify a root process on one of it's child destroy event, will eventually cleanup parent context entry
 * when there will be no sub processes dependant on it left
 * @param {ExecutionContextMap} executionContextMap - The execution context map
 * @param {Number} asyncId - The current asyncId of the child process being destroyed
 * @param {Number} ref - The parent process ref asyncId
 */
const onChildProcessDestroy = (executionContextMap, asyncId, ref) => {
    const { children: parentChildren, context } = executionContextMap.get(ref);
    const children = parentChildren.filter((id) => id !== asyncId);

    // Parent context will be released upon last child removal
    if (!children.length) {
        suspendedDelete(executionContextMap, ref);

        return;
    }

    executionContextMap.set(ref, {
        context,
        children
    });
};

/**
 * The "async_hooks" destroy hook callback, used for clean up the execution map.
 * @param {ExecutionContextMap} executionContextMap - The execution context map
 * @return destroy-hook(asyncId: Number)
 */
const destroy = (executionContextMap) => (asyncId)=> {
    if (!executionContextMap.has(asyncId)) { return; }

    const { children = [], ref } = executionContextMap.get(asyncId);

    // As long as any root process holds none finished child process, we keep it alive
    if (children.length) { return; }

    // Child context's will unregister themselves from root context
    if (!isUndefined(ref)) {
        onChildProcessDestroy(
            executionContextMap,
            asyncId,
            ref,
        );
    }

    suspendedDelete(executionContextMap, asyncId);
};


/**
 * The Create hooks callback to be passed to "async_hooks"
 * @param {ExecutionContextMap} executionContextMap - The execution context map
 * @see https://nodejs.org/api/async_hooks.html#async_hooks_async_hooks_createhook_callbacks
 * @returns HookCallbacks
 */
const create = (executionContextMap) => ({
    init: init(executionContextMap),
    destroy: destroy(executionContextMap),
    promiseResolve: destroy(executionContextMap)
});

module.exports = { create };